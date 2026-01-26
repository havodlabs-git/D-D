import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { RARITIES, ITEM_TYPES } from "../../../shared/gameConstants";

// Item sprites mapping
const ITEM_SPRITES: Record<string, string> = {
  weapon: "/sprites/items/sword.png",
  armor: "/sprites/items/armor.png",
  helmet: "/sprites/items/armor.png",
  boots: "/sprites/items/armor.png",
  gloves: "/sprites/items/armor.png",
  ring: "/sprites/items/gold.png",
  amulet: "/sprites/items/gold.png",
  potion: "/sprites/items/potion-health.png",
  potion_health: "/sprites/items/potion-health.png",
  potion_mana: "/sprites/items/potion-mana.png",
  scroll: "/sprites/items/staff.png",
  material: "/sprites/items/gold.png",
  quest_item: "/sprites/items/gold.png",
  bow: "/sprites/items/bow.png",
  staff: "/sprites/items/staff.png",
  shield: "/sprites/items/shield.png",
  default: "/sprites/items/gold.png",
};

// NPC sprites mapping
const NPC_SPRITES: Record<string, string> = {
  merchant: "/sprites/npcs/merchant.png",
  blacksmith: "/sprites/npcs/blacksmith.png",
  alchemist: "/sprites/npcs/alchemist.png",
  innkeeper: "/sprites/npcs/innkeeper.png",
  default: "/sprites/npcs/merchant.png",
};

interface ShopScreenProps {
  npcId: number;
  npcName: string;
  npcType: string;
  greeting?: string;
  onClose: () => void;
}

