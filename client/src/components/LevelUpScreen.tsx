import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Sparkles, Star, Wand2, Shield, Swords, Heart, Brain, Zap, Check, X } from "lucide-react";
import { toast } from "sonner";
import { CHARACTER_CLASSES, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL } from "../../../shared/gameConstants";

interface Character {
  id: number;
  name: string;
  characterClass: string;
  level: number;
  subclass?: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  knownSpells?: string[];
}

interface LevelUpScreenProps {
  character: Character;
  newLevel: number;
  onComplete: (choices: {
    attributeIncreases: { [key: string]: number };
    newSpells: string[];
    subclass?: string;
  }) => void;
  onClose: () => void;
}

const ATTRIBUTE_ICONS: Record<string, React.ReactNode> = {
  strength: <Swords className="w-4 h-4" />,
  dexterity: <Zap className="w-4 h-4" />,
  constitution: <Heart className="w-4 h-4" />,
  intelligence: <Brain className="w-4 h-4" />,
  wisdom: <Star className="w-4 h-4" />,
  charisma: <Sparkles className="w-4 h-4" />,
};

const ATTRIBUTE_NAMES: Record<string, string> = {
  strength: "Força",
  dexterity: "Destreza",
  constitution: "Constituição",
  intelligence: "Inteligência",
  wisdom: "Sabedoria",
  charisma: "Carisma",
};

