import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// Pixel art sprites for each class
const CLASS_SPRITES: Record<string, string> = {
  warrior: "/sprites/classes/warrior.png",
  mage: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
};

interface CharacterCreationProps {
  onCharacterCreated: () => void;
}

export function CharacterCreation({ onCharacterCreated }: CharacterCreationProps) {
  const [name, setName] = useState("");
  const [selectedClass, setSelectedClass] = useState<string | null>(null);

  const { data: classes, isLoading: isLoadingClasses } = trpc.character.getClasses.useQuery();
  const createCharacter = trpc.character.create.useMutation({
    onSuccess: () => {
      toast.success("Personagem criado com sucesso!");
      onCharacterCreated();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar personagem");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Digite um nome para seu personagem");
      return;
    }
    
    if (!selectedClass) {
      toast.error("Selecione uma classe");
      return;
    }

    createCharacter.mutate({
      name: name.trim(),
      characterClass: selectedClass as any,
    });
  };

  const selectedClassData = classes?.find((c) => c.id === selectedClass);

  if (isLoadingClasses) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src="/sprites/ui/d20.png" alt="Loading" className="w-16 h-16 animate-bounce pixelated" />
          <span className="text-primary font-bold">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <img src="/sprites/ui/d20.png" alt="D20" className="w-16 h-16 mx-auto mb-4 pixelated animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 pixel-text">
            Criar Personagem
          </h1>
          <p className="text-muted-foreground">
            Escolha seu nome e classe para começar sua aventura
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Name Input */}
          <Card className="fantasy-card">
            <CardHeader>
              <CardTitle className="pixel-text">Nome do Herói</CardTitle>
              <CardDescription>
                Como você será conhecido nas terras de aventura?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Digite o nome do seu personagem"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
                className="text-lg"
              />
            </CardContent>
          </Card>

          {/* Class Selection */}
          <Card className="fantasy-card">
            <CardHeader>
              <CardTitle className="pixel-text">Escolha sua Classe</CardTitle>
              <CardDescription>
                Cada classe possui habilidades e atributos únicos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {classes?.map((cls) => (
                  <button
                    key={cls.id}
                    type="button"
                    onClick={() => setSelectedClass(cls.id)}
                    className={cn(
                      "p-4 rounded-lg border-2 transition-all duration-200 text-left group",
                      "hover:border-primary/50 hover:bg-primary/5 hover:scale-105",
                      selectedClass === cls.id
                        ? "border-primary bg-primary/10 scale-105"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={cn(
                        "relative w-20 h-20 flex items-center justify-center",
                        "transition-transform group-hover:scale-110"
                      )}>
                        <img 
                          src={CLASS_SPRITES[cls.id]} 
                          alt={cls.name}
                          className="w-full h-full object-contain pixelated drop-shadow-lg"
                        />
                        {selectedClass === cls.id && (
                          <div className="absolute inset-0 bg-primary/20 rounded-lg animate-pulse" />
                        )}
                      </div>
                      <span className="font-semibold pixel-text text-sm">{cls.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Class Details */}
          {selectedClassData && (
            <Card className="fantasy-card border-primary/50 overflow-hidden">
              <CardHeader className="relative">
                <div className="absolute top-0 right-0 w-32 h-32 opacity-20">
                  <img 
                    src={CLASS_SPRITES[selectedClassData.id]} 
                    alt={selectedClassData.name}
                    className="w-full h-full object-contain pixelated"
                  />
                </div>
                <CardTitle className="flex items-center gap-4 pixel-text">
                  <div className="w-16 h-16 flex items-center justify-center">
                    <img 
                      src={CLASS_SPRITES[selectedClassData.id]} 
                      alt={selectedClassData.name}
                      className="w-full h-full object-contain pixelated drop-shadow-lg"
                    />
                  </div>
                  {selectedClassData.name}
                </CardTitle>
                <CardDescription>{selectedClassData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">FORÇA</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.strength}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">DESTREZA</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.dexterity}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">CONSTITUIÇÃO</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.constitution}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">INTELIGÊNCIA</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.intelligence}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">SABEDORIA</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.wisdom}
                    </div>
                  </div>
                  <div className="space-y-1 p-2 rounded bg-card/50">
                    <Label className="text-xs text-muted-foreground">CARISMA</Label>
                    <div className="text-2xl font-bold text-primary pixel-text">
                      {selectedClassData.baseStats.charisma}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <img src="/sprites/ui/heart.png" alt="HP" className="w-8 h-8 pixelated" />
                    <div>
                      <Label className="text-xs text-muted-foreground">VIDA POR NÍVEL</Label>
                      <div className="text-lg font-semibold text-destructive pixel-text">
                        +{selectedClassData.healthPerLevel} HP
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <img src="/sprites/ui/mana.png" alt="MP" className="w-8 h-8 pixelated" />
                    <div>
                      <Label className="text-xs text-muted-foreground">MANA POR NÍVEL</Label>
                      <div className="text-lg font-semibold text-blue-400 pixel-text">
                        +{selectedClassData.manaPerLevel} MP
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg h-14 pixel-text"
            disabled={!name.trim() || !selectedClass || createCharacter.isPending}
          >
            {createCharacter.isPending ? (
              <>
                <img src="/sprites/ui/d20.png" alt="Loading" className="w-6 h-6 mr-2 animate-spin pixelated" />
                Criando Personagem...
              </>
            ) : (
              "⚔️ Começar Aventura ⚔️"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
