import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CombatScreen } from "./CombatScreen";
import { ShopScreen } from "./ShopScreen";
import { BIOMES, MONSTER_TIERS, NPC_TYPES } from "../../../shared/gameConstants";
import { PixelFrame, PixelBtn, PixelText, PixelDialogBox, PixelSeparator, PixelOverlay, PIXEL_FONT, COLORS } from "./ui/pixelUI";

interface POI {
  id: string; type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
  name: string; latitude: number; longitude: number; biome: string; data: any;
}

interface POIInteractionProps { poi: POI; onClose: () => void; }

const POI_ICONS: Record<string, string> = { monster: "👹", npc: "👤", shop: "🛒", treasure: "💎", dungeon: "🏰" };
const POI_BORDER_COLORS: Record<string, string> = {
  monster: "#ef4444", npc: COLORS.textGold, shop: "#22c55e", treasure: "#eab308", dungeon: "#a855f7",
};

export function POIInteraction({ poi, onClose }: POIInteractionProps) {
  const [showCombat, setShowCombat] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [combatMonster, setCombatMonster] = useState<any>(null);
  const [shopNpc, setShopNpc] = useState<any>(null);

  const { data: monster, isLoading: isLoadingMonster } = trpc.gameData.getAllMonsters.useQuery(undefined, {
    enabled: poi.type === "monster" && !!poi.data?.monsterId,
  });
  const { data: npcs, isLoading: isLoadingNpc } = trpc.gameData.getAllNpcs.useQuery(undefined, {
    enabled: (poi.type === "npc" || poi.type === "shop") && !!poi.data?.npcId,
  });
  const collectTreasure = trpc.world.collectTreasure.useMutation();
  const startCombat = trpc.combat.start.useMutation();
  const utils = trpc.useUtils();

  const handleStartCombat = async () => {
    if (!poi.data?.monsterId) return;
    try {
      const result = await startCombat.mutateAsync({ monsterId: poi.data.monsterId, latitude: poi.latitude, longitude: poi.longitude });
      setCombatMonster(result.monster); setShowCombat(true);
    } catch { toast.error("Erro ao iniciar combate"); }
  };

  const handleOpenShop = () => {
    if (!poi.data?.npcId || !npcs) return;
    const npc = npcs.find(n => n.id === poi.data.npcId);
    if (npc) { setShopNpc(npc); setShowShop(true); }
  };

  const handleCollectTreasure = async () => {
    if (!poi.data?.goldAmount) return;
    try {
      const result = await collectTreasure.mutateAsync({ poiId: poi.id, goldAmount: poi.data.goldAmount });
      toast.success(`Encontraste ${result.goldCollected} de ouro!`);
      utils.character.get.invalidate(); onClose();
    } catch { toast.error("Erro ao recolher tesouro"); }
  };

  const handleCombatVictory = (rewards: any) => {
    setShowCombat(false);
    toast.success(`Vitoria! +${rewards.experience} XP, +${rewards.gold} Ouro`);
    if (rewards.leveledUp) toast.success(`Subiu para o nivel ${rewards.newLevel}!`);
    onClose();
  };

  const handleCombatDefeat = () => { setShowCombat(false); toast.error("Foste derrotado..."); onClose(); };

  if (showCombat && combatMonster) {
    return <CombatScreen monster={combatMonster} latitude={poi.latitude} longitude={poi.longitude} onClose={() => setShowCombat(false)} onVictory={handleCombatVictory} onDefeat={handleCombatDefeat} />;
  }
  if (showShop && shopNpc) {
    return <ShopScreen npcId={shopNpc.id} npcName={shopNpc.name} npcType={shopNpc.npcType} greeting={shopNpc.greeting} onClose={() => setShowShop(false)} />;
  }

  const biomeData = BIOMES[poi.biome as keyof typeof BIOMES];
  const currentMonster = monster?.find(m => m.id === poi.data?.monsterId);
  const currentNpc = npcs?.find(n => n.id === poi.data?.npcId);
  const tierData = currentMonster ? MONSTER_TIERS[currentMonster.tier as keyof typeof MONSTER_TIERS] : null;
  const borderColor = POI_BORDER_COLORS[poi.type] || COLORS.gold;

  return (
    <PixelOverlay>
      <PixelFrame borderColor={borderColor} ornate glow className="w-full max-w-sm" bgColor={COLORS.panelDark}>
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: '24px' }}>{POI_ICONS[poi.type] || "?"}</span>
              <div>
                <PixelText size="md" color={borderColor} bold className="block">{poi.name}</PixelText>
                <div className="flex items-center gap-1">
                  <PixelText size="xxs" color={COLORS.textGray}>{biomeData?.icon || "🌍"} {biomeData?.name || poi.biome}</PixelText>
                </div>
              </div>
            </div>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center" style={{
              background: '#6b1a1a', border: '2px solid #ef4444', fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            }}>X</button>
          </div>

          <PixelSeparator color={borderColor} />

          {/* Monster POI */}
          {poi.type === "monster" && (
            <>
              {isLoadingMonster ? (
                <div className="text-center py-4"><PixelText size="xs" color={COLORS.textGold} glow>A carregar...</PixelText></div>
              ) : currentMonster ? (
                <div className="space-y-2 mt-2">
                  <PixelText size="xs" color={COLORS.textGray} as="p">{currentMonster.description}</PixelText>
                  <div className="grid grid-cols-2 gap-1.5">
                    <PixelFrame borderColor="#333" className="p-1.5 text-center" bgColor={COLORS.panelMid}>
                      <PixelText size="xxs" color={COLORS.textGray} className="block">Tipo</PixelText>
                      <PixelText size="xs" color={COLORS.textWhite} className="capitalize">{currentMonster.monsterType}</PixelText>
                    </PixelFrame>
                    <PixelFrame borderColor="#333" className="p-1.5 text-center" bgColor={COLORS.panelMid}>
                      <PixelText size="xxs" color={COLORS.textGray} className="block">Tier</PixelText>
                      <PixelText size="xs" color={borderColor}>{tierData?.name || currentMonster.tier}</PixelText>
                    </PixelFrame>
                  </div>
                  <PixelBtn variant="attack" size="md" fullWidth onClick={handleStartCombat} disabled={startCombat.isPending}>
                    {startCombat.isPending ? "A INICIAR..." : "ATACAR"}
                  </PixelBtn>
                </div>
              ) : (
                <div className="text-center py-4"><PixelText size="xs" color={COLORS.textGray}>Monstro nao encontrado</PixelText></div>
              )}
            </>
          )}

          {/* NPC POI */}
          {poi.type === "npc" && currentNpc && (
            <div className="space-y-2 mt-2">
              {currentNpc.title && <PixelText size="xs" color={COLORS.textGold} className="block">{currentNpc.title}</PixelText>}
              <PixelText size="xs" color={COLORS.textGray} as="p">{currentNpc.description}</PixelText>
              {currentNpc.greeting && <PixelDialogBox message={currentNpc.greeting} speaker={currentNpc.name} />}
              <PixelBtn variant="default" size="md" fullWidth onClick={onClose}>CONVERSAR</PixelBtn>
            </div>
          )}

          {/* Shop POI */}
          {poi.type === "shop" && currentNpc && (
            <div className="space-y-2 mt-2">
              {currentNpc.title && <PixelText size="xs" color={COLORS.textGold} className="block">{currentNpc.title}</PixelText>}
              <PixelText size="xs" color={COLORS.textGray} as="p">{currentNpc.description}</PixelText>
              {currentNpc.greeting && <PixelDialogBox message={currentNpc.greeting} speaker={currentNpc.name} />}
              <PixelBtn variant="gold" size="md" fullWidth onClick={handleOpenShop}>VER ITENS</PixelBtn>
            </div>
          )}

          {/* Treasure POI */}
          {poi.type === "treasure" && (
            <div className="space-y-2 mt-2">
              <PixelText size="xs" color={COLORS.textGray} as="p">Um bau misterioso brilha com promessas de riquezas...</PixelText>
              <PixelFrame borderColor={COLORS.xpGold} glow className="p-3 text-center">
                <PixelText size="xl" color={COLORS.textGold} bold glow as="div">{poi.data?.goldAmount || 0}</PixelText>
                <PixelText size="xs" color={COLORS.textGold} as="div">OURO</PixelText>
              </PixelFrame>
              <PixelBtn variant="gold" size="md" fullWidth onClick={handleCollectTreasure} disabled={collectTreasure.isPending}>
                {collectTreasure.isPending ? "A RECOLHER..." : "RECOLHER TESOURO"}
              </PixelBtn>
            </div>
          )}

          {/* Dungeon POI */}
          {poi.type === "dungeon" && (
            <div className="space-y-2 mt-2">
              <PixelText size="xs" color={COLORS.textGray} as="p">Uma entrada sombria leva as profundezas da terra. Perigos e tesouros aguardam...</PixelText>
              <PixelFrame borderColor={COLORS.textPurple} className="p-3 text-center">
                <PixelText size="xs" color={COLORS.textPurple} as="div">
                  Dificuldade: {"★".repeat(poi.data?.difficulty || 1)}{"☆".repeat(5 - (poi.data?.difficulty || 1))}
                </PixelText>
              </PixelFrame>
              <PixelBtn variant="magic" size="md" fullWidth disabled>EM BREVE</PixelBtn>
            </div>
          )}
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
