import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Heart, Sparkles, Coins, Star, ChevronUp, Backpack, Scroll, User } from "lucide-react";
import { CHARACTER_CLASSES } from "../../../shared/gameConstants";

interface PlayerHUDProps {
  onOpenInventory: () => void;
  onOpenQuests: () => void;
  onOpenCharacter: () => void;
  className?: string;
}

export function PlayerHUD({ onOpenInventory, onOpenQuests, onOpenCharacter, className }: PlayerHUDProps) {
  const { data: character, isLoading } = trpc.character.get.useQuery();
  const restMutation = trpc.character.rest.useMutation();
  const utils = trpc.useUtils();

  if (isLoading || !character) {
    return null;
  }

  const healthPercent = (character.currentHealth / character.maxHealth) * 100;
  const manaPercent = (character.currentMana / character.maxMana) * 100;
  const xpPercent = character.experienceToNextLevel > 0 
    ? (character.experience / character.experienceToNextLevel) * 100 
    : 100;

  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];

  const handleRest = () => {
    restMutation.mutate(undefined, {
      onSuccess: () => {
        utils.character.get.invalidate();
      },
    });
  };

  return (
    <div className={cn("bg-card/95 backdrop-blur-sm border border-border rounded-lg p-3", className)}>
      {/* Character Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center text-2xl">
          🧙
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{character.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
              Nv. {character.level}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{classData?.name || character.characterClass}</p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-destructive">
            <Heart className="w-3 h-3" />
            <span>HP</span>
          </div>
          <span>{character.currentHealth}/{character.maxHealth}</span>
        </div>
        <Progress 
          value={healthPercent} 
          className={cn(
            "h-2",
            healthPercent < 25 && "health-low"
          )}
          style={{
            background: "var(--muted)",
          }}
        />
      </div>

      {/* Mana Bar */}
      <div className="space-y-1 mb-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-blue-400">
            <Sparkles className="w-3 h-3" />
            <span>MP</span>
          </div>
          <span>{character.currentMana}/{character.maxMana}</span>
        </div>
        <Progress 
          value={manaPercent} 
          className="h-2"
          style={{
            background: "var(--muted)",
          }}
        />
      </div>

      {/* XP Bar */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-primary">
            <Star className="w-3 h-3" />
            <span>XP</span>
          </div>
          <span>{character.experience}/{character.experienceToNextLevel}</span>
        </div>
        <Progress 
          value={xpPercent} 
          className="h-2"
          style={{
            background: "var(--muted)",
          }}
        />
      </div>

      {/* Gold */}
      <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded bg-muted/50">
        <div className="flex items-center gap-1.5">
          <Coins className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium gold-text">{character.gold}</span>
        </div>
        {character.availableStatPoints > 0 && (
          <div className="flex items-center gap-1 text-xs text-accent">
            <ChevronUp className="w-3 h-3" />
            <span>{character.availableStatPoints} pontos</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2"
          onClick={onOpenCharacter}
        >
          <User className="w-4 h-4" />
          <span className="text-[10px]">Ficha</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2"
          onClick={onOpenInventory}
        >
          <Backpack className="w-4 h-4" />
          <span className="text-[10px]">Inventário</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2"
          onClick={onOpenQuests}
        >
          <Scroll className="w-4 h-4" />
          <span className="text-[10px]">Missões</span>
        </Button>
      </div>

      {/* Rest Button */}
      {(character.currentHealth < character.maxHealth || character.currentMana < character.maxMana) && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full mt-2"
          onClick={handleRest}
          disabled={restMutation.isPending}
        >
          {restMutation.isPending ? "Descansando..." : "Descansar (+25%)"}
        </Button>
      )}
    </div>
  );
}
