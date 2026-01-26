import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { X, Package, Shirt, Sword, Shield, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { ITEM_TYPES, RARITIES } from "../../../shared/gameConstants";

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

interface InventoryScreenProps {
  onClose: () => void;
}

export function InventoryScreen({ onClose }: InventoryScreenProps) {
  const [selectedItem, setSelectedItem] = useState<any>(null);

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
      utils.inventory.get.invalidate();
      utils.inventory.getEquipped.invalidate();
      utils.character.get.invalidate();
      setSelectedItem(null);
    } catch (error) {
      toast.error("Erro ao equipar item");
    }
  };

  const handleUnequip = async (inventoryId: number) => {
    try {
      await unequipMutation.mutateAsync({ inventoryId });
      toast.success("Item desequipado!");
      utils.inventory.get.invalidate();
      utils.inventory.getEquipped.invalidate();
      utils.character.get.invalidate();
      setSelectedItem(null);
    } catch (error) {
      toast.error("Erro ao desequipar item");
    }
  };

  const handleUse = async (inventoryId: number) => {
    try {
      const result = await useMutation.mutateAsync({ inventoryId });
      if (result.healAmount > 0) {
        toast.success(`Recuperou ${result.healAmount} HP!`);
      }
      if (result.manaAmount > 0) {
        toast.success(`Recuperou ${result.manaAmount} MP!`);
      }
      utils.inventory.get.invalidate();
      utils.character.get.invalidate();
      setSelectedItem(null);
    } catch (error) {
      toast.error("Erro ao usar item");
    }
  };

  const getRarityClass = (rarity: string) => {
    return `rarity-${rarity}`;
  };

  const getRarityBgClass = (rarity: string) => {
    return `rarity-bg-${rarity}`;
  };

  const getItemSprite = (itemType: string, itemName?: string): string => {
    // Check for specific item types
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
  };

  // Separate equipped and bag items
  const bagItems = inventory?.filter(i => !i.inventory.isEquipped) || [];
  const equippedItems = equipped || [];

  // Equipment slots with sprites
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

  const getEquippedInSlot = (slotId: string) => {
    return equippedItems.find(e => e.inventory.equipSlot === slotId);
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <img src="/sprites/ui/d20.png" alt="Loading" className="w-16 h-16 animate-spin pixelated" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] fantasy-card flex flex-col">
        <CardHeader className="pb-2 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2 pixel-text">
              <img src="/sprites/items/gold.png" alt="Inventory" className="w-8 h-8 pixelated" />
              Inventário
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden">
          <Tabs defaultValue="equipment" className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 flex-shrink-0">
              <TabsTrigger value="equipment" className="pixel-text">
                <Shirt className="w-4 h-4 mr-2" />
                Equipamento
              </TabsTrigger>
              <TabsTrigger value="bag" className="pixel-text">
                <Package className="w-4 h-4 mr-2" />
                Mochila ({bagItems.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="equipment" className="flex-1 overflow-hidden mt-4">
              <div className="grid grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const equipped = getEquippedInSlot(slot.id);
                  return (
                    <button
                      key={slot.id}
                      onClick={() => equipped && setSelectedItem({ ...equipped, isEquipped: true })}
                      className={cn(
                        "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 transition-all hover:scale-105",
                        equipped 
                          ? `border-solid ${getRarityBgClass(equipped.item.rarity)} border-border hover:border-primary` 
                          : "border-muted hover:border-muted-foreground"
                      )}
                    >
                      <img 
                        src={equipped ? getItemSprite(equipped.item.itemType, equipped.item.name) : slot.sprite}
                        alt={equipped ? equipped.item.name : slot.name}
                        className={cn(
                          "w-10 h-10 pixelated",
                          !equipped && "opacity-30"
                        )}
                      />
                      <span className="text-[10px] text-muted-foreground pixel-text">
                        {equipped ? equipped.item.name : slot.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="bag" className="flex-1 overflow-hidden mt-4">
              <ScrollArea className="h-[300px]">
                {bagItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <img src="/sprites/items/gold.png" alt="Empty" className="w-16 h-16 mx-auto mb-2 opacity-30 pixelated" />
                    <p className="pixel-text">Sua mochila está vazia</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {bagItems.map((invItem) => (
                      <button
                        key={invItem.inventory.id}
                        onClick={() => setSelectedItem({ ...invItem, isEquipped: false })}
                        className={cn(
                          "aspect-square rounded-lg border flex flex-col items-center justify-center gap-1 transition-all hover:border-primary hover:scale-105 relative",
                          getRarityBgClass(invItem.item.rarity)
                        )}
                      >
                        <img 
                          src={getItemSprite(invItem.item.itemType, invItem.item.name)}
                          alt={invItem.item.name}
                          className="w-10 h-10 pixelated"
                        />
                        {invItem.inventory.quantity > 1 && (
                          <span className="absolute bottom-1 right-1 text-[10px] bg-background/80 px-1 rounded pixel-text">
                            x{invItem.inventory.quantity}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Item Details Panel */}
          {selectedItem && (
            <div className="mt-4 p-4 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-start gap-3">
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
                    {ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES]?.name} • {RARITIES[selectedItem.item.rarity as keyof typeof RARITIES]?.name}
                  </p>
                  {selectedItem.item.description && (
                    <p className="text-sm mt-1">{selectedItem.item.description}</p>
                  )}
                </div>
              </div>

              {/* Item Stats */}
              <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
                {selectedItem.item.damageMin && selectedItem.item.damageMax && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/items/sword.png" alt="Damage" className="w-5 h-5 pixelated" />
                    <span>Dano: {selectedItem.item.damageMin}-{selectedItem.item.damageMax}</span>
                  </div>
                )}
                {selectedItem.item.armorValue && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/items/shield.png" alt="Armor" className="w-5 h-5 pixelated" />
                    <span>Armadura: +{selectedItem.item.armorValue}</span>
                  </div>
                )}
                {selectedItem.item.healAmount && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/ui/heart.png" alt="Heal" className="w-5 h-5 pixelated" />
                    <span>Cura: +{selectedItem.item.healAmount} HP</span>
                  </div>
                )}
                {selectedItem.item.manaAmount && (
                  <div className="flex items-center gap-1">
                    <img src="/sprites/ui/mana.png" alt="Mana" className="w-5 h-5 pixelated" />
                    <span>Mana: +{selectedItem.item.manaAmount} MP</span>
                  </div>
                )}
              </div>

              {/* Stat Bonuses */}
              {selectedItem.item.statBonuses && Object.keys(selectedItem.item.statBonuses).length > 0 && (
                <div className="mt-2 text-xs text-accent">
                  {Object.entries(selectedItem.item.statBonuses).map(([stat, value]) => (
                    <span key={stat} className="mr-2">+{value as number} {stat}</span>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4">
                {selectedItem.isEquipped ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnequip(selectedItem.inventory.id)}
                    disabled={unequipMutation.isPending}
                    className="pixel-text"
                  >
                    Desequipar
                  </Button>
                ) : (
                  <>
                    {ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES]?.slot && (
                      <Button
                        size="sm"
                        onClick={() => handleEquip(
                          selectedItem.inventory.id, 
                          ITEM_TYPES[selectedItem.item.itemType as keyof typeof ITEM_TYPES].slot!
                        )}
                        disabled={equipMutation.isPending}
                        className="pixel-text"
                      >
                        Equipar
                      </Button>
                    )}
                    {(selectedItem.item.itemType === "potion" || selectedItem.item.itemType === "scroll") && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUse(selectedItem.inventory.id)}
                        disabled={useMutation.isPending}
                        className="pixel-text"
                      >
                        Usar
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                  className="pixel-text"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