function getItemSprite(itemType: string, itemName?: string): string {
  if (itemName?.toLowerCase().includes("mana")) {
    return ITEM_SPRITES.potion_mana;
  }
  if (itemName?.toLowerCase().includes("health") || itemName?.toLowerCase().includes("vida")) {
    return ITEM_SPRITES.potion_health;
  }
  if (itemName?.toLowerCase().includes("arco") || itemName?.toLowerCase().includes("bow")) {
    return ITEM_SPRITES.bow;
  }
  if (itemName?.toLowerCase().includes("cajado") || itemName?.toLowerCase().includes("staff")) {
    return ITEM_SPRITES.staff;
  }
  if (itemName?.toLowerCase().includes("escudo") || itemName?.toLowerCase().includes("shield")) {
    return ITEM_SPRITES.shield;
  }
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
          name: item.name,
          description: item.description || "",
          itemType: item.itemType,
          rarity: item.rarity,
          buyPrice: item.buyPrice,
          sellPrice: item.sellPrice || Math.floor(item.buyPrice / 2),
          levelRequired: item.levelRequired || 1,
          damageMin: item.damageMin,
          damageMax: item.damageMax,
          armorValue: item.armorValue,
          healAmount: item.healAmount,
          manaAmount: item.manaAmount,
          statBonuses: item.statBonuses,
        },
        quantity,
      });
      toast.success(`Comprou ${quantity}x ${result.itemName} por ${result.totalCost} ouro!`);
      utils.character.get.invalidate();
      utils.inventory.get.invalidate();
      setSelectedItem(null);
      setQuantity(1);
    } catch (error: any) {
      toast.error(error.message || "Erro ao comprar item");
    }
  };

  const getRarityClass = (rarity: string) => `rarity-${rarity}`;
  const getRarityBgClass = (rarity: string) => `rarity-bg-${rarity}`;

  const totalCost = selectedItem ? selectedItem.item.buyPrice * quantity : 0;
  const canAfford = character && character.gold >= totalCost;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <img src="/sprites/ui/d20.png" alt="Loading" className="w-16 h-16 animate-spin pixelated" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] fantasy-card flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-3 pixel-text">
              <img 
                src={NPC_SPRITES[npcType] || NPC_SPRITES.default} 
                alt={npcType}
                className="w-12 h-12 pixelated"
              />
              {npcName}
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          {greeting && (
            <p className="text-sm text-muted-foreground italic">"{greeting}"</p>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden flex flex-col">
          {/* Player Gold */}
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-muted/30 border border-yellow-500/30">
            <span className="text-sm text-muted-foreground">Seu Ouro:</span>
            <span className="flex items-center gap-2 font-bold gold-text pixel-text">
              <img src="/sprites/items/gold.png" alt="Gold" className="w-6 h-6 pixelated" />
              {character?.gold || 0}
            </span>
          </div>

          {/* Shop Items */}
          <ScrollArea className="flex-1">
            {!shopItems || shopItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <img src="/sprites/items/gold.png" alt="Empty" className="w-16 h-16 mx-auto mb-2 opacity-30 pixelated" />
                <p className="pixel-text">Nenhum item à venda</p>
              </div>
            ) : (
              <div className="space-y-2">
                {shopItems.map((shopItem) => (
                  <button
                    key={shopItem.item.id}
                    onClick={() => {
                      setSelectedItem(shopItem);
                      setQuantity(1);
                    }}
                    className={cn(
                      "w-full p-3 rounded-lg border flex items-center gap-3 transition-all text-left hover:scale-[1.02]",
                      selectedItem?.item.id === shopItem.item.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      getRarityBgClass(shopItem.item.rarity)
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center">
                      <img 
                        src={getItemSprite(shopItem.item.itemType, shopItem.item.name)}
                        alt={shopItem.item.name}
                        className="w-10 h-10 pixelated"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-medium truncate pixel-text", getRarityClass(shopItem.item.rarity))}>
                        {shopItem.item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {ITEM_TYPES[shopItem.item.itemType as keyof typeof ITEM_TYPES]?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500 font-medium pixel-text">
                        <img src="/sprites/items/gold.png" alt="Gold" className="w-5 h-5 pixelated" />
                        {shopItem.item.buyPrice}
                      </div>
                      {shopItem.stock > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Estoque: {shopItem.stock}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Selected Item Details */}
          {selectedItem && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border flex-shrink-0">
              <div className="flex items-start gap-3 mb-3">
                <div className={cn(
                  "w-16 h-16 rounded-lg flex items-center justify-center",
                  getRarityBgClass(selectedItem.item.rarity)
                )}>
                  <img 
                    src={getItemSprite(selectedItem.item.itemType, selectedItem.item.name)}
                    alt={selectedItem.item.name}
                    className="w-12 h-12 pixelated"
                  />
                </div>
                <div className="flex-1">
                  <h4 className={cn("font-bold pixel-text", getRarityClass(selectedItem.item.rarity))}>
                    {selectedItem.item.name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {RARITIES[selectedItem.item.rarity as keyof typeof RARITIES]?.name}
                  </p>
                  {selectedItem.item.description && (
                    <p className="text-sm mt-1">{selectedItem.item.description}</p>
                  )}
                </div>
              </div>

              {/* Item Stats */}
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                {selectedItem.item.damageMin && selectedItem.item.damageMax && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/items/sword.png" alt="Damage" className="w-4 h-4 pixelated" />
                    Dano: {selectedItem.item.damageMin}-{selectedItem.item.damageMax}
                  </div>
                )}
                {selectedItem.item.armorValue && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/items/shield.png" alt="Armor" className="w-4 h-4 pixelated" />
                    Armadura: +{selectedItem.item.armorValue}
                  </div>
                )}
                {selectedItem.item.healAmount && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/ui/heart.png" alt="Heal" className="w-4 h-4 pixelated" />
                    Cura: +{selectedItem.item.healAmount} HP
                  </div>
                )}
                {selectedItem.item.manaAmount && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/ui/mana.png" alt="Mana" className="w-4 h-4 pixelated" />
                    Mana: +{selectedItem.item.manaAmount} MP
                  </div>
                )}
                {selectedItem.item.levelRequired > 1 && (
                  <div className="text-muted-foreground">Nível: {selectedItem.item.levelRequired}</div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm pixel-text">Quantidade:</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-4 h-4" />
                  </Button>
                  <span className="w-8 text-center font-medium pixel-text">{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(quantity + 1)}
                    disabled={selectedItem.stock > 0 && quantity >= selectedItem.stock}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Buy Button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className={cn(
                    "font-bold flex items-center gap-1 pixel-text",
                    canAfford ? "text-yellow-500" : "text-destructive"
                  )}>
                    <img src="/sprites/items/gold.png" alt="Gold" className="w-5 h-5 pixelated" />
                    {totalCost}
                  </span>
                </div>
                <Button
                  onClick={handleBuy}
                  disabled={!canAfford || buyMutation.isPending}
                  className="pixel-text"
                >
                  {buyMutation.isPending ? (
                    <img src="/sprites/ui/d20.png" alt="Loading" className="w-5 h-5 animate-spin pixelated" />
                  ) : (
                    <>
                      <img src="/sprites/items/gold.png" alt="Buy" className="w-5 h-5 mr-2 pixelated" />
                      Comprar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
