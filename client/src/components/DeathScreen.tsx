import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PixelFrame, PixelBtn, PixelText, PixelSeparator, PIXEL_FONT, COLORS } from "./ui/pixelUI";

interface DeathScreenProps {
  characterName: string; characterClass: string; level: number;
  deathCause?: string; onCreateNew: () => void;
}

export function DeathScreen({ characterName, characterClass, level, deathCause, onCreateNew }: DeathScreenProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const deleteCharacter = trpc.character.deleteDeadCharacter.useMutation({ onSuccess: () => onCreateNew() });

  const handleCreateNew = () => { setIsDeleting(true); deleteCharacter.mutate(); };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 9999, background: 'rgba(5,0,0,0.95)' }}>
      {/* Blood vignette effect */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(139,0,0,0.3) 100%)',
      }} />

      <PixelFrame borderColor="#8b0000" ornate glow className="w-full max-w-sm relative" bgColor="#0a0005">
        <div className="p-4 text-center">
          {/* Skull ASCII art */}
          <div className="mb-3" style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#8b0000', lineHeight: '1.2', textShadow: '0 0 8px #8b000060' }}>
            <div>{"  ___  "}</div>
            <div>{" /x  x\\ "}</div>
            <div>{" | /\\ | "}</div>
            <div>{" |____| "}</div>
            <div>{"  ||||  "}</div>
          </div>

          {/* Title */}
          <PixelText size="xl" color="#8b0000" bold glow as="div" className="mb-1">
            MORRESTE
          </PixelText>
          <PixelText size="xs" color="#666" as="div" className="mb-3">
            Permadeath - Personagem perdido para sempre
          </PixelText>

          <PixelSeparator color="#8b0000" />

          {/* Character Memorial */}
          <PixelFrame borderColor="#8b000060" className="p-3 my-3" bgColor="#0a0008">
            <PixelText size="md" color={COLORS.textWhite} bold as="div">{characterName}</PixelText>
            <PixelText size="xs" color={COLORS.textGray} as="div" className="mt-1">
              {characterClass.charAt(0).toUpperCase() + characterClass.slice(1)} - Nivel {level}
            </PixelText>
            {deathCause && (
              <PixelText size="xxs" color="#8b0000" as="div" className="mt-2 italic">"{deathCause}"</PixelText>
            )}
          </PixelFrame>

          {/* Memorial quote */}
          <PixelText size="xxs" color="#555" as="div" className="mb-3 italic">
            "Os mais bravos guerreiros caem, mas as suas lendas vivem para sempre..."
          </PixelText>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <PixelFrame borderColor="#333" className="p-2" bgColor="#080810">
              <PixelText size="xxs" color={COLORS.textGray} as="div">Nivel</PixelText>
              <PixelText size="lg" color={COLORS.textRed} bold as="div">{level}</PixelText>
            </PixelFrame>
            <PixelFrame borderColor="#333" className="p-2" bgColor="#080810">
              <PixelText size="xxs" color={COLORS.textGray} as="div">Classe</PixelText>
              <PixelText size="xs" color={COLORS.textRed} bold as="div" className="capitalize">{characterClass}</PixelText>
            </PixelFrame>
          </div>

          {/* Create New */}
          <PixelBtn variant="attack" size="md" fullWidth onClick={handleCreateNew} disabled={isDeleting}>
            {isDeleting ? "A PREPARAR..." : "CRIAR NOVO PERSONAGEM"}
          </PixelBtn>

          <PixelText size="xxs" color="#444" as="div" className="mt-2">
            O teu progresso foi perdido permanentemente.
          </PixelText>
        </div>
      </PixelFrame>
    </div>
  );
}
