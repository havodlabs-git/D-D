import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { X, Swords, MessageCircle, ShoppingBag, Gem, Castle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CombatScreen } from "./CombatScreen";
import { ShopScreen } from "./ShopScreen";
import { BIOMES, MONSTER_TIERS, NPC_TYPES } from "../../../shared/gameConstants";

interface POI {
  id: string;
  type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
  name: string;
  latitude: number;
  longitude: number;
  biome: string;
  data: any;
}

interface POIInteractionProps {
  poi: POI;
  onClose: () => void;
}

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
  const utils = trpc.useUtils();

  const startCombat = trpc.combat.start.useMutation();

  const handleStartCombat = async () => {
    if (!poi.data?.monsterId) return;

    try {
      const result = await startCombat.mutateAsync({
        monsterId: poi.data.monsterId,
        latitude: poi.latitude,
        longitude: poi.longitude,
      });
      setCombatMonster(result.monster);
      setShowCombat(true);
    } catch (error) {
      toast.error("Erro ao iniciar combate");
    }
  };

  const handleOpenShop = () => {
    if (!poi.data?.npcId || !npcs) return;
    const npc = npcs.find(n => n.id === poi.data.npcId);
    if (npc) {
      setShopNpc(npc);
      setShowShop(true);
    }
  };

  const handleCollectTreasure = async () => {
    if (!poi.data?.goldAmount) return;

    try {
      const result = await collectTreasure.mutateAsync({
        poiId: poi.id,
        goldAmount: poi.data.goldAmount,
      });
      toast.success(`Encontrou ${result.goldCollected} de ouro!`);
      utils.character.get.invalidate();
      onClose();
    } catch (error) {
      toast.error("Erro ao coletar tesouro");
    }
  };

  const handleCombatVictory = (rewards: any) => {
    setShowCombat(false);
    toast.success(`Vitória! +${rewards.experience} XP, +${rewards.gold} Ouro`);
    if (rewards.leveledUp) {
      toast.success(`🎉 Subiu para o nível ${rewards.newLevel}!`);
    }
    onClose();
  };

  const handleCombatDefeat = () => {
    setShowCombat(false);
    toast.error("Você foi derrotado...");
    onClose();
  };

  // Show combat screen
  if (showCombat && combatMonster) {
    return (
      <CombatScreen
        monster={combatMonster}
        latitude={poi.latitude}
        longitude={poi.longitude}
        onClose={() => setShowCombat(false)}
        onVictory={handleCombatVictory}
        onDefeat={handleCombatDefeat}
      />
    );
  }

  // Show shop screen
  if (showShop && shopNpc) {
    return (
      <ShopScreen
        npcId={shopNpc.id}
        npcName={shopNpc.name}
        npcType={shopNpc.npcType}
        greeting={shopNpc.greeting}
        onClose={() => setShowShop(false)}
      />
    );
  }

  const getPoiIcon = () => {
    switch (poi.type) {
      case "monster": return "👹";
      case "npc": return "👤";
      case "shop": return "🛒";
      case "treasure": return "💎";
      case "dungeon": return "🏰";
      default: return "❓";
    }
  };

  const getPoiColor = () => {
    switch (poi.type) {
      case "monster": return "bg-destructive/20 border-destructive";
      case "npc": return "bg-accent/20 border-accent";
      case "shop": return "bg-primary/20 border-primary";
      case "treasure": return "bg-yellow-500/20 border-yellow-500";
      case "dungeon": return "bg-secondary/20 border-secondary";
      default: return "bg-muted border-border";
    }
  };

  const biomeData = BIOMES[poi.biome as keyof typeof BIOMES];
  const currentMonster = monster?.find(m => m.id === poi.data?.monsterId);
  const currentNpc = npcs?.find(n => n.id === poi.data?.npcId);
  const tierData = currentMonster ? MONSTER_TIERS[currentMonster.tier as keyof typeof MONSTER_TIERS] : null;
  const npcTypeData = currentNpc ? NPC_TYPES[currentNpc.npcType as keyof typeof NPC_TYPES] : null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
      <Card className={cn("w-full max-w-md fantasy-card border-2", getPoiColor())}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="text-3xl">{getPoiIcon()}</span>
              {poi.name}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Location Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{biomeData?.icon || "🌍"}</span>
            <span>{biomeData?.name || poi.biome}</span>
          </div>

          {/* Monster POI */}
          {poi.type === "monster" && (
            <>
              {isLoadingMonster ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : currentMonster ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">{currentMonster.description}</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="ml-2 capitalize">{currentMonster.monsterType}</span>
                    </div>
                    <div className="bg-muted/30 rounded p-2">
                      <span className="text-muted-foreground">Nível:</span>
                      <span className="ml-2">{tierData?.name || currentMonster.tier}</span>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" onClick={handleStartCombat} disabled={startCombat.isPending}>
                    {startCombat.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Swords className="w-5 h-5 mr-2" />
                        Atacar
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <p className="text-center text-muted-foreground">Monstro não encontrado</p>
              )}
            </>
          )}

          {/* NPC POI */}
          {poi.type === "npc" && currentNpc && (
            <div className="space-y-3">
              {currentNpc.title && (
                <p className="text-sm text-primary">{currentNpc.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{currentNpc.description}</p>
              
              {currentNpc.greeting && (
                <div className="bg-muted/30 rounded-lg p-3 italic text-sm">
                  "{currentNpc.greeting}"
                </div>
              )}

              <div className="flex items-center gap-2 text-sm">
                <span>{npcTypeData?.icon}</span>
                <span>{npcTypeData?.name}</span>
              </div>

              <Button className="w-full" variant="secondary" size="lg" onClick={onClose}>
                <MessageCircle className="w-5 h-5 mr-2" />
                Conversar
              </Button>
            </div>
          )}

          {/* Shop POI */}
          {poi.type === "shop" && currentNpc && (
            <div className="space-y-3">
              {currentNpc.title && (
                <p className="text-sm text-primary">{currentNpc.title}</p>
              )}
              <p className="text-sm text-muted-foreground">{currentNpc.description}</p>
              
              {currentNpc.greeting && (
                <div className="bg-muted/30 rounded-lg p-3 italic text-sm">
                  "{currentNpc.greeting}"
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleOpenShop}>
                <ShoppingBag className="w-5 h-5 mr-2" />
                Ver Itens
              </Button>
            </div>
          )}

          {/* Treasure POI */}
          {poi.type === "treasure" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Um baú misterioso brilha com promessas de riquezas...
              </p>
              
              <div className="bg-yellow-500/20 rounded-lg p-4 text-center">
                <Gem className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                <p className="text-lg font-bold gold-text">
                  {poi.data?.goldAmount || 0} Ouro
                </p>
              </div>

              <Button 
                className="w-full" 
                size="lg" 
                onClick={handleCollectTreasure}
                disabled={collectTreasure.isPending}
              >
                {collectTreasure.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Gem className="w-5 h-5 mr-2" />
                    Coletar Tesouro
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Dungeon POI */}
          {poi.type === "dungeon" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Uma entrada sombria leva às profundezas da terra. Perigos e tesouros aguardam...
              </p>
              
              <div className="bg-secondary/20 rounded-lg p-4 text-center">
                <Castle className="w-12 h-12 mx-auto mb-2 text-secondary-foreground" />
                <p className="text-sm">
                  Dificuldade: {"⭐".repeat(poi.data?.difficulty || 1)}
                </p>
              </div>

              <Button className="w-full" size="lg" variant="secondary" disabled>
                <Castle className="w-5 h-5 mr-2" />
                Em Breve
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