export function LevelUpScreen({ character, newLevel, onComplete, onClose }: LevelUpScreenProps) {
  const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];
  const [attributePoints, setAttributePoints] = useState(2); // 2 points per level up
  const [attributeIncreases, setAttributeIncreases] = useState<{ [key: string]: number }>({});
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);
  const [selectedSubclass, setSelectedSubclass] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("attributes");
  
  const needsSubclass = newLevel === 3 && !character.subclass;
  const canSelectSpells = Boolean(classData?.spellcasting);
  
  // Get available spells for this class
  const availableSpells = Object.entries(SPELLS).filter(([id, spell]) => {
    if (!classData?.spellcasting) return false;
    const spellClasses = spell.classes || [];
    const classMatch = spellClasses.some(c => 
      c.toLowerCase() === character.characterClass.toLowerCase()
    );
    const levelMatch = spell.level <= Math.ceil(newLevel / 2);
    const notKnown = !character.knownSpells?.includes(id);
    return classMatch && levelMatch && notKnown;
  });
  
  // Calculate how many new spells can be learned
  const spellsToLearn = newLevel % 2 === 1 ? 2 : 1; // Odd levels get 2, even get 1
  
  const handleAttributeIncrease = (attr: string) => {
    if (attributePoints <= 0) return;
    
    setAttributeIncreases(prev => ({
      ...prev,
      [attr]: (prev[attr] || 0) + 1,
    }));
    setAttributePoints(prev => prev - 1);
  };
  
  const handleAttributeDecrease = (attr: string) => {
    if (!attributeIncreases[attr] || attributeIncreases[attr] <= 0) return;
    
    setAttributeIncreases(prev => ({
      ...prev,
      [attr]: prev[attr] - 1,
    }));
    setAttributePoints(prev => prev + 1);
  };
  
  const handleSpellToggle = (spellId: string) => {
    if (selectedSpells.includes(spellId)) {
      setSelectedSpells(prev => prev.filter(s => s !== spellId));
    } else if (selectedSpells.length < spellsToLearn) {
      setSelectedSpells(prev => [...prev, spellId]);
    } else {
      toast.error(`Você só pode aprender ${spellsToLearn} magia(s) neste nível!`);
    }
  };
  
  const handleComplete = () => {
    if (needsSubclass && !selectedSubclass) {
      toast.error("Você precisa escolher uma subclasse!");
      setCurrentTab("subclass");
      return;
    }
    
    if (attributePoints > 0) {
      toast.warning("Você ainda tem pontos de atributo para distribuir!");
    }
    
    onComplete({
      attributeIncreases,
      newSpells: selectedSpells,
      subclass: selectedSubclass || undefined,
    });
  };
  
  const getSpellSchoolColor = (school: string) => {
    const colors: Record<string, string> = {
      evocation: "text-red-400",
      abjuration: "text-blue-400",
      conjuration: "text-yellow-400",
      divination: "text-purple-400",
      enchantment: "text-pink-400",
      illusion: "text-indigo-400",
      necromancy: "text-gray-400",
      transmutation: "text-green-400",
    };
    return colors[school.toLowerCase()] || "text-muted-foreground";
  };
  
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl fantasy-card overflow-hidden max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2 bg-gradient-to-r from-accent/30 to-primary/20 text-center">
          <div className="flex justify-center mb-2">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-accent animate-pulse" />
              <span className="absolute -top-2 -right-2 bg-accent text-accent-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold pixel-text">
                {newLevel}
              </span>
            </div>
          </div>
          <CardTitle className="text-2xl pixel-text text-accent">Subiu de Nível!</CardTitle>
          <CardDescription>
            {character.name} alcançou o nível {newLevel}!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attributes" className="pixel-text text-xs">
                Atributos
              </TabsTrigger>
              {canSelectSpells && (
                <TabsTrigger value="spells" className="pixel-text text-xs">
                  Magias
                </TabsTrigger>
              )}
              {needsSubclass && (
                <TabsTrigger value="subclass" className="pixel-text text-xs">
                  Subclasse
                </TabsTrigger>
              )}
            </TabsList>
            
            {/* Attributes Tab */}
            <TabsContent value="attributes" className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Pontos disponíveis: <span className="text-accent font-bold">{attributePoints}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(ATTRIBUTE_NAMES).map(([key, name]) => {
                  const baseValue = character[key as keyof Character] as number;
                  const increase = attributeIncreases[key] || 0;
                  const newValue = baseValue + increase;
                  
                  return (
                    <div
                      key={key}
                      className={cn(
                        "bg-muted/20 rounded-lg p-3 border transition-all",
                        increase > 0 ? "border-accent" : "border-border"
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {ATTRIBUTE_ICONS[key]}
                          <span className="text-sm font-medium">{name}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold pixel-text">{newValue}</span>
                          {increase > 0 && (
                            <span className="text-xs text-accent">+{increase}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleAttributeDecrease(key)}
                          disabled={!increase}
                        >
                          -
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          className="flex-1"
                          onClick={() => handleAttributeIncrease(key)}
                          disabled={attributePoints <= 0}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </TabsContent>
            
            {/* Spells Tab */}
            {canSelectSpells && (
              <TabsContent value="spells" className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  Escolha {spellsToLearn} magia(s): <span className="text-accent font-bold">{selectedSpells.length}/{spellsToLearn}</span>
                </div>
                
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {availableSpells.length === 0 ? (
                    <div className="text-center text-muted-foreground py-4">
                      Nenhuma magia nova disponível para aprender.
                    </div>
                  ) : (
                    availableSpells.map(([id, spell]) => {
                      const isSelected = selectedSpells.includes(id);
                      return (
                        <button
                          key={id}
                          onClick={() => handleSpellToggle(id)}
                          className={cn(
                            "w-full text-left p-3 rounded-lg border transition-all",
                            isSelected
                              ? "bg-accent/20 border-accent"
                              : "bg-muted/20 border-border hover:border-primary/50"
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Wand2 className={cn("w-4 h-4", getSpellSchoolColor(spell.school))} />
                                <span className="font-medium">{spell.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {spell.level === 0 ? "Cantrip" : `Nível ${spell.level}`}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {spell.description}
                              </p>
                              <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                                <span>{spell.school}</span>
                                {spell.damage && <span>• Dano: {spell.damage.dice}</span>}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-accent flex-shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </TabsContent>
            )}
            
            {/* Subclass Tab */}
            {needsSubclass && (
              <TabsContent value="subclass" className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  No nível 3, você escolhe sua especialização!
                </div>
                
                <div className="space-y-2">
                  {classData?.subclasses && Object.entries(classData.subclasses).map(([subclassId, subclass]) => {
                    const isSelected = selectedSubclass === subclassId;
                    return (
                      <button
                        key={subclassId}
                        onClick={() => setSelectedSubclass(subclassId)}
                        className={cn(
                          "w-full text-left p-4 rounded-lg border transition-all",
                          isSelected
                            ? "bg-accent/20 border-accent"
                            : "bg-muted/20 border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Shield className="w-5 h-5 text-primary" />
                              <span className="font-bold pixel-text">{subclass.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {subclass.description}
                            </p>
                            
                          </div>
                          {isSelected && (
                            <Check className="w-6 h-6 text-accent flex-shrink-0" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </TabsContent>
            )}
          </Tabs>
          
          {/* Summary */}
          <div className="bg-muted/20 rounded-lg p-3 border border-border">
            <h4 className="text-sm font-semibold mb-2">Resumo das Escolhas:</h4>
            <div className="text-xs space-y-1 text-muted-foreground">
              {Object.entries(attributeIncreases).filter(([_, v]) => v > 0).map(([attr, val]) => (
                <div key={attr}>+{val} {ATTRIBUTE_NAMES[attr]}</div>
              ))}
              {selectedSpells.length > 0 && (
                <div>Novas magias: {selectedSpells.map(s => SPELLS[s]?.name).join(", ")}</div>
              )}
              {selectedSubclass && (
                <div>Subclasse: {selectedSubclass && classData?.subclasses && (classData.subclasses as Record<string, { name: string; description: string }>)[selectedSubclass]?.name}</div>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              <X className="w-4 h-4 mr-2" /> Cancelar
            </Button>
            <Button onClick={handleComplete} className="flex-1 pixel-text">
              <Check className="w-4 h-4 mr-2" /> Confirmar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
