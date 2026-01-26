import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Sword, Wand2, Skull, Cross, Trees, Shield, Axe, Music, Leaf, Hand, Sparkles, Moon } from "lucide-react";
import { toast } from "sonner";

// Pixel art sprites for each class (D&D 5e 2024)
const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/cleric.png", // Use cleric sprite for now
  monk: "/sprites/classes/rogue.png", // Use rogue sprite for now
  sorcerer: "/sprites/classes/mage.png", // Use mage sprite for now
  warlock: "/sprites/classes/mage.png", // Use mage sprite for now
};

// Class icons
const CLASS_ICONS: Record<string, React.ReactNode> = {
  fighter: <Sword className="w-5 h-5" />,
  wizard: <Wand2 className="w-5 h-5" />,
  rogue: <Skull className="w-5 h-5" />,
  cleric: <Cross className="w-5 h-5" />,
  ranger: <Trees className="w-5 h-5" />,
  paladin: <Shield className="w-5 h-5" />,
  barbarian: <Axe className="w-5 h-5" />,
  bard: <Music className="w-5 h-5" />,
  druid: <Leaf className="w-5 h-5" />,
  monk: <Hand className="w-5 h-5" />,
  sorcerer: <Sparkles className="w-5 h-5" />,
  warlock: <Moon className="w-5 h-5" />,
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
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <img src="/sprites/ui/d20.png" alt="D20" className="w-16 h-16 mx-auto mb-4 pixelated animate-pulse" />
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2 pixel-text">
            Criar Personagem
          </h1>
          <p className="text-muted-foreground">
            Escolha sua classe e comece sua aventura no mundo de D&D
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Character Name */}
          <Card className="pixel-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">📜</span>
                Nome do Personagem
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Digite o nome do seu herói..."
                className="text-lg pixel-border"
                maxLength={50}
              />
            </CardContent>
          </Card>

          {/* Class Selection */}
          <Card className="pixel-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-primary">⚔️</span>
                Escolha sua Classe (D&D 5e 2024)
              </CardTitle>
              <CardDescription>
                Cada classe possui habilidades únicas, magias e estilos de combate diferentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {classes?.map((classData) => (
                  <button
                    key={classData.id}
                    type="button"
                    onClick={() => setSelectedClass(classData.id)}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105",
                      "flex flex-col items-center gap-2 text-center",
                      selectedClass === classData.id
                        ? "border-primary bg-primary/20 shadow-lg shadow-primary/30"
                        : "border-border bg-card hover:border-primary/50 hover:bg-primary/10"
                    )}
                  >
                    {/* Class Sprite */}
                    <div className="relative">
                      <img
                        src={CLASS_SPRITES[classData.id] || "/sprites/classes/warrior.png"}
                        alt={classData.name}
                        className="w-12 h-12 pixelated"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/sprites/classes/warrior.png";
                        }}
                      />
                      {selectedClass === classData.id && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Class Icon & Name */}
                    <div className="flex items-center gap-1">
                      {CLASS_ICONS[classData.id]}
                      <span className="font-bold text-sm">{classData.name}</span>
                    </div>
                    
                    {/* Hit Dice */}
                    <span className="text-xs text-muted-foreground">
                      {classData.hitDice}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Class Details */}
          {selectedClassData && (
            <Card className="pixel-border border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <img
                    src={CLASS_SPRITES[selectedClassData.id] || "/sprites/classes/warrior.png"}
                    alt={selectedClassData.name}
                    className="w-12 h-12 pixelated"
                  />
                  <div>
                    <span className="text-primary">{selectedClassData.name}</span>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedClassData.hitDice} • {selectedClassData.primaryAbility}
                    </p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-foreground">{selectedClassData.description}</p>
                
                {/* Base Stats */}
                <div>
                  <h4 className="font-bold mb-2 text-sm text-muted-foreground">Atributos Base:</h4>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {Object.entries(selectedClassData.baseStats).map(([stat, value]) => (
                      <div
                        key={stat}
                        className="bg-background/50 rounded p-2 text-center pixel-border"
                      >
                        <div className="text-xs text-muted-foreground uppercase">
                          {stat.slice(0, 3)}
                        </div>
                        <div className="font-bold text-primary">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Spellcasting Info */}
                {'spellcastingAbility' in selectedClassData && selectedClassData.spellcastingAbility && (
                  <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                    <h4 className="font-bold mb-1 text-purple-400 flex items-center gap-2">
                      <Wand2 className="w-4 h-4" />
                      Conjuração de Magias
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Habilidade: <span className="text-purple-400">{String(selectedClassData.spellcastingAbility)}</span>
                      {'cantripsKnown' in selectedClassData && (selectedClassData as any).cantripsKnown && (
                        <> • Truques: <span className="text-purple-400">{String((selectedClassData as any).cantripsKnown)}</span></>
                      )}
                    </p>
                  </div>
                )}

                {/* Saving Throws */}
                <div>
                  <h4 className="font-bold mb-2 text-sm text-muted-foreground">Testes de Resistência:</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedClassData.savingThrows.map((save) => (
                      <span
                        key={save}
                        className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-medium"
                      >
                        {save}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full text-lg pixel-border"
            disabled={!name.trim() || !selectedClass || createCharacter.isPending}
          >
            {createCharacter.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Criando Personagem...
              </>
            ) : (
              <>
                <img src="/sprites/ui/d20.png" alt="" className="w-6 h-6 mr-2 pixelated" />
                Começar Aventura
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
