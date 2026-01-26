import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Sword, Wand2, Scissors, Heart, Target, Shield, Hammer, Music } from "lucide-react";
import { toast } from "sonner";

const CLASS_ICONS: Record<string, React.ReactNode> = {
  warrior: <Sword className="w-8 h-8" />,
  mage: <Wand2 className="w-8 h-8" />,
  rogue: <Scissors className="w-8 h-8" />,
  cleric: <Heart className="w-8 h-8" />,
  ranger: <Target className="w-8 h-8" />,
  paladin: <Shield className="w-8 h-8" />,
  barbarian: <Hammer className="w-8 h-8" />,
  bard: <Music className="w-8 h-8" />,
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
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">
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
              <CardTitle>Nome do Herói</CardTitle>
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
              <CardTitle>Escolha sua Classe</CardTitle>
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
                      "p-4 rounded-lg border-2 transition-all duration-200 text-left",
                      "hover:border-primary/50 hover:bg-primary/5",
                      selectedClass === cls.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    )}
                  >
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className={cn(
                        "p-3 rounded-full",
                        selectedClass === cls.id ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        {CLASS_ICONS[cls.id]}
                      </div>
                      <span className="font-semibold">{cls.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Selected Class Details */}
          {selectedClassData && (
            <Card className="fantasy-card border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary text-primary-foreground">
                    {CLASS_ICONS[selectedClassData.id]}
                  </div>
                  {selectedClassData.name}
                </CardTitle>
                <CardDescription>{selectedClassData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">FORÇA</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.strength}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">DESTREZA</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.dexterity}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CONSTITUIÇÃO</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.constitution}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">INTELIGÊNCIA</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.intelligence}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">SABEDORIA</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.wisdom}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">CARISMA</Label>
                    <div className="text-2xl font-bold text-primary">
                      {selectedClassData.baseStats.charisma}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">VIDA POR NÍVEL</Label>
                    <div className="text-lg font-semibold text-destructive">
                      +{selectedClassData.healthPerLevel} HP
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">MANA POR NÍVEL</Label>
                    <div className="text-lg font-semibold text-blue-400">
                      +{selectedClassData.manaPerLevel} MP
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
            className="w-full text-lg h-14"
            disabled={!name.trim() || !selectedClass || createCharacter.isPending}
          >
            {createCharacter.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Criando Personagem...
              </>
            ) : (
              "Começar Aventura"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
