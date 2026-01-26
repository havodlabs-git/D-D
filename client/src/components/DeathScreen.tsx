import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skull, Swords, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface DeathScreenProps {
  characterName: string;
  characterClass: string;
  level: number;
  deathCause?: string;
  onCreateNew: () => void;
}

export function DeathScreen({ 
  characterName, 
  characterClass, 
  level, 
  deathCause,
  onCreateNew 
}: DeathScreenProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  
  const deleteCharacter = trpc.character.deleteDeadCharacter.useMutation({
    onSuccess: () => {
      onCreateNew();
    },
  });

  const handleCreateNew = () => {
    setIsDeleting(true);
    deleteCharacter.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <Card className="max-w-md w-full bg-card/90 border-destructive/50 text-center">
        <CardHeader>
          <div className="mx-auto mb-4">
            <Skull className="w-24 h-24 text-destructive animate-pulse" />
          </div>
          <CardTitle className="text-3xl text-destructive font-bold">
            VOCÊ MORREU
          </CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Permadeath - Seu personagem foi perdido para sempre
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Character Info */}
          <div className="bg-black/50 rounded-lg p-4 border border-destructive/30">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Swords className="w-5 h-5 text-primary" />
              <span className="text-xl font-bold text-white">{characterName}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {characterClass.charAt(0).toUpperCase() + characterClass.slice(1)} - Nível {level}
            </div>
            {deathCause && (
              <div className="mt-3 text-sm text-destructive/80 italic">
                "{deathCause}"
              </div>
            )}
          </div>

          {/* Memorial Message */}
          <div className="text-sm text-muted-foreground italic">
            "Os mais bravos guerreiros caem, mas suas lendas vivem para sempre..."
          </div>

          {/* Stats Summary */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-black/30 rounded p-2">
              <div className="text-muted-foreground">Nível Alcançado</div>
              <div className="text-xl font-bold text-primary">{level}</div>
            </div>
            <div className="bg-black/30 rounded p-2">
              <div className="text-muted-foreground">Classe</div>
              <div className="text-xl font-bold text-primary capitalize">{characterClass}</div>
            </div>
          </div>

          {/* Create New Button */}
          <Button
            onClick={handleCreateNew}
            disabled={isDeleting}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                Preparando...
              </>
            ) : (
              <>
                <RefreshCw className="w-5 h-5 mr-2" />
                Criar Novo Personagem
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground">
            Seu progresso anterior foi perdido permanentemente.
            Crie um novo herói e comece uma nova jornada!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
