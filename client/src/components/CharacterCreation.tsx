import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2, Sword, Wand2, Skull, Cross, Trees, Shield, Axe, Music, Leaf, Hand, Sparkles, Moon, ChevronLeft, ChevronRight, Check, Dice6, Plus, Minus } from "lucide-react";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RACES, 
  BACKGROUNDS, 
  SKILLS, 
  CHARACTER_CLASSES, 
  SPELLS,
  ATTRIBUTES,
  type Race,
  type Background,
  type Skill,
  type CharacterClass
} from "@shared/gameConstants";

// Pixel art sprites for each class - All unique sprites
const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png",
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

// Race icons
const RACE_ICONS: Record<string, string> = {
  human: "👤",
  elf: "🧝",
  dwarf: "⛏️",
  halfling: "🍀",
  halfelf: "🌓",
  halforc: "💪",
  tiefling: "😈",
  dragonborn: "🐉",
  gnome: "🔧",
};

interface CharacterCreationProps {
  onCharacterCreated: () => void;
}

type CreationStep = "race" | "class" | "attributes" | "background" | "skills" | "spells" | "summary";

const STEPS: { id: CreationStep; title: string }[] = [
  { id: "race", title: "Raça" },
  { id: "class", title: "Classe" },
  { id: "attributes", title: "Atributos" },
  { id: "background", title: "Antecedente" },
  { id: "skills", title: "Perícias" },
  { id: "spells", title: "Magias" },
  { id: "summary", title: "Resumo" },
];

// Point buy costs
const POINT_BUY_COSTS: Record<number, number> = {
  8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9
};

