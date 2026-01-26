import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X, Coins, ShoppingBag, Loader2, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { RARITIES, ITEM_TYPES } from "../../../shared/gameConstants";

interface ShopScreenProps {
  npcId: number;
  npcName: string;
  npcType: string;
  greeting?: string;
  onClose: () => void;
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
      const result = await buyMutation.mutateAsync({
        itemId: selectedItem.item.id,
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

  const getItemIcon = (itemType: string) => {
    const icons: Record<string, string> = {
      weapon: "⚔️",
      armor: "🛡️",
      helmet: "⛑️",
      boots: "👢",
      gloves: "🧤",
      ring: "💍",
      amulet: "📿",
      potion: "🧪",
      scroll: "📜",
      material: "💎",
      quest_item: "🔑",
    };
    return icons[itemType] || "📦";
  };

  const getRarityClass = (rarity: string) => `rarity-${rarity}`;
  const getRarityBgClass = (rarity: string) => `rarity-bg-${rarity}`;

  const getNpcIcon = (type: string) => {
    const icons: Record<string, string> = {
      merchant: "🛒",
      blacksmith: "⚒️",
      alchemist: "⚗️",
    };
    return icons[type] || "👤";
  };

  const totalCost = selectedItem ? selectedItem.item.buyPrice * quantity : 0;
  const canAfford = character && character.gold >= totalCost;

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] fantasy-card flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              <span className="text-2xl">{getNpcIcon(npcType)}</span>
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
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg bg-muted/30">
            <span className="text-sm text-muted-foreground">Seu Ouro:</span>
            <span className="flex items-center gap-1 font-bold gold-text">
              <Coins className="w-4 h-4 text-yellow-500" />
              {character?.gold || 0}
            </span>
          </div>

          {/* Shop Items */}
          <ScrollArea className="flex-1">
            {!shopItems || shopItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum item à venda</p>
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
                      "w-full p-3 rounded-lg border flex items-center gap-3 transition-all text-left",
                      selectedItem?.item.id === shopItem.item.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50",
                      getRarityBgClass(shopItem.item.rarity)
                    )}
                  >
                    <div className="w-12 h-12 rounded-lg bg-background/50 flex items-center justify-center text-2xl">
                      {getItemIcon(shopItem.item.itemType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className={cn("font-medium truncate", getRarityClass(shopItem.item.rarity))}>
                        {shopItem.item.name}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {ITEM_TYPES[shopItem.item.itemType as keyof typeof ITEM_TYPES]?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-yellow-500 font-medium">
                        <Coins className="w-4 h-4" />
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
                  "w-14 h-14 rounded-lg flex items-center justify-center text-3xl",
                  getRarityBgClass(selectedItem.item.rarity)
                )}>
                  {getItemIcon(selectedItem.item.itemType)}
                </div>
                <div className="flex-1">
                  <h4 className={cn("font-bold", getRarityClass(selectedItem.item.rarity))}>
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
                  <div>Dano: {selectedItem.item.damageMin}-{selectedItem.item.damageMax}</div>
                )}
                {selectedItem.item.armorValue && (
                  <div>Armadura: +{selectedItem.item.armorValue}</div>
                )}
                {selectedItem.item.healAmount && (
                  <div>Cura: +{selectedItem.item.healAmount} HP</div>
                )}
                {selectedItem.item.manaAmount && (
                  <div>Mana: +{selectedItem.item.manaAmount} MP</div>
                )}
                {selectedItem.item.levelRequired > 1 && (
                  <div className="text-muted-foreground">Nível: {selectedItem.item.levelRequired}</div>
                )}
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm">Quantidade:</span>
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
                  <span className="w-8 text-center font-medium">{quantity}</span>
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
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground">Total:</span>
                  <span className={cn(
                    "font-bold flex items-center gap-1",
                    canAfford ? "text-yellow-500" : "text-destructive"
                  )}>
                    <Coins className="w-4 h-4" />
                    {totalCost}
                  </span>
                </div>
                <Button
                  onClick={handleBuy}
                  disabled={!canAfford || buyMutation.isPending}
                >
                  {buyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4 mr-2" />
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
