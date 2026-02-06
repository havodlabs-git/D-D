import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CHARACTER_CLASSES, ATTRIBUTES } from "../../../shared/gameConstants";
import { PixelFrame, PixelBar, PixelBtn, PixelText, PixelTitleBar, PixelStatRow, PixelSeparator, PixelOverlay, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png", warrior: "/sprites/classes/warrior.png",
  wizard: "/sprites/classes/mage.png", mage: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png", cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png", paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png", bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/druid.png", monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png", warlock: "/sprites/classes/warlock.png",
};

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
      <PixelOverlay>
        <PixelText size="md" color={COLORS.textGold} glow>A carregar...</PixelText>
      </PixelOverlay>
    );
  }

  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];
  const xpPercent = character.experienceToNextLevel > 0 ? (character.experience / character.experienceToNextLevel) * 100 : 100;
  const sprite = CLASS_SPRITES[character.characterClass?.toLowerCase()] || CLASS_SPRITES.fighter;

  const attributes = [
    { key: "strength", value: character.strength, color: "#ef4444" },
    { key: "dexterity", value: character.dexterity, color: "#22c55e" },
    { key: "constitution", value: character.constitution, color: "#f59e0b" },
    { key: "intelligence", value: character.intelligence, color: "#3b82f6" },
    { key: "wisdom", value: character.wisdom, color: "#a855f7" },
    { key: "charisma", value: character.charisma, color: "#ec4899" },
  ];

  return (
    <PixelOverlay>
      <PixelFrame borderColor={COLORS.gold} ornate glow className="w-full max-w-md" bgColor={COLORS.panelDark}>
        <div className="p-3">
          <PixelTitleBar title="FICHA DO PERSONAGEM" onClose={onClose} />

          <PixelScrollArea maxHeight="70vh">
            {/* Character Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-shrink-0" style={{
                width: '64px', height: '64px',
                background: '#0a0a1a',
                border: `2px solid ${COLORS.gold}`,
                boxShadow: `inset 0 0 12px rgba(0,0,0,0.8), 0 0 8px ${COLORS.gold}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <img src={sprite} alt={character.characterClass} className="w-14 h-14" style={{ imageRendering: 'pixelated' }} />
              </div>
              <div className="flex-1">
                <PixelText size="md" color={COLORS.textGold} bold className="block">{character.name}</PixelText>
                <PixelText size="xs" color={COLORS.textGray} className="block">{classData?.name || character.characterClass}</PixelText>
                <div className="flex items-center gap-2 mt-1">
                  <PixelFrame borderColor={COLORS.gold} className="px-2 py-0.5">
                    <PixelText size="xxs" color={COLORS.textGold}>Nv. {character.level}</PixelText>
                  </PixelFrame>
                  {character.availableStatPoints > 0 && (
                    <PixelFrame borderColor={COLORS.hpGreen} className="px-2 py-0.5">
                      <PixelText size="xxs" color={COLORS.textGreen} glow>+{character.availableStatPoints} pts</PixelText>
                    </PixelFrame>
                  )}
                </div>
              </div>
            </div>

            {/* XP Bar */}
            <div className="mb-3">
              <PixelBar current={character.experience} max={character.experienceToNextLevel || 100} color={COLORS.xpGold} label="XP" labelColor={COLORS.xpGold} />
            </div>

            {/* Combat Stats Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <PixelFrame borderColor="#ef444460" className="p-2 text-center">
                <PixelText size="xxs" color={COLORS.hpRed} className="block mb-1">VIDA</PixelText>
                <PixelText size="md" color={COLORS.textWhite} bold>{character.currentHealth}/{character.maxHealth}</PixelText>
              </PixelFrame>
              <PixelFrame borderColor="#3b82f660" className="p-2 text-center">
                <PixelText size="xxs" color={COLORS.mpBlue} className="block mb-1">MANA</PixelText>
                <PixelText size="md" color={COLORS.textWhite} bold>{character.currentMana}/{character.maxMana}</PixelText>
              </PixelFrame>
              <PixelFrame borderColor="#9ca3af60" className="p-2 text-center">
                <PixelText size="xxs" color={COLORS.textGray} className="block mb-1">ARMADURA</PixelText>
                <PixelText size="md" color={COLORS.textWhite} bold>{character.armorClass}</PixelText>
              </PixelFrame>
              <PixelFrame borderColor="#f59e0b60" className="p-2 text-center">
                <PixelText size="xxs" color={COLORS.xpGold} className="block mb-1">OURO</PixelText>
                <PixelText size="md" color={COLORS.textGold} bold glow>{character.gold}</PixelText>
              </PixelFrame>
            </div>

            <PixelSeparator />

            {/* Attributes */}
            <PixelText size="xs" color={COLORS.textGold} className="block mb-2">ATRIBUTOS</PixelText>
            <div className="space-y-1 mb-3">
              {attributes.map(({ key, value, color }) => {
                const attr = ATTRIBUTES[key as keyof typeof ATTRIBUTES];
                return (
                  <PixelStatRow
                    key={key}
                    label={attr.abbr}
                    value={value}
                    color={color}
                    onAllocate={() => handleAllocate(key)}
                    canAllocate={character.availableStatPoints > 0 && !allocateMutation.isPending}
                  />
                );
              })}
            </div>

            {/* Class Description */}
            {classData && (
              <>
                <PixelSeparator />
                <PixelFrame borderColor={COLORS.gold + "40"} className="p-2">
                  <PixelText size="xs" color={COLORS.textGold} bold className="block mb-1">{classData.name}</PixelText>
                  <PixelText size="xxs" color={COLORS.textGray} as="p">{classData.description}</PixelText>
                </PixelFrame>
              </>
            )}
          </PixelScrollArea>
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