export function CharacterCreation({ onCharacterCreated }: CharacterCreationProps) {
  const [currentStep, setCurrentStep] = useState<CreationStep>("race");
  const [name, setName] = useState("");
  const [selectedRace, setSelectedRace] = useState<Race | null>(null);
  const [selectedSubrace, setSelectedSubrace] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<Background | null>(null);
  const [attributes, setAttributes] = useState({
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
  });
  const [selectedSkills, setSelectedSkills] = useState<Skill[]>([]);
  const [selectedCantrips, setSelectedCantrips] = useState<string[]>([]);
  const [selectedSpells, setSelectedSpells] = useState<string[]>([]);

  const createCharacter = trpc.character.create.useMutation({
    onSuccess: () => {
      toast.success("Personagem criado com sucesso!");
      onCharacterCreated();
    },
    onError: (error) => {
      toast.error(error.message || "Erro ao criar personagem");
    },
  });

  // Calculate point buy points used
  const pointsUsed = useMemo(() => {
    return Object.values(attributes).reduce((total, val) => total + (POINT_BUY_COSTS[val] || 0), 0);
  }, [attributes]);

  const pointsRemaining = 27 - pointsUsed;

  // Get available cantrips and spells for selected class
  const availableCantrips = useMemo(() => {
    if (!selectedClass) return [];
    return Object.values(SPELLS).filter(
      spell => spell.level === 0 && spell.classes.includes(selectedClass)
    );
  }, [selectedClass]);

  const availableSpells = useMemo(() => {
    if (!selectedClass) return [];
    return Object.values(SPELLS).filter(
      spell => spell.level === 1 && spell.classes.includes(selectedClass)
    );
  }, [selectedClass]);

  // Check if class can cast spells
  const canCastSpells = useMemo(() => {
    if (!selectedClass) return false;
    const classData = CHARACTER_CLASSES[selectedClass];
    return classData.spellcasting !== false;
  }, [selectedClass]);

  // Get number of cantrips and spells known at level 1
  const cantripsKnown = useMemo(() => {
    if (!selectedClass || !canCastSpells) return 0;
    const classData = CHARACTER_CLASSES[selectedClass] as any;
    if (typeof classData.spellcasting === 'object' && 'cantripsKnown' in classData.spellcasting) {
      return classData.spellcasting.cantripsKnown || 0;
    }
    return 2; // Default
  }, [selectedClass, canCastSpells]);

  const spellsKnown = useMemo(() => {
    if (!selectedClass || !canCastSpells) return 0;
    const classData = CHARACTER_CLASSES[selectedClass] as any;
    if (typeof classData.spellcasting === 'object' && 'spellsKnown' in classData.spellcasting) {
      return classData.spellcasting.spellsKnown || 0;
    }
    return 2; // Default
  }, [selectedClass, canCastSpells]);

  // Get skill proficiencies from class and background
  const skillsFromBackground = useMemo((): string[] => {
    if (!selectedBackground) return [];
    return [...(BACKGROUNDS[selectedBackground].skillProficiencies || [])] as string[];
  }, [selectedBackground]);

  const skillChoicesFromClass = useMemo(() => {
    if (!selectedClass) return 0;
    return 2; // Most classes get 2 skill choices
  }, [selectedClass]);

  // Navigation
  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100;

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case "race": return selectedRace !== null;
      case "class": return selectedClass !== null;
      case "attributes": return pointsRemaining >= 0;
      case "background": return selectedBackground !== null;
      case "skills": return selectedSkills.length >= skillChoicesFromClass;
      case "spells": return !canCastSpells || (selectedCantrips.length >= cantripsKnown && selectedSpells.length >= spellsKnown);
      case "summary": return name.trim().length > 0;
      default: return true;
    }
  }, [currentStep, selectedRace, selectedClass, pointsRemaining, selectedBackground, selectedSkills, skillChoicesFromClass, canCastSpells, selectedCantrips, cantripsKnown, selectedSpells, spellsKnown, name]);

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      // Skip spells step if class can't cast
      if (STEPS[nextIndex].id === "spells" && !canCastSpells) {
        setCurrentStep("summary");
      } else {
        setCurrentStep(STEPS[nextIndex].id);
      }
    }
  };

  const goPrev = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      // Skip spells step if class can't cast
      if (STEPS[prevIndex].id === "spells" && !canCastSpells) {
        setCurrentStep("skills");
      } else {
        setCurrentStep(STEPS[prevIndex].id);
      }
    }
  };

  const handleAttributeChange = (attr: keyof typeof attributes, delta: number) => {
    const newValue = attributes[attr] + delta;
    if (newValue >= 8 && newValue <= 15) {
      const newCost = POINT_BUY_COSTS[newValue] - POINT_BUY_COSTS[attributes[attr]];
      if (pointsRemaining - newCost >= 0 || delta < 0) {
        setAttributes(prev => ({ ...prev, [attr]: newValue }));
      }
    }
  };

  const rollAttributes = () => {
    const rollStat = () => {
      const rolls = [1,2,3,4].map(() => Math.floor(Math.random() * 6) + 1);
      rolls.sort((a, b) => b - a);
      return rolls[0] + rolls[1] + rolls[2]; // Sum of 3 highest
    };
    setAttributes({
      strength: rollStat(),
      dexterity: rollStat(),
      constitution: rollStat(),
      intelligence: rollStat(),
      wisdom: rollStat(),
      charisma: rollStat(),
    });
  };

  const toggleSkill = (skill: Skill) => {
    if (selectedSkills.includes(skill)) {
      setSelectedSkills(prev => prev.filter(s => s !== skill));
    } else if (selectedSkills.length < skillChoicesFromClass) {
      setSelectedSkills(prev => [...prev, skill]);
    }
  };

  const toggleCantrip = (spellId: string) => {
    if (selectedCantrips.includes(spellId)) {
      setSelectedCantrips(prev => prev.filter(s => s !== spellId));
    } else if (selectedCantrips.length < cantripsKnown) {
      setSelectedCantrips(prev => [...prev, spellId]);
    }
  };

  const toggleSpell = (spellId: string) => {
    if (selectedSpells.includes(spellId)) {
      setSelectedSpells(prev => prev.filter(s => s !== spellId));
    } else if (selectedSpells.length < spellsKnown) {
      setSelectedSpells(prev => [...prev, spellId]);
    }
  };

  const handleSubmit = () => {
    console.log('[DEBUG] handleSubmit called', { name, selectedClass, selectedRace, selectedBackground });
    if (!name.trim() || !selectedClass || !selectedRace || !selectedBackground) {
      console.log('[DEBUG] Validation failed', { name: !name.trim(), class: !selectedClass, race: !selectedRace, bg: !selectedBackground });
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    console.log('[DEBUG] Calling createCharacter.mutate');
    createCharacter.mutate({
      name: name.trim(),
      characterClass: selectedClass,
    });
  };

  const getModifier = (value: number) => {
    const mod = Math.floor((value - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <img src="/sprites/ui/d20.png" alt="D20" className="w-12 h-12 mx-auto mb-2 pixelated animate-pulse" />
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2 pixel-text">
            Criar Personagem
          </h1>
          <p className="text-muted-foreground">Estilo Baldur's Gate</p>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => i <= currentStepIndex && setCurrentStep(step.id)}
                className={cn(
                  "text-xs md:text-sm font-medium transition-colors",
                  i === currentStepIndex ? "text-primary" : i < currentStepIndex ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {i < currentStepIndex && <Check className="w-3 h-3 inline mr-1" />}
                {step.title}
              </button>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Content */}
        <Card className="border-2 border-primary/20">
          <CardContent className="p-6">
            {/* STEP: Race */}
            {currentStep === "race" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Escolha sua Raça</h2>
                <p className="text-muted-foreground mb-6">Cada raça oferece bônus únicos de atributos e habilidades raciais.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(RACES) as [Race, typeof RACES[Race]][]).map(([id, race]) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedRace(id); setSelectedSubrace(null); }}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        selectedRace === id 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{RACE_ICONS[id]}</span>
                        <span className="font-bold">{race.name}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{race.description}</p>
                      <div className="mt-2 text-xs">
                        <span className="text-green-500">Velocidade: {race.speed}ft</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Subrace selection */}
                {selectedRace && 'subraces' in RACES[selectedRace] && (RACES[selectedRace] as any).subraces && (
                  <div className="mt-6">
                    <h3 className="text-lg font-bold mb-3">Escolha sua Sub-raça</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {Object.entries((RACES[selectedRace] as any).subraces).map(([id, subrace]: [string, any]) => (
                        <button
                          key={id}
                          onClick={() => setSelectedSubrace(id)}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all text-left",
                            selectedSubrace === id 
                              ? "border-primary bg-primary/10" 
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="font-bold">{subrace.name}</span>
                          <div className="text-xs text-muted-foreground mt-1">
                            {subrace.traits?.join(", ")}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Race details */}
                {selectedRace && (
                  <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
                    <h3 className="font-bold mb-2">Traços Raciais</h3>
                    <ul className="text-sm space-y-1">
                      {RACES[selectedRace].traits.map((trait, i) => (
                        <li key={i} className="text-muted-foreground">• {trait}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Idiomas: </span>
                      <span>{RACES[selectedRace].languages.join(", ")}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Class */}
            {currentStep === "class" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Escolha sua Classe</h2>
                <p className="text-muted-foreground mb-6">Sua classe define suas habilidades de combate e magias.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {(Object.entries(CHARACTER_CLASSES) as [CharacterClass, typeof CHARACTER_CLASSES[CharacterClass]][]).map(([id, classData]) => (
                    <button
                      key={id}
                      onClick={() => { setSelectedClass(id); setSelectedCantrips([]); setSelectedSpells([]); }}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        selectedClass === id 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img 
                          src={CLASS_SPRITES[id]} 
                          alt={classData.name}
                          className="w-10 h-10 pixelated"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            {CLASS_ICONS[id]}
                            <span className="font-bold">{classData.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">d{classData.hitDice}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{classData.description}</p>
                    </button>
                  ))}
                </div>

                {/* Class details */}
                {selectedClass && (
                  <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
                    <h3 className="font-bold mb-2">{CHARACTER_CLASSES[selectedClass].name}</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Dado de Vida: </span>
                        <span className="text-primary font-bold">d{CHARACTER_CLASSES[selectedClass].hitDice}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Atributo Principal: </span>
                        <span className="text-primary font-bold">{CHARACTER_CLASSES[selectedClass].primaryAbility}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Conjuração: </span>
                        <span className={CHARACTER_CLASSES[selectedClass].spellcasting ? "text-green-500" : "text-red-500"}>
                          {CHARACTER_CLASSES[selectedClass].spellcasting ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Subclasses preview */}
                    <div className="mt-4">
                      <h4 className="font-bold text-sm mb-2">Subclasses (Nível 3)</h4>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(CHARACTER_CLASSES[selectedClass].subclasses).map(([id, sub]: [string, any]) => (
                          <span key={id} className="px-2 py-1 bg-primary/20 rounded text-xs">
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Attributes */}
            {currentStep === "attributes" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Distribua seus Atributos</h2>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-muted-foreground">Use Point Buy ou role os dados.</p>
                  <div className="flex items-center gap-4">
                    <span className={cn("font-bold", pointsRemaining < 0 ? "text-red-500" : "text-green-500")}>
                      Pontos: {pointsRemaining}/27
                    </span>
                    <Button variant="outline" size="sm" onClick={rollAttributes}>
                      <Dice6 className="w-4 h-4 mr-2" />
                      Rolar 4d6
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(ATTRIBUTES) as [keyof typeof attributes, typeof ATTRIBUTES[keyof typeof ATTRIBUTES]][]).map(([id, attr]) => (
                    <div key={id} className="p-4 rounded-lg border-2 border-border">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">{attr.name}</span>
                        <span className="text-xs text-muted-foreground">{attr.abbr}</span>
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleAttributeChange(id, -1)}
                          disabled={attributes[id] <= 8}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="text-center">
                          <span className="text-3xl font-bold">{attributes[id]}</span>
                          <div className="text-sm text-primary">{getModifier(attributes[id])}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleAttributeChange(id, 1)}
                          disabled={attributes[id] >= 15 || pointsRemaining <= 0}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center mt-2">{attr.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* STEP: Background */}
            {currentStep === "background" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Escolha seu Antecedente</h2>
                <p className="text-muted-foreground mb-6">Seu antecedente define sua história e concede proficiências.</p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {(Object.entries(BACKGROUNDS) as [Background, typeof BACKGROUNDS[Background]][]).map(([id, bg]) => (
                    <button
                      key={id}
                      onClick={() => setSelectedBackground(id)}
                      className={cn(
                        "p-4 rounded-lg border-2 transition-all text-left",
                        selectedBackground === id 
                          ? "border-primary bg-primary/10" 
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <span className="font-bold block mb-1">{bg.name}</span>
                      <p className="text-xs text-muted-foreground line-clamp-2">{bg.description}</p>
                      <div className="mt-2 text-xs text-green-500">
                        Perícias: {bg.skillProficiencies.map(s => SKILLS[s as Skill]?.name || s).join(", ")}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Background details */}
                {selectedBackground && (
                  <div className="mt-6 p-4 bg-secondary/20 rounded-lg">
                    <h3 className="font-bold mb-2">{BACKGROUNDS[selectedBackground].name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{BACKGROUNDS[selectedBackground].description}</p>
                    <div className="text-sm">
                      <p><span className="text-muted-foreground">Característica: </span>{BACKGROUNDS[selectedBackground].feature}</p>
                      <p className="mt-2"><span className="text-muted-foreground">Equipamento: </span>{BACKGROUNDS[selectedBackground].equipment.join(", ")}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP: Skills */}
            {currentStep === "skills" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Escolha suas Perícias</h2>
                <p className="text-muted-foreground mb-2">
                  Selecione {skillChoicesFromClass} perícias adicionais para seu personagem.
                </p>
                <p className="text-sm text-green-500 mb-6">
                  Perícias do antecedente: {skillsFromBackground.map(s => SKILLS[s as Skill]?.name || s).join(", ")}
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(Object.entries(SKILLS) as [Skill, typeof SKILLS[Skill]][]).map(([id, skill]) => {
                    const fromBackground = skillsFromBackground.includes(id);
                    const isSelected = selectedSkills.includes(id);
                    
                    return (
                      <button
                        key={id}
                        onClick={() => !fromBackground && toggleSkill(id)}
                        disabled={fromBackground}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all text-left",
                          fromBackground 
                            ? "border-green-500 bg-green-500/10 cursor-not-allowed"
                            : isSelected 
                              ? "border-primary bg-primary/10" 
                              : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm">{skill.name}</span>
                          <span className="text-xs text-muted-foreground">{ATTRIBUTES[skill.ability as keyof typeof ATTRIBUTES]?.abbr}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{skill.description}</p>
                        {fromBackground && <span className="text-xs text-green-500">Do antecedente</span>}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 text-center">
                  <span className={cn("font-bold", selectedSkills.length >= skillChoicesFromClass ? "text-green-500" : "text-yellow-500")}>
                    Selecionadas: {selectedSkills.length}/{skillChoicesFromClass}
                  </span>
                </div>
              </div>
            )}

            {/* STEP: Spells */}
            {currentStep === "spells" && canCastSpells && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Escolha suas Magias</h2>
                <p className="text-muted-foreground mb-6">
                  Selecione {cantripsKnown} cantrips e {spellsKnown} magias de 1º nível.
                </p>
                
                <Tabs defaultValue="cantrips">
                  <TabsList className="mb-4">
                    <TabsTrigger value="cantrips">
                      Cantrips ({selectedCantrips.length}/{cantripsKnown})
                    </TabsTrigger>
                    <TabsTrigger value="spells">
                      Magias 1º Nível ({selectedSpells.length}/{spellsKnown})
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="cantrips">
                    <ScrollArea className="h-[400px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableCantrips.map(spell => (
                          <button
                            key={spell.id}
                            onClick={() => toggleCantrip(spell.id)}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all text-left",
                              selectedCantrips.includes(spell.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold">{spell.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">{spell.school}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{spell.description}</p>
                            {spell.damage && (
                              <span className="text-xs text-red-500 mt-1 block">Dano: {spell.damage.dice} {spell.damage.type}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="spells">
                    <ScrollArea className="h-[400px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {availableSpells.map(spell => (
                          <button
                            key={spell.id}
                            onClick={() => toggleSpell(spell.id)}
                            className={cn(
                              "p-3 rounded-lg border-2 transition-all text-left",
                              selectedSpells.includes(spell.id)
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <div className="flex justify-between items-center mb-1">
                              <span className="font-bold">{spell.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-secondary rounded">{spell.school}</span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{spell.description}</p>
                            {spell.damage && (
                              <span className="text-xs text-red-500 mt-1 block">Dano: {spell.damage.dice} {spell.damage.type}</span>
                            )}
                            {(spell as any).healing && (
                              <span className="text-xs text-green-500 mt-1 block">Cura: {(spell as any).healing.dice}</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* STEP: Summary */}
            {currentStep === "summary" && (
              <div>
                <h2 className="text-2xl font-bold mb-4">Resumo do Personagem</h2>
                
                <div className="mb-6">
                  <Label htmlFor="name">Nome do Personagem</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Digite o nome do seu herói"
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Character preview */}
                  <div className="p-4 bg-secondary/20 rounded-lg">
                    <div className="flex items-center gap-4 mb-4">
                      {selectedClass && (
                        <img 
                          src={CLASS_SPRITES[selectedClass]} 
                          alt={selectedClass}
                          className="w-20 h-20 pixelated"
                        />
                      )}
                      <div>
                        <h3 className="text-xl font-bold">{name || "Sem Nome"}</h3>
                        <p className="text-muted-foreground">
                          {selectedRace && RACES[selectedRace].name} {selectedClass && CHARACTER_CLASSES[selectedClass].name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {selectedBackground && BACKGROUNDS[selectedBackground].name}
                        </p>
                      </div>
                    </div>
                    
                    {/* Attributes */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {Object.entries(attributes).map(([key, value]) => (
                        <div key={key} className="p-2 bg-background rounded">
                          <div className="text-xs text-muted-foreground">{ATTRIBUTES[key as keyof typeof ATTRIBUTES].abbr}</div>
                          <div className="font-bold">{value}</div>
                          <div className="text-xs text-primary">{getModifier(value)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Skills and Spells */}
                  <div className="space-y-4">
                    <div className="p-4 bg-secondary/20 rounded-lg">
                      <h4 className="font-bold mb-2">Perícias</h4>
                      <div className="flex flex-wrap gap-2">
                        {[...skillsFromBackground, ...selectedSkills].map((skill, idx) => (
                          <span key={`${skill}-${idx}`} className="px-2 py-1 bg-primary/20 rounded text-xs">
                            {SKILLS[skill as Skill]?.name || skill}
                          </span>
                        ))}
                      </div>
                    </div>

                    {canCastSpells && (
                      <div className="p-4 bg-secondary/20 rounded-lg">
                        <h4 className="font-bold mb-2">Magias</h4>
                        <div className="space-y-2">
                          <div>
                            <span className="text-xs text-muted-foreground">Cantrips: </span>
                            {selectedCantrips.map(id => SPELLS[id]?.name).join(", ") || "Nenhum"}
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">1º Nível: </span>
                            {selectedSpells.map(id => SPELLS[id]?.name).join(", ") || "Nenhuma"}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8">
              <Button
                variant="outline"
                onClick={goPrev}
                disabled={currentStepIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Anterior
              </Button>

              {currentStep === "summary" ? (
                <Button
                  onClick={handleSubmit}
                  disabled={!canGoNext || createCharacter.isPending}
                >
                  {createCharacter.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Criar Personagem
                </Button>
              ) : (
                <Button
                  onClick={goNext}
                  disabled={!canGoNext}
                >
                  Próximo
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
