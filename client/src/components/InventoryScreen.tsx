import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ITEM_TYPES, RARITIES } from "../../../shared/gameConstants";
import { PixelFrame, PixelBtn, PixelText, PixelTitleBar, PixelItemSlot, PixelTabs, PixelSeparator, PixelOverlay, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

const ITEM_SPRITES: Record<string, string> = {
  weapon: "/sprites/items/sword.png", armor: "/sprites/items/armor.png",
  helmet: "/sprites/items/armor.png", boots: "/sprites/items/armor.png",
  gloves: "/sprites/items/armor.png", ring: "/sprites/items/gold.png",
  amulet: "/sprites/items/gold.png", potion: "/sprites/items/potion-health.png",
  potion_health: "/sprites/items/potion-health.png", potion_mana: "/sprites/items/potion-mana.png",
  scroll: "/sprites/items/staff.png", material: "/sprites/items/gold.png",
  quest_item: "/sprites/items/gold.png", bow: "/sprites/items/bow.png",
  staff: "/sprites/items/staff.png", shield: "/sprites/items/shield.png",
  default: "/sprites/items/gold.png",
};

interface InventoryScreenProps { onClose: () => void; }

export function InventoryScreen({ onClose }: InventoryScreenProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("equipment");

  const { data: inventory, isLoading } = trpc.inventory.get.useQuery();
  const { data: equipped } = trpc.inventory.getEquipped.useQuery();
  const equipMutation = trpc.inventory.equip.useMutation();
  const unequipMutation = trpc.inventory.unequip.useMutation();
  const useMutation = trpc.inventory.useItem.useMutation();
  const utils = trpc.useUtils();

  const handleEquip = async (inventoryId: number, slot: string) => {
    try {
      await equipMutation.mutateAsync({ inventoryId, slot });
      toast.success("Item equipado!");
      utils.inventory.get.invalidate(); utils.inventory.getEquipped.invalidate(); utils.character.get.invalidate();
      setSelectedItem(null);
    } catch { toast.error("Erro ao equipar item"); }
  };

  const handleUnequip = async (inventoryId: number) => {
    try {
      await unequipMutation.mutateAsync({ inventoryId });
      toast.success("Item desequipado!");
      utils.inventory.get.invalidate(); utils.inventory.getEquipped.invalidate(); utils.character.get.invalidate();
      setSelectedItem(null);
    } catch { toast.error("Erro ao desequipar item"); }
  };

  const handleUse = async (inventoryId: number) => {
    try {
      const result = await useMutation.mutateAsync({ inventoryId });
      if (result.healAmount > 0) toast.success(`Recuperou ${result.healAmount} HP!`);
      if (result.manaAmount > 0) toast.success(`Recuperou ${result.manaAmount} MP!`);
      utils.inventory.get.invalidate(); utils.character.get.invalidate();
      setSelectedItem(null);
    } catch { toast.error("Erro ao usar item"); }
  };

  const getItemSprite = (itemType: string, itemName?: string): string => {
    if (itemName?.toLowerCase().includes("mana")) return ITEM_SPRITES.potion_mana;
    if (itemName?.toLowerCase().includes("health") || itemName?.toLowerCase().includes("vida")) return ITEM_SPRITES.potion_health;
    if (itemName?.toLowerCase().includes("arco") || itemName?.toLowerCase().includes("bow")) return ITEM_SPRITES.bow;
    if (itemName?.toLowerCase().includes("cajado") || itemName?.toLowerCase().includes("staff")) return ITEM_SPRITES.staff;
    if (itemName?.toLowerCase().includes("escudo") || itemName?.toLowerCase().includes("shield")) return ITEM_SPRITES.shield;
    return ITEM_SPRITES[itemType] || ITEM_SPRITES.default;
  };

  const bagItems = inventory?.filter(i => !i.inventory.isEquipped) || [];
  const equippedItems = equipped || [];

  const slots = [
    { id: "weapon", name: "Arma", sprite: "/sprites/items/sword.png" },
    { id: "armor", name: "Armadura", sprite: "/sprites/items/armor.png" },
    { id: "helmet", name: "Elmo", sprite: "/sprites/items/armor.png" },
    { id: "boots", name: "Botas", sprite: "/sprites/items/armor.png" },
    { id: "gloves", name: "Luvas", sprite: "/sprites/items/armor.png" },
    { id: "ring1", name: "Anel 1", sprite: "/sprites/items/gold.png" },
    { id: "ring2", name: "Anel 2", sprite: "/sprites/items/gold.png" },
    { id: "amulet", name: "Amuleto", sprite: "/sprites/items/gold.png" },
  ];

  const getEquippedInSlot = (slotId: string) => equippedItems.find(e => e.inventory.equipSlot === slotId);

  if (isLoading) {
    return (
      <PixelOverlay>
        <PixelText size="md" color={COLORS.textGold} glow>A carregar...</PixelText>
      </PixelOverlay>
    );
  }

  return (
    <PixelOverlay>
      <PixelFrame borderColor={COLORS.gold} ornate glow className="w-full max-w-md" bgColor={COLORS.panelDark}>
        <div className="p-3">
          <PixelTitleBar title="INVENTARIO" onClose={onClose} />

          <PixelTabs
            tabs={[
              { id: "equipment", label: "EQUIPAMENTO" },
              { id: "bag", label: `MOCHILA (${bagItems.length})` },
            ]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* Equipment Tab */}
          {activeTab === "equipment" && (
            <div className="grid grid-cols-4 gap-1.5">
              {slots.map((slot) => {
                const eq = getEquippedInSlot(slot.id);
                const rarityColor = eq ? (COLORS[eq.item.rarity as keyof typeof COLORS] || COLORS.common) : '#333';
                return (
                  <button
                    key={slot.id}
                    onClick={() => eq && setSelectedItem({ ...eq, isEquipped: true })}
                    className="aspect-square flex flex-col items-center justify-center gap-0.5 transition-all hover:brightness-125"
                    style={{
                      background: eq ? `${rarityColor}10` : COLORS.panelMid,
                      border: eq ? `2px solid ${rarityColor}` : '2px dashed #333',
                      boxShadow: eq ? `inset 0 0 8px ${rarityColor}15, 2px 2px 0 rgba(0,0,0,0.3)` : '2px 2px 0 rgba(0,0,0,0.3)',
                    }}
                  >
                    <img
                      src={eq ? getItemSprite(eq.item.itemType, eq.item.name) : slot.sprite}
                      alt={eq ? eq.item.name : slot.name}
                      className={cn("w-8 h-8", !eq && "opacity-25")}
                      style={{ imageRendering: 'pixelated' }}
                    />
                    <PixelText size="xxs" color={eq ? rarityColor : COLORS.textGray} className="truncate max-w-full px-0.5">
                      {eq ? eq.item.name : slot.name}
                    </PixelText>
                  </button>
                );
              })}
            </div>
          )}

          {/* Bag Tab */}
          {activeTab === "bag" && (
            <PixelScrollArea maxHeight="250px">
              {bagItems.length === 0 ? (
                <div className="text-center py-8">
                  <PixelText size="xs" color={COLORS.textGray}>Mochila vazia</PixelText>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-1.5">
                  {bagItems.map((invItem) => {
                    const rarityColor = COLORS[invItem.item.rarity as keyof typeof COLORS] || COLORS.common;
                    return (
                      <button
                        key={invItem.inventory.id}
                        onClick={() => setSelectedItem({ ...invItem, isEquipped: false })}
                        className="aspect-square flex flex-col items-center justify-center gap-0.5 relative transition-all hover:brightness-125"
                        style={{
                          background: `${rarityColor}10`,
                          border: `2px solid ${rarityColor}60`,
                          boxShadow: `2px 2px 0 rgba(0,0,0,0.3)`,
                        }}
                      >
                        <img
                          src={getItemSprite(invItem.item.itemType, invItem.item.name)}
                          alt={invItem.item.name}
                          className="w-8 h-8"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        {invItem.inventory.quantity > 1 && (
                          <div className="absolute bottom-0.5 right-0.5 px-1" style={{ background: '#000a', fontFamily: PIXEL_FONT, fontSize: '5px', color: '#fff' }}>
                            x{invItem.inventory.quantity}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </PixelScrollArea>
          )}

          {/* Item Details Panel */}
          {selectedItem && (
            <>
              <PixelSeparator />
              <PixelFrame borderColor={COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common} className="p-2">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center"
                    style={{
                      background: '#0a0a1a',
                      border: `2px solid ${COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common}`,
                    }}
                  >
                    <img src={getItemSprite(selectedItem.item.itemType, selectedItem.item.name)} alt={selectedItem.item.name} className="w-9 h-9" style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <PixelText size="xs" color={COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common} bold className="block truncate">
                      {selectedItem.item.name}
                    </PixelText>
                    <PixelText size="xxs" color={COLORS.textGray} className="block">
                      {ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES]?.name} {RARITIES[selectedItem.item.rarity as keyof typeof RARITIES]?.name}
                    </PixelText>
                    {selectedItem.item.description && (
                      <PixelText size="xxs" color={COLORS.textGray} className="block mt-1">{selectedItem.item.description}</PixelText>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {selectedItem.item.damageMin && selectedItem.item.damageMax && (
                    <div className="flex items-center gap-1">
                      <img src="/sprites/items/sword.png" alt="Dano" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                      <PixelText size="xxs" color={COLORS.textRed}>Dano: {selectedItem.item.damageMin}-{selectedItem.item.damageMax}</PixelText>
                    </div>
                  )}
                  {selectedItem.item.armorValue && (
                    <div className="flex items-center gap-1">
                      <img src="/sprites/items/shield.png" alt="Armadura" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
                      <PixelText size="xxs" color={COLORS.textBlue}>AC: +{selectedItem.item.armorValue}</PixelText>
                    </div>
                  )}
                  {selectedItem.item.healAmount && (
                    <div className="flex items-center gap-1">
                      <PixelText size="xxs" color={COLORS.textGreen}>Cura: +{selectedItem.item.healAmount} HP</PixelText>
                    </div>
                  )}
                  {selectedItem.item.manaAmount && (
                    <div className="flex items-center gap-1">
                      <PixelText size="xxs" color={COLORS.textBlue}>Mana: +{selectedItem.item.manaAmount} MP</PixelText>
                    </div>
                  )}
                </div>

                {/* Stat Bonuses */}
                {selectedItem.item.statBonuses && Object.keys(selectedItem.item.statBonuses).length > 0 && (
                  <div className="mb-2">
                    {Object.entries(selectedItem.item.statBonuses).map(([stat, value]) => (
                      <PixelText key={stat} size="xxs" color={COLORS.textGreen} className="mr-2">+{value as number} {stat}</PixelText>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-1.5">
                  {selectedItem.isEquipped ? (
                    <PixelBtn variant="danger" size="xs" onClick={() => handleUnequip(selectedItem.inventory.id)} disabled={unequipMutation.isPending}>
                      DESEQUIPAR
                    </PixelBtn>
                  ) : (
                    <>
                      {ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES]?.slot && (
                        <PixelBtn variant="success" size="xs" onClick={() => handleEquip(selectedItem.inventory.id, ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES].slot!)} disabled={equipMutation.isPending}>
                          EQUIPAR
                        </PixelBtn>
                      )}
                      {(selectedItem.item.itemType === "potion" || selectedItem.item.itemType === "scroll") && (
                        <PixelBtn variant="magic" size="xs" onClick={() => handleUse(selectedItem.inventory.id)} disabled={useMutation.isPending}>
                          USAR
                        </PixelBtn>
                      )}
                    </>
                  )}
                  <PixelBtn variant="default" size="xs" onClick={() => setSelectedItem(null)}>FECHAR</PixelBtn>
                </div>
              </PixelFrame>
            </>
          )}
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
