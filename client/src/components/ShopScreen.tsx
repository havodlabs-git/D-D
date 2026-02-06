import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { RARITIES, ITEM_TYPES } from "../../../shared/gameConstants";
import { PixelFrame, PixelBtn, PixelText, PixelTitleBar, PixelDialogBox, PixelSeparator, PixelOverlay, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

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

const NPC_SPRITES: Record<string, string> = {
  merchant: "/sprites/npcs/merchant.png", blacksmith: "/sprites/npcs/blacksmith.png",
  alchemist: "/sprites/npcs/alchemist.png", innkeeper: "/sprites/npcs/innkeeper.png",
  default: "/sprites/npcs/merchant.png",
};

interface ShopScreenProps {
  npcId: number; npcName: string; npcType: string; greeting?: string; onClose: () => void;
}

function getItemSprite(itemType: string, itemName?: string): string {
  if (itemName?.toLowerCase().includes("mana")) return ITEM_SPRITES.potion_mana;
  if (itemName?.toLowerCase().includes("health") || itemName?.toLowerCase().includes("vida")) return ITEM_SPRITES.potion_health;
  if (itemName?.toLowerCase().includes("arco") || itemName?.toLowerCase().includes("bow")) return ITEM_SPRITES.bow;
  if (itemName?.toLowerCase().includes("cajado") || itemName?.toLowerCase().includes("staff")) return ITEM_SPRITES.staff;
  if (itemName?.toLowerCase().includes("escudo") || itemName?.toLowerCase().includes("shield")) return ITEM_SPRITES.shield;
  return ITEM_SPRITES[itemType] || ITEM_SPRITES.default;
}

export function ShopScreen({ npcId, npcName, npcType, greeting, onClose }: ShopScreenProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: character } = trpc.character.get.useQuery();
  const { data: shopItems, isLoading } = trpc.shop.getInventory.useQuery({ npcId });
  const buyMutation = trpc.shop.buy.useMutation();
  const utils = trpc.useUtils();

  const handleBuy = async () => {
    if (!selectedItem) return;
    try {
      const item = selectedItem.item;
      const result = await buyMutation.mutateAsync({
        itemId: item.id,
        itemData: {
          name: item.name, description: item.description || "", itemType: item.itemType,
          rarity: item.rarity, buyPrice: item.buyPrice, sellPrice: item.sellPrice || Math.floor(item.buyPrice / 2),
          levelRequired: item.levelRequired || 1, damageMin: item.damageMin, damageMax: item.damageMax,
          armorValue: item.armorValue, healAmount: item.healAmount, manaAmount: item.manaAmount,
          statBonuses: item.statBonuses,
        },
        quantity,
      });
      toast.success(`Comprou ${quantity}x ${result.itemName} por ${result.totalCost} ouro!`);
      utils.character.get.invalidate(); utils.inventory.get.invalidate();
      setSelectedItem(null); setQuantity(1);
    } catch (error: any) { toast.error(error.message || "Erro ao comprar item"); }
  };

  const totalCost = selectedItem ? selectedItem.item.buyPrice * quantity : 0;
  const canAfford = character && character.gold >= totalCost;

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
          {/* Header with NPC */}
          <div className="flex items-center gap-3 mb-2">
            <div className="flex-shrink-0" style={{
              width: '48px', height: '48px', background: '#0a0a1a',
              border: `2px solid ${COLORS.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src={NPC_SPRITES[npcType] || NPC_SPRITES.default} alt={npcType} className="w-10 h-10" style={{ imageRendering: 'pixelated' }} />
            </div>
            <div className="flex-1">
              <PixelText size="md" color={COLORS.textGold} bold className="block">{npcName}</PixelText>
              <PixelText size="xxs" color={COLORS.textGray}>Comerciante</PixelText>
            </div>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center" style={{
              background: '#6b1a1a', border: '2px solid #ef4444', fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            }}>X</button>
          </div>

          {/* Greeting */}
          {greeting && <PixelDialogBox message={greeting} speaker={npcName} className="mb-2" />}

          {/* Gold display */}
          <PixelFrame borderColor={COLORS.xpGold + "60"} className="flex items-center justify-between px-3 py-1.5 mb-2">
            <PixelText size="xs" color={COLORS.textGray}>Teu Ouro:</PixelText>
            <PixelText size="md" color={COLORS.textGold} bold glow>{character?.gold || 0}</PixelText>
          </PixelFrame>

          {/* Shop Items */}
          <PixelScrollArea maxHeight="200px">
            {!shopItems || shopItems.length === 0 ? (
              <div className="text-center py-6">
                <PixelText size="xs" color={COLORS.textGray}>Nenhum item a venda</PixelText>
              </div>
            ) : (
              <div className="space-y-1">
                {shopItems.map((shopItem) => {
                  const rarityColor = COLORS[shopItem.item.rarity as keyof typeof COLORS] || COLORS.common;
                  const isSelected = selectedItem?.item.id === shopItem.item.id;
                  return (
                    <button
                      key={shopItem.item.id}
                      onClick={() => { setSelectedItem(shopItem); setQuantity(1); }}
                      className="w-full flex items-center gap-2 p-2 text-left transition-all hover:brightness-125"
                      style={{
                        background: isSelected ? `${rarityColor}15` : COLORS.panelMid,
                        border: `2px solid ${isSelected ? rarityColor : '#333'}`,
                        boxShadow: isSelected ? `0 0 8px ${rarityColor}30` : '2px 2px 0 rgba(0,0,0,0.3)',
                      }}
                    >
                      <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center" style={{ background: '#0a0a1a', border: `1px solid ${rarityColor}60` }}>
                        <img src={getItemSprite(shopItem.item.itemType, shopItem.item.name)} alt={shopItem.item.name} className="w-7 h-7" style={{ imageRendering: 'pixelated' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <PixelText size="xs" color={rarityColor} className="block truncate">{shopItem.item.name}</PixelText>
                        <PixelText size="xxs" color={COLORS.textGray}>{ITEM_TYPES[shopItem.item.itemType as keyof typeof ITEM_TYPES]?.name}</PixelText>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <PixelText size="xs" color={COLORS.textGold} bold>{shopItem.item.buyPrice}g</PixelText>
                        {shopItem.stock > 0 && <PixelText size="xxs" color={COLORS.textGray} className="block">x{shopItem.stock}</PixelText>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </PixelScrollArea>

          {/* Selected Item Details */}
          {selectedItem && (
            <>
              <PixelSeparator />
              <PixelFrame borderColor={COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common} className="p-2">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center" style={{
                    background: '#0a0a1a', border: `2px solid ${COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common}`,
                  }}>
                    <img src={getItemSprite(selectedItem.item.itemType, selectedItem.item.name)} alt="" className="w-8 h-8" style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <PixelText size="xs" color={COLORS[selectedItem.item.rarity as keyof typeof COLORS] || COLORS.common} bold className="block truncate">{selectedItem.item.name}</PixelText>
                    {selectedItem.item.description && <PixelText size="xxs" color={COLORS.textGray} className="block">{selectedItem.item.description}</PixelText>}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-1 mb-2">
                  {selectedItem.item.damageMin && selectedItem.item.damageMax && (
                    <PixelText size="xxs" color={COLORS.textRed}>Dano: {selectedItem.item.damageMin}-{selectedItem.item.damageMax}</PixelText>
                  )}
                  {selectedItem.item.armorValue && <PixelText size="xxs" color={COLORS.textBlue}>AC: +{selectedItem.item.armorValue}</PixelText>}
                  {selectedItem.item.healAmount && <PixelText size="xxs" color={COLORS.textGreen}>Cura: +{selectedItem.item.healAmount}</PixelText>}
                  {selectedItem.item.manaAmount && <PixelText size="xxs" color={COLORS.textBlue}>Mana: +{selectedItem.item.manaAmount}</PixelText>}
                </div>

                {/* Quantity + Buy */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}
                      className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                      style={{ background: COLORS.panelMid, border: '1px solid #555', fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff' }}>-</button>
                    <PixelText size="sm" color={COLORS.textWhite} className="w-6 text-center">{quantity}</PixelText>
                    <button onClick={() => setQuantity(quantity + 1)} disabled={selectedItem.stock > 0 && quantity >= selectedItem.stock}
                      className="w-6 h-6 flex items-center justify-center disabled:opacity-30"
                      style={{ background: COLORS.panelMid, border: '1px solid #555', fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff' }}>+</button>
                    <PixelText size="xxs" color={canAfford ? COLORS.textGold : COLORS.textRed} className="ml-2">{totalCost}g</PixelText>
                  </div>
                  <PixelBtn variant={canAfford ? "gold" : "default"} size="xs" onClick={handleBuy} disabled={!canAfford || buyMutation.isPending}>
                    COMPRAR
                  </PixelBtn>
                </div>
              </PixelFrame>
            </>
          )}
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
