import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { CHARACTER_CLASSES } from "../../../shared/gameConstants";
import { PixelFrame, PixelBar, PixelBtn, PixelText, PixelSeparator, PIXEL_FONT, COLORS } from "./ui/pixelUI";

// Class sprites mapping
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
  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];

  const handleRest = () => {
    restMutation.mutate(undefined, {
      onSuccess: () => {
        utils.character.get.invalidate();
      },
    });
  };

  return (
    <PixelFrame 
      borderColor={COLORS.gold} 
      bgColor="rgba(12,12,29,0.92)"
      ornate
      className={cn("p-2", className)}
    >
      {/* Character Portrait + Name */}
      <div className="flex items-center gap-2 mb-2">
        {/* Portrait frame */}
        <div className="relative flex-shrink-0">
          <div 
            className="w-12 h-12 flex items-center justify-center overflow-hidden"
            style={{
              background: '#0a0a1a',
              border: `2px solid ${COLORS.gold}`,
              boxShadow: `inset 0 0 8px rgba(0,0,0,0.8), 0 0 4px ${COLORS.gold}30`,
            }}
          >
            <img 
              src={CLASS_SPRITES[character.characterClass] || CLASS_SPRITES.warrior}
              alt={character.characterClass}
              className="w-10 h-10"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          {/* Level badge */}
          <div 
            className="absolute -bottom-1 -right-1 w-5 h-5 flex items-center justify-center"
            style={{
              background: COLORS.panelDark,
              border: `1px solid ${COLORS.gold}`,
              boxShadow: `0 0 4px ${COLORS.gold}40`,
            }}
          >
            <PixelText size="xxs" color={COLORS.textGold}>{character.level}</PixelText>
          </div>
        </div>

        {/* Name + Class */}
        <div className="flex-1 min-w-0">
          <PixelText size="sm" color={COLORS.textGold} bold className="block truncate">
            {character.name}
          </PixelText>
          <PixelText size="xxs" color={COLORS.textGray} className="block">
            {classData?.name || character.characterClass} Nv.{character.level}
          </PixelText>
        </div>
      </div>

      {/* HP Bar */}
      <PixelBar
        current={character.currentHealth}
        max={character.maxHealth}
        color={COLORS.hpGreen}
        label="HP"
        labelColor={COLORS.hpRed}
        className="mb-1"
      />

      {/* MP Bar */}
      <PixelBar
        current={character.currentMana}
        max={character.maxMana}
        color={COLORS.mpBlue}
        label="MP"
        labelColor={COLORS.mpBlue}
        className="mb-1"
      />

      {/* XP Bar */}
      <PixelBar
        current={character.experience}
        max={character.experienceToNextLevel || 100}
        color={COLORS.xpGold}
        label="XP"
        labelColor={COLORS.xpGold}
        className="mb-2"
      />

      {/* Gold display */}
      <div 
        className="flex items-center justify-between px-2 py-1 mb-2"
        style={{
          background: '#1a1500',
          border: `1px solid ${COLORS.goldDark}`,
          boxShadow: `inset 0 0 6px rgba(0,0,0,0.5)`,
        }}
      >
        <div className="flex items-center gap-1">
          <img src="/sprites/items/gold.png" alt="Gold" className="w-4 h-4" style={{ imageRendering: 'pixelated' }} />
          <PixelText size="sm" color={COLORS.textGold} glow>{character.gold}</PixelText>
        </div>
        {character.availableStatPoints > 0 && (
          <PixelText size="xxs" color={COLORS.textGreen} glow>
            +{character.availableStatPoints} pts
          </PixelText>
        )}
      </div>

      <PixelSeparator />

      {/* Action Buttons - Pixel RPG style */}
      <div className="grid grid-cols-3 gap-1">
        <PixelBtn variant="gold" size="xs" onClick={onOpenCharacter}>
          <div className="flex flex-col items-center gap-0.5">
            <img 
              src={CLASS_SPRITES[character.characterClass] || CLASS_SPRITES.warrior} 
              alt="Ficha" 
              className="w-5 h-5" 
              style={{ imageRendering: 'pixelated' }} 
            />
            <span>Ficha</span>
          </div>
        </PixelBtn>
        <PixelBtn variant="gold" size="xs" onClick={onOpenInventory}>
          <div className="flex flex-col items-center gap-0.5">
            <img 
              src="/sprites/items/gold.png" 
              alt="Inv" 
              className="w-5 h-5" 
              style={{ imageRendering: 'pixelated' }} 
            />
            <span>Inv.</span>
          </div>
        </PixelBtn>
        <PixelBtn variant="gold" size="xs" onClick={onOpenQuests}>
          <div className="flex flex-col items-center gap-0.5">
            <img 
              src="/sprites/ui/marker-npc.png" 
              alt="Quests" 
              className="w-5 h-5" 
              style={{ imageRendering: 'pixelated' }} 
            />
            <span>Quest</span>
          </div>
        </PixelBtn>
      </div>

      {/* Rest Button */}
      {(character.currentHealth < character.maxHealth || character.currentMana < character.maxMana) && (
        <div className="mt-1">
          <PixelBtn 
            variant="success" 
            size="xs" 
            fullWidth
            onClick={handleRest}
            disabled={restMutation.isPending}
          >
            {restMutation.isPending ? "Descansando..." : "Descansar (+25%)"}
          </PixelBtn>
        </div>
      )}
    </PixelFrame>
  );
}
