import { trpc } from "@/lib/trpc";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { CHARACTER_CLASSES } from "../../../shared/gameConstants";

// Class sprites mapping - All unique sprites
const CLASS_SPRITES: Record<string, string> = {
  warrior: "/sprites/classes/warrior.png",
  fighter: "/sprites/classes/warrior.png",
  mage: "/sprites/classes/mage.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/druid.png",
  monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png",
  warlock: "/sprites/classes/warlock.png",
};

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
    <div className={cn("bg-card/95 backdrop-blur-sm border-2 border-primary/30 rounded-lg p-3 shadow-lg", className)}>
      {/* Character Info */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-14 h-14 rounded-lg bg-primary/20 border-2 border-primary flex items-center justify-center overflow-hidden">
          <img 
            src={CLASS_SPRITES[character.characterClass] || CLASS_SPRITES.warrior}
            alt={character.characterClass}
            className="w-12 h-12 pixelated"
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate pixel-text">{character.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary pixel-text">
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
            <img src="/sprites/ui/heart.png" alt="HP" className="w-4 h-4 pixelated" />
            <span className="pixel-text">HP</span>
          </div>
          <span className="pixel-text">{character.currentHealth}/{character.maxHealth}</span>
        </div>
        <Progress 
          value={healthPercent} 
          className={cn(
            "h-3",
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
            <img src="/sprites/ui/mana.png" alt="MP" className="w-4 h-4 pixelated" />
            <span className="pixel-text">MP</span>
          </div>
          <span className="pixel-text">{character.currentMana}/{character.maxMana}</span>
        </div>
        <Progress 
          value={manaPercent} 
          className="h-3"
          style={{
            background: "var(--muted)",
          }}
        />
      </div>

      {/* XP Bar */}
      <div className="space-y-1 mb-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-primary">
            <img src="/sprites/ui/d20.png" alt="XP" className="w-4 h-4 pixelated" />
            <span className="pixel-text">XP</span>
          </div>
          <span className="pixel-text">{character.experience}/{character.experienceToNextLevel}</span>
        </div>
        <Progress 
          value={xpPercent} 
          className="h-3"
          style={{
            background: "var(--muted)",
          }}
        />
      </div>

      {/* Gold */}
      <div className="flex items-center justify-between mb-3 px-2 py-1.5 rounded bg-muted/50 border border-yellow-500/30">
        <div className="flex items-center gap-1.5">
          <img src="/sprites/items/gold.png" alt="Gold" className="w-6 h-6 pixelated" />
          <span className="text-sm font-medium gold-text pixel-text">{character.gold}</span>
        </div>
        {character.availableStatPoints > 0 && (
          <div className="flex items-center gap-1 text-xs text-accent">
            <ChevronUp className="w-3 h-3" />
            <span className="pixel-text">{character.availableStatPoints} pontos</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 hover:scale-105 transition-transform"
          onClick={onOpenCharacter}
        >
          <img src={CLASS_SPRITES[character.characterClass] || CLASS_SPRITES.warrior} alt="Character" className="w-6 h-6 pixelated" />
          <span className="text-[10px] pixel-text">Ficha</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 hover:scale-105 transition-transform"
          onClick={onOpenInventory}
        >
          <img src="/sprites/items/gold.png" alt="Inventory" className="w-6 h-6 pixelated" />
          <span className="text-[10px] pixel-text">Inventário</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex flex-col items-center gap-1 h-auto py-2 hover:scale-105 transition-transform"
          onClick={onOpenQuests}
        >
          <img src="/sprites/ui/marker-npc.png" alt="Quests" className="w-6 h-6 pixelated" />
          <span className="text-[10px] pixel-text">Missões</span>
        </Button>
      </div>

      {/* Rest Button */}
      {(character.currentHealth < character.maxHealth || character.currentMana < character.maxMana) && (
        <Button
          variant="secondary"
          size="sm"
          className="w-full mt-2 pixel-text"
          onClick={handleRest}
          disabled={restMutation.isPending}
        >
          <img src="/sprites/ui/heart.png" alt="Rest" className="w-4 h-4 mr-2 pixelated" />
          {restMutation.isPending ? "Descansando..." : "Descansar (+25%)"}
        </Button>
      )}
    </div>
  );
}
