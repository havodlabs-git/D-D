import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Swords, Gift, AlertTriangle, ShoppingBag, Sparkles, X } from "lucide-react";

interface EncounterData {
  type: "battle" | "treasure" | "trap" | "merchant" | "event";
  data: any;
}

interface RandomEncounterProps {
  encounter: EncounterData;
  onBattle: (monster: any) => void;
  onCollectTreasure: (treasure: any) => void;
  onTrapDamage: (damage: number) => void;
  onClose: () => void;
}

export function RandomEncounter({
  encounter,
  onBattle,
  onCollectTreasure,
  onTrapDamage,
  onClose,
}: RandomEncounterProps) {
  const [trapTriggered, setTrapTriggered] = useState(false);

  const getEncounterIcon = () => {
    switch (encounter.type) {
      case "battle":
        return <Swords className="w-12 h-12 text-destructive" />;
      case "treasure":
        return <Gift className="w-12 h-12 text-yellow-500" />;
      case "trap":
        return <AlertTriangle className="w-12 h-12 text-orange-500" />;
      case "merchant":
        return <ShoppingBag className="w-12 h-12 text-green-500" />;
      case "event":
        return <Sparkles className="w-12 h-12 text-purple-500" />;
    }
  };

  const getEncounterTitle = () => {
    switch (encounter.type) {
      case "battle":
        return "Encontro de Batalha!";
      case "treasure":
        return "Tesouro Encontrado!";
      case "trap":
        return "Armadilha!";
      case "merchant":
        return "Mercador Viajante!";
      case "event":
        return "Evento Misterioso!";
    }
  };

  const handleTrap = () => {
    setTrapTriggered(true);
    onTrapDamage(encounter.data.damage);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-card/95 border-primary/50 animate-in fade-in zoom-in duration-300">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </Button>
          <div className="mx-auto mb-2 animate-bounce">
            {getEncounterIcon()}
          </div>
          <CardTitle className="text-2xl text-primary">
            {getEncounterTitle()}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Battle Encounter */}
          {encounter.type === "battle" && encounter.data.monster && (
            <div className="space-y-4">
              <div className="bg-black/50 rounded-lg p-4 text-center">
                <img
                  src={encounter.data.monster.sprite || `/sprites/monsters/${encounter.data.monster.monsterType}.png`}
                  alt={encounter.data.monster.name}
                  className="w-16 h-16 mx-auto mb-2 pixelated"
                  onError={(e) => { (e.target as HTMLImageElement).src = '/sprites/monsters/goblin.png'; }}
                />
                <div className="text-xl font-bold text-white">
                  {encounter.data.monster.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  Nível {encounter.data.monster.level} • {encounter.data.monster.tier}
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-red-900/50 rounded p-1">
                    HP: {Math.floor(encounter.data.monster.health)}
                  </div>
                  <div className="bg-orange-900/50 rounded p-1">
                    ATK: {Math.floor(encounter.data.monster.damage)}
                  </div>
                  <div className="bg-blue-900/50 rounded p-1">
                    DEF: {encounter.data.monster.armor}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => onBattle(encounter.data.monster)}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Lutar!
                </Button>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Fugir
                </Button>
              </div>
            </div>
          )}

          {/* Treasure Encounter */}
          {encounter.type === "treasure" && (
            <div className="space-y-4">
              <div className="bg-yellow-900/30 rounded-lg p-4 text-center">
                <img
                  src="/sprites/items/gold.png"
                  alt="Tesouro"
                  className="w-16 h-16 mx-auto mb-2 pixelated"
                />
                <div className="text-lg text-yellow-400">
                  Você encontrou um tesouro!
                </div>
                <div className="mt-2 space-y-1">
                  <div className="text-white">
                    💰 {encounter.data.gold} moedas de ouro
                  </div>
                  {encounter.data.item && (
                    <div className="text-green-400">
                      📦 {encounter.data.item}
                    </div>
                  )}
                  <div className="text-blue-400">
                    ⭐ +{encounter.data.xp} XP
                  </div>
                </div>
              </div>
              <Button
                onClick={() => onCollectTreasure(encounter.data)}
                className="w-full bg-yellow-600 hover:bg-yellow-700"
              >
                <Gift className="w-4 h-4 mr-2" />
                Coletar Tesouro
              </Button>
            </div>
          )}

          {/* Trap Encounter */}
          {encounter.type === "trap" && (
            <div className="space-y-4">
              <div className="bg-orange-900/30 rounded-lg p-4 text-center">
                <AlertTriangle className="w-16 h-16 mx-auto mb-2 text-orange-500" />
                <div className="text-lg text-orange-400">
                  {encounter.data.name}
                </div>
                {!trapTriggered ? (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Você ativou uma armadilha!
                  </div>
                ) : (
                  <div className="mt-2 text-destructive font-bold">
                    -{encounter.data.damage} HP
                    {encounter.data.effect && (
                      <span className="text-purple-400 ml-2">
                        ({encounter.data.effect})
                      </span>
                    )}
                  </div>
                )}
              </div>
              {!trapTriggered ? (
                <Button
                  onClick={handleTrap}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  Sofrer Dano
                </Button>
              ) : (
                <Button onClick={onClose} className="w-full">
                  Continuar
                </Button>
              )}
            </div>
          )}

          {/* Merchant Encounter */}
          {encounter.type === "merchant" && (
            <div className="space-y-4">
              <div className="bg-green-900/30 rounded-lg p-4 text-center">
                <img
                  src="/sprites/npcs/merchant.png"
                  alt="Mercador"
                  className="w-16 h-16 mx-auto mb-2 pixelated"
                />
                <div className="text-lg text-green-400">
                  {encounter.data.name}
                </div>
                <div className="mt-2 text-sm text-muted-foreground">
                  "Olá, viajante! Tenho mercadorias especiais..."
                </div>
                <div className="mt-2 text-yellow-400">
                  🏷️ {encounter.data.discount}% de desconto!
                </div>
                {encounter.data.specialItem && (
                  <div className="text-purple-400">
                    ✨ Item especial disponível!
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-green-600 hover:bg-green-700">
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Ver Itens
                </Button>
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Ignorar
                </Button>
              </div>
            </div>
          )}

          {/* Event Encounter */}
          {encounter.type === "event" && (
            <div className="space-y-4">
              <div className="bg-purple-900/30 rounded-lg p-4 text-center">
                <Sparkles className="w-16 h-16 mx-auto mb-2 text-purple-500" />
                <div className="text-lg text-purple-400">
                  Evento Misterioso
                </div>
                <div className="mt-2 text-sm text-muted-foreground italic">
                  "{encounter.data.description}"
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {encounter.data.choices?.map((choice: string, index: number) => (
                  <Button
                    key={index}
                    variant="outline"
                    onClick={onClose}
                    className="text-xs"
                  >
                    {choice}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
