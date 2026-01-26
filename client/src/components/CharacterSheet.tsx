import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { X, Plus, Loader2, Heart, Sparkles, Shield, Coins, Star } from "lucide-react";
import { toast } from "sonner";
import { CHARACTER_CLASSES, ATTRIBUTES } from "../../../shared/gameConstants";

interface CharacterSheetProps {
  onClose: () => void;
}

export function CharacterSheet({ onClose }: CharacterSheetProps) {
  const { data: character, isLoading } = trpc.character.get.useQuery();
  const allocateMutation = trpc.character.allocateStat.useMutation();
  const utils = trpc.useUtils();

  const handleAllocate = async (attribute: string) => {
    try {
      await allocateMutation.mutateAsync({ attribute: attribute as any });
      toast.success(`+1 ${ATTRIBUTES[attribute as keyof typeof ATTRIBUTES].name}`);
      utils.character.get.invalidate();
    } catch (error) {
      toast.error("Erro ao alocar ponto");
    }
  };

  if (isLoading || !character) {
    return (
      <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];
  const xpPercent = character.experienceToNextLevel > 0 
    ? (character.experience / character.experienceToNextLevel) * 100 
    : 100;

  const attributes = [
    { key: "strength", value: character.strength },
    { key: "dexterity", value: character.dexterity },
    { key: "constitution", value: character.constitution },
    { key: "intelligence", value: character.intelligence },
    { key: "wisdom", value: character.wisdom },
    { key: "charisma", value: character.charisma },
  ];

  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-lg fantasy-card my-4">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">📜 Ficha do Personagem</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Character Header */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-primary/20 border-4 border-primary flex items-center justify-center text-4xl">
              🧙
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{character.name}</h2>
              <p className="text-muted-foreground">{classData?.name || character.characterClass}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-sm font-medium">
                  Nível {character.level}
                </span>
                {character.availableStatPoints > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-accent/20 text-accent text-sm">
                    {character.availableStatPoints} pontos disponíveis
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-primary">
                <Star className="w-4 h-4" /> Experiência
              </span>
              <span>{character.experience} / {character.experienceToNextLevel}</span>
            </div>
            <Progress value={xpPercent} className="h-3" />
          </div>

          {/* Combat Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <Heart className="w-5 h-5" />
                <span className="font-medium">Vida</span>
              </div>
              <div className="text-2xl font-bold">
                {character.currentHealth} / {character.maxHealth}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <Sparkles className="w-5 h-5" />
                <span className="font-medium">Mana</span>
              </div>
              <div className="text-2xl font-bold">
                {character.currentMana} / {character.maxMana}
              </div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-secondary-foreground mb-1">
                <Shield className="w-5 h-5" />
                <span className="font-medium">Armadura</span>
              </div>
              <div className="text-2xl font-bold">{character.armorClass}</div>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-yellow-500 mb-1">
                <Coins className="w-5 h-5" />
                <span className="font-medium">Ouro</span>
              </div>
              <div className="text-2xl font-bold gold-text">{character.gold}</div>
            </div>
          </div>

          {/* Attributes */}
          <div>
            <h3 className="font-semibold mb-3">Atributos</h3>
            <div className="grid grid-cols-2 gap-3">
              {attributes.map(({ key, value }) => {
                const attr = ATTRIBUTES[key as keyof typeof ATTRIBUTES];
                return (
                  <div
                    key={key}
                    className="bg-muted/30 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs text-muted-foreground">{attr.abbr}</div>
                      <div className="font-medium">{attr.name}</div>
                      <div className="text-2xl font-bold">{value}</div>
                      <div className="text-sm text-muted-foreground">
                        Mod: {getModifier(value)}
                      </div>
                    </div>
                    {character.availableStatPoints > 0 && (
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10"
                        onClick={() => handleAllocate(key)}
                        disabled={allocateMutation.isPending}
                      >
                        <Plus className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Class Description */}
          {classData && (
            <div className="bg-primary/10 rounded-lg p-4">
              <h4 className="font-semibold text-primary mb-1">{classData.name}</h4>
              <p className="text-sm text-muted-foreground">{classData.description}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
