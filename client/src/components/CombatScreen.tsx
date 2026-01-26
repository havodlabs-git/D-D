import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sword, Shield, Wind, X, Zap, Target, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES } from "../../../shared/gameConstants";

// Monster sprites mapping
const MONSTER_SPRITES: Record<string, string> = {
  goblin: "/sprites/monsters/goblin.png",
  orc: "/sprites/monsters/orc.png",
  skeleton: "/sprites/monsters/skeleton.png",
  dragon: "/sprites/monsters/dragon.png",
  slime: "/sprites/monsters/slime.png",
  wolf: "/sprites/monsters/wolf.png",
  default: "/sprites/monsters/goblin.png",
};

// Class sprites for player (D&D 5e 2024)
const CLASS_SPRITES: Record<string, string> = {
  fighter: "/sprites/classes/warrior.png",
  wizard: "/sprites/classes/mage.png",
  rogue: "/sprites/classes/rogue.png",
  cleric: "/sprites/classes/cleric.png",
  ranger: "/sprites/classes/ranger.png",
  paladin: "/sprites/classes/paladin.png",
  barbarian: "/sprites/classes/barbarian.png",
  bard: "/sprites/classes/bard.png",
  druid: "/sprites/classes/cleric.png",
  monk: "/sprites/classes/rogue.png",
  sorcerer: "/sprites/classes/mage.png",
  warlock: "/sprites/classes/mage.png",
};

// School of magic colors
const SCHOOL_COLORS: Record<string, string> = {
  evocation: "text-orange-400 bg-orange-500/20",
  necromancy: "text-purple-400 bg-purple-500/20",
  abjuration: "text-blue-400 bg-blue-500/20",
  conjuration: "text-cyan-400 bg-cyan-500/20",
  divination: "text-yellow-400 bg-yellow-500/20",
  enchantment: "text-pink-400 bg-pink-500/20",
  illusion: "text-indigo-400 bg-indigo-500/20",
  transmutation: "text-green-400 bg-green-500/20",
};

interface Monster {
  id: number;
  name: string;
  description?: string | null;
  monsterType: string;
  tier: string;
  health: number;
  damage: number;
  armor: number;
  level: number;
}

interface CombatScreenProps {
  monster: Monster;
  latitude: number;
  longitude: number;
  onClose: () => void;
  onVictory: (rewards: { experience: number; gold: number; leveledUp?: boolean; newLevel?: number }) => void;
  onDefeat: () => void;
}

interface CombatLog {
  type: "player" | "monster" | "system";
  message: string;
  damage?: number;
  isCritical?: boolean;
}

function getMonsterSprite(monsterType: string): string {
  const type = monsterType.toLowerCase();
  return MONSTER_SPRITES[type] || MONSTER_SPRITES.default;
}

export function CombatScreen({ monster, latitude, longitude, onClose, onVictory, onDefeat }: CombatScreenProps) {
  const [monsterHealth, setMonsterHealth] = useState(monster.health);
  const [playerHealth, setPlayerHealth] = useState(0);
  const [maxPlayerHealth, setMaxPlayerHealth] = useState(0);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatEnded, setCombatEnded] = useState(false);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showSpells, setShowSpells] = useState(false);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [usedSpellSlots, setUsedSpellSlots] = useState<Record<number, number>>({});
  const [isAttacking, setIsAttacking] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [showAttackDetails, setShowAttackDetails] = useState(false);

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  // Get class data for attack details
  const classData = character ? CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES] : null;

  useEffect(() => {
    if (character) {
      setPlayerHealth(character.currentHealth);
      setMaxPlayerHealth(character.maxHealth);
      addLog("system", `Combate iniciado contra ${monster.name} (Nível ${monster.level})!`);
      
      // Load available spells based on character class and known spells
      const knownSpellIds = character.knownSpells ? JSON.parse(character.knownSpells as string) : [];
      const classSpells = Object.values(SPELLS).filter(spell => {
        const classes = spell.classes as string[];
        const isClassSpell = classes.includes(character.characterClass);
        const isKnown = knownSpellIds.includes(spell.id) || spell.level === 0; // Cantrips always available
        const levelRequirement = spell.level <= Math.ceil(character.level / 2);
        return isClassSpell && (isKnown || spell.level === 0) && levelRequirement;
      });
      setAvailableSpells(classSpells);
    }
  }, [character, monster.name, monster.level]);

  const addLog = (type: CombatLog["type"], message: string, damage?: number, isCritical?: boolean) => {
    setCombatLogs((prev) => [...prev, { type, message, damage, isCritical }]);
  };

  // Calculate player attack damage based on D&D 5e rules
  const calculatePlayerDamage = () => {
    if (!character || !classData) return { min: 1, max: 6, avg: 3.5, modifier: 0 };
    
    // Get primary stat modifier
    const primaryStat = classData.primaryAbility;
    const statValue = character[primaryStat as keyof typeof character] as number || 10;
    const modifier = Math.floor((statValue - 10) / 2);
    
    // Base weapon damage (d6 for simple, d8 for martial)
    const hasMartial = (classData.weaponProficiencies as readonly string[]).includes("martial");
    const diceSize = hasMartial ? 8 : 6;
    
    return {
      min: 1 + modifier,
      max: diceSize + modifier,
      avg: ((1 + diceSize) / 2) + modifier,
      modifier,
      diceSize,
    };
  };

  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded) return;

    setShowAttackDetails(false);
    setIsRolling(true);
    setIsAttacking(true);
    
    const rollInterval = setInterval(() => {
      setDiceRoll(Math.floor(Math.random() * 20) + 1);
    }, 50);

    setTimeout(async () => {
      clearInterval(rollInterval);
      setIsRolling(false);

      try {
        const result = await attackMutation.mutateAsync({
          monsterId: monster.id,
          monsterCurrentHealth: monsterHealth,
          monsterArmor: monster.armor,
          monsterDamage: monster.damage,
          monsterLevel: monster.level,
        });

        setDiceRoll(result.playerAttack.roll);

        if (result.playerAttack.isCriticalMiss) {
          addLog("player", "🎲 Falha crítica (1)! Você errou completamente!");
        } else if (result.playerAttack.hit) {
          setIsMonsterHit(true);
          setTimeout(() => setIsMonsterHit(false), 300);
          const critText = result.playerAttack.isCritical ? " 💥 CRÍTICO!" : "";
          addLog("player", `⚔️ Ataque (${result.playerAttack.roll} vs AC ${monster.armor}): ${result.playerAttack.damage} de dano!${critText}`, result.playerAttack.damage, result.playerAttack.isCritical);
        } else {
          addLog("player", `⚔️ Ataque (${result.playerAttack.roll} vs AC ${monster.armor}): Errou!`);
        }

        setMonsterHealth(result.newMonsterHealth);
        setIsAttacking(false);

        if (result.newMonsterHealth > 0) {
          setTimeout(() => {
            if (result.monsterAttack.hit) {
              setIsPlayerHit(true);
              setTimeout(() => setIsPlayerHit(false), 300);
              addLog("monster", `👹 ${monster.name} atacou: ${result.monsterAttack.damage} de dano!`, result.monsterAttack.damage);
            } else {
              addLog("monster", `👹 ${monster.name} errou o ataque!`);
            }
            setPlayerHealth(result.newPlayerHealth);
          }, 500);
        }

        if (result.result === "victory") {
          setCombatEnded(true);
          addLog("system", `🏆 Vitória! Você derrotou ${monster.name}!`);
          if (result.rewards) {
            addLog("system", `✨ +${result.rewards.experience} XP, +${result.rewards.gold} Ouro`);
            if (result.rewards.leveledUp) {
              addLog("system", `🎉 SUBIU DE NÍVEL! Agora você é nível ${result.rewards.newLevel}!`);
            }
          }
          utils.character.get.invalidate();
          setTimeout(() => onVictory(result.rewards!), 2000);
        } else if (result.result === "defeat") {
          setCombatEnded(true);
          addLog("system", "💀 Você foi derrotado...");
          utils.character.get.invalidate();
          setTimeout(() => onDefeat(), 2000);
        }
      } catch (error) {
        toast.error("Erro no combate");
        setIsAttacking(false);
      }
    }, 500);
  };

  const handleFlee = async () => {
    if (!isPlayerTurn || combatEnded) return;

    try {
      const result = await fleeMutation.mutateAsync({
        monsterLevel: monster.level,
        monsterDamage: monster.damage,
      });

      if (result.success) {
        addLog("system", "🏃 Você fugiu do combate!");
        setCombatEnded(true);
        utils.character.get.invalidate();
        setTimeout(() => onClose(), 1500);
      } else {
        setIsPlayerHit(true);
        setTimeout(() => setIsPlayerHit(false), 300);
        addLog("system", `🏃 Falha ao fugir! ${monster.name} atacou: ${result.damageTaken} de dano!`);
        setPlayerHealth(result.newHealth);
        
        if (result.newHealth <= 0) {
          setCombatEnded(true);
          addLog("system", "💀 Você foi derrotado...");
          utils.character.get.invalidate();
          setTimeout(() => onDefeat(), 2000);
        }
      }
    } catch (error) {
      toast.error("Erro ao fugir");
    }
  };

  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded || !character) return;
    
    if (spell.level > 0) {
      const slots = SPELL_SLOTS_BY_LEVEL[character.level] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const availableSlots = slots[spell.level - 1] - (usedSpellSlots[spell.level] || 0);
      
      if (availableSlots <= 0) {
        toast.error(`Sem slots de magia de nível ${spell.level} disponíveis!`);
        return;
      }
      
      setUsedSpellSlots(prev => ({
        ...prev,
        [spell.level]: (prev[spell.level] || 0) + 1
      }));
    }
    
    setShowSpells(false);
    setSelectedSpell(null);
    setIsRolling(true);
    setIsAttacking(true);
    
    const rollInterval = setInterval(() => {
      setDiceRoll(Math.floor(Math.random() * 20) + 1);
    }, 50);
    
    setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      
      const spellDamageStr = typeof spell.damage === 'object' ? spell.damage.dice : (spell.damage || "1d6");
      const [numDice, diceSize] = spellDamageStr.split("d").map(Number);
      let totalDamage = 0;
      const rolls: number[] = [];
      for (let i = 0; i < numDice; i++) {
        const roll = Math.floor(Math.random() * diceSize) + 1;
        rolls.push(roll);
        totalDamage += roll;
      }
      
      const attackRoll = Math.floor(Math.random() * 20) + 1;
      const isCritical = attackRoll === 20;
      const isMiss = attackRoll === 1;
      
      setDiceRoll(attackRoll);
      
      if (isMiss) {
        addLog("player", `✨ ${spell.name} (${attackRoll} vs AC ${monster.armor}): Falhou!`);
      } else {
        const finalDamage = isCritical ? totalDamage * 2 : totalDamage;
        setIsMonsterHit(true);
        setTimeout(() => setIsMonsterHit(false), 300);
        const rollsStr = rolls.join("+");
        addLog("player", `✨ ${spell.name} (${attackRoll}): ${spellDamageStr} [${rollsStr}] = ${finalDamage} de dano!${isCritical ? " 💥 CRÍTICO!" : ""}`, finalDamage, isCritical);
        
        const newMonsterHealth = Math.max(0, monsterHealth - finalDamage);
        setMonsterHealth(newMonsterHealth);
        
        if (newMonsterHealth <= 0) {
          setCombatEnded(true);
          addLog("system", `🏆 Vitória! Você derrotou ${monster.name}!`);
          const xpReward = monster.level * 25;
          const goldReward = monster.level * 10 + Math.floor(Math.random() * 20);
          addLog("system", `✨ +${xpReward} XP, +${goldReward} Ouro`);
          utils.character.get.invalidate();
          setTimeout(() => onVictory({ experience: xpReward, gold: goldReward }), 2000);
        } else {
          setTimeout(() => {
            const monsterRoll = Math.floor(Math.random() * 20) + 1;
            const monsterHit = monsterRoll >= 10;
            if (monsterHit) {
              const monsterDmg = Math.floor(Math.random() * monster.damage) + 1;
              setIsPlayerHit(true);
              setTimeout(() => setIsPlayerHit(false), 300);
              addLog("monster", `👹 ${monster.name} atacou: ${monsterDmg} de dano!`, monsterDmg);
              const newPlayerHealth = Math.max(0, playerHealth - monsterDmg);
              setPlayerHealth(newPlayerHealth);
              
              if (newPlayerHealth <= 0) {
                setCombatEnded(true);
                addLog("system", "💀 Você foi derrotado...");
                utils.character.get.invalidate();
                setTimeout(() => onDefeat(), 2000);
              }
            } else {
              addLog("monster", `👹 ${monster.name} errou o ataque!`);
            }
          }, 500);
        }
      }
      setIsAttacking(false);
    }, 500);
  };
  
  const getSpellSlots = (level: number): { total: number; used: number } => {
    if (!character) return { total: 0, used: 0 };
    const slots = SPELL_SLOTS_BY_LEVEL[character.level] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
    return {
      total: slots[level - 1] || 0,
      used: usedSpellSlots[level] || 0
    };
  };

  const tierData = MONSTER_TIERS[monster.tier as keyof typeof MONSTER_TIERS];
  const healthPercent = (monsterHealth / monster.health) * 100;
  const playerHealthPercent = maxPlayerHealth > 0 ? (playerHealth / maxPlayerHealth) * 100 : 0;
  const playerClass = character?.characterClass || "fighter";
  const attackDetails = calculatePlayerDamage();

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg fantasy-card overflow-hidden max-h-[95vh] flex flex-col">
        <CardHeader className="pb-2 bg-gradient-to-r from-destructive/20 to-primary/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl pixel-text flex items-center gap-2">
              <img src="/sprites/ui/d20.png" alt="Combat" className="w-8 h-8 pixelated" />
              Combate
            </CardTitle>
            {!combatEnded && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3 pt-4 overflow-y-auto flex-1">
          {/* Battle Arena */}
          <div className="relative bg-gradient-to-b from-muted/50 to-muted/20 rounded-lg p-4 min-h-[160px]">
            <div className={cn(
              "absolute left-4 bottom-4 transition-all duration-200",
              isAttacking && "translate-x-8",
              isPlayerHit && "animate-shake"
            )}>
              <img 
                src={CLASS_SPRITES[playerClass]} 
                alt="Player"
                className={cn(
                  "w-20 h-20 pixelated drop-shadow-lg",
                  isPlayerHit && "brightness-150"
                )}
              />
              {isPlayerHit && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-destructive font-bold animate-bounce">
                  -{combatLogs[combatLogs.length - 1]?.damage || 0}
                </div>
              )}
            </div>

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="text-2xl font-bold text-primary pixel-text">VS</span>
            </div>

            <div className={cn(
              "absolute right-4 bottom-4 transition-all duration-200",
              isMonsterHit && "animate-shake"
            )}>
              <img 
                src={getMonsterSprite(monster.monsterType)} 
                alt={monster.name}
                className={cn(
                  "w-20 h-20 pixelated drop-shadow-lg",
                  isMonsterHit && "brightness-150",
                  monsterHealth <= 0 && "opacity-50 grayscale"
                )}
              />
              {isMonsterHit && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-accent font-bold animate-bounce">
                  -{combatLogs[combatLogs.length - 1]?.damage || 0}
                </div>
              )}
            </div>
          </div>

          {/* Monster Info */}
          <div className="bg-destructive/10 rounded-lg p-3 border border-destructive/30">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src={getMonsterSprite(monster.monsterType)} 
                alt={monster.name}
                className="w-10 h-10 pixelated"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold pixel-text">{monster.name}</h3>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    monster.tier === "common" && "bg-muted text-muted-foreground",
                    monster.tier === "elite" && "bg-blue-500/20 text-blue-400",
                    monster.tier === "boss" && "bg-purple-500/20 text-purple-400",
                    monster.tier === "legendary" && "bg-yellow-500/20 text-yellow-400"
                  )}>
                    {tierData?.name || monster.tier}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Nível {monster.level} • AC {monster.armor}</p>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive flex items-center gap-1">
                  <img src="/sprites/ui/heart.png" alt="HP" className="w-4 h-4 pixelated" /> HP
                </span>
                <span className="pixel-text">{monsterHealth}/{monster.health}</span>
              </div>
              <Progress value={healthPercent} className="h-3" />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Sword className="w-3 h-3" /> Dano: 1-{monster.damage}
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> AC: {monster.armor}
              </div>
            </div>
          </div>

          {/* Player Health */}
          <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <img src="/sprites/ui/heart.png" alt="HP" className="w-4 h-4 pixelated" /> 
                {character?.name || "Herói"} (Nv. {character?.level || 1})
              </span>
              <span className="pixel-text">{playerHealth}/{maxPlayerHealth}</span>
            </div>
            <Progress 
              value={playerHealthPercent} 
              className={cn("h-3", playerHealthPercent < 25 && "health-low")} 
            />
          </div>

          {/* Dice Roll Display */}
          {diceRoll !== null && (
            <div className="flex justify-center">
              <div className={cn(
                "relative w-16 h-16 flex items-center justify-center",
                isRolling && "animate-spin"
              )}>
                <img 
                  src="/sprites/ui/d20.png" 
                  alt="D20" 
                  className="w-full h-full pixelated"
                />
                <span className={cn(
                  "absolute text-xl font-bold pixel-text",
                  diceRoll === 20 && "text-yellow-400",
                  diceRoll === 1 && "text-destructive"
                )}>
                  {!isRolling && diceRoll}
                </span>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="bg-muted/20 rounded-lg p-3 h-24 overflow-y-auto scrollbar-fantasy border border-border">
            <div className="space-y-1 text-sm">
              {combatLogs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "py-0.5",
                    log.type === "player" && "text-accent",
                    log.type === "monster" && "text-destructive",
                    log.type === "system" && "text-primary font-medium",
                    log.isCritical && "font-bold"
                  )}
                >
                  {log.message}
                </div>
              ))}
            </div>
          </div>

          {/* Attack Details Panel */}
          {!combatEnded && showAttackDetails && !showSpells && (
            <div className="bg-accent/10 rounded-lg p-3 border border-accent/30">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-accent pixel-text flex items-center gap-2">
                  <Sword className="w-4 h-4" /> Ataque Físico
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setShowAttackDetails(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/30 rounded p-2">
                  <div className="text-xs text-muted-foreground">Dado de Ataque</div>
                  <div className="font-bold">1d20 + {attackDetails.modifier}</div>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="text-xs text-muted-foreground">Dano</div>
                  <div className="font-bold">1d{attackDetails.diceSize} + {attackDetails.modifier}</div>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="text-xs text-muted-foreground">Dano Médio</div>
                  <div className="font-bold">{attackDetails.avg.toFixed(1)}</div>
                </div>
                <div className="bg-muted/30 rounded p-2">
                  <div className="text-xs text-muted-foreground">Crítico (20)</div>
                  <div className="font-bold text-yellow-400">x2 Dano</div>
                </div>
              </div>
              <Button 
                className="w-full mt-3 pixel-text" 
                onClick={handleAttack}
                disabled={!isPlayerTurn || attackMutation.isPending}
              >
                <Sword className="w-4 h-4 mr-2" /> Confirmar Ataque
              </Button>
            </div>
          )}

          {/* Spells Panel with Details */}
          {!combatEnded && showSpells && (
            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-purple-300 pixel-text">Magias Disponíveis</h4>
                <Button variant="ghost" size="sm" onClick={() => { setShowSpells(false); setSelectedSpell(null); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              {/* Selected Spell Details */}
              {selectedSpell && (
                <div className="bg-purple-800/50 rounded-lg p-3 mb-3 border border-purple-400/30">
                  <div className="flex items-center gap-2 mb-2">
                    <h5 className="font-bold text-lg">{selectedSpell.name}</h5>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", SCHOOL_COLORS[selectedSpell.school] || "bg-gray-500/20")}>
                      {selectedSpell.school}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{selectedSpell.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-orange-400" />
                      <span>Dano: {typeof selectedSpell.damage === 'object' ? selectedSpell.damage.dice : selectedSpell.damage}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-blue-400" />
                      <span>Alcance: {selectedSpell.range}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-green-400" />
                      <span>Tempo: {selectedSpell.castingTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-purple-400" />
                      <span>Nível: {selectedSpell.level === 0 ? "Cantrip" : selectedSpell.level}</span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground mb-3">
                    <span className="font-medium">Componentes:</span> {[selectedSpell.components.verbal && "V", selectedSpell.components.somatic && "S", selectedSpell.components.material && "M"].filter(Boolean).join(", ")}
                  </div>
                  <Button 
                    className="w-full pixel-text bg-purple-600 hover:bg-purple-700" 
                    onClick={() => handleCastSpell(selectedSpell)}
                    disabled={!isPlayerTurn}
                  >
                    <Zap className="w-4 h-4 mr-2" /> Lançar {selectedSpell.name}
                  </Button>
                </div>
              )}
              
              <div className="max-h-32 overflow-y-auto space-y-1">
                {availableSpells.map(spell => {
                  const slots = spell.level > 0 ? getSpellSlots(spell.level) : null;
                  const canCast = spell.level === 0 || (slots && slots.total - slots.used > 0);
                  const isSelected = selectedSpell?.id === spell.id;
                  
                  return (
                    <button
                      key={spell.id}
                      onClick={() => setSelectedSpell(isSelected ? null : spell)}
                      className={cn(
                        "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between",
                        isSelected ? "bg-purple-600/50 ring-2 ring-purple-400" : 
                        canCast ? "bg-purple-800/30 hover:bg-purple-700/40 cursor-pointer" : "bg-gray-800/50 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-sm flex items-center gap-2">
                          {spell.name}
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded", SCHOOL_COLORS[spell.school] || "bg-gray-500/20")}>
                            {spell.school.slice(0, 3)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {spell.level === 0 ? "Cantrip" : `Nv ${spell.level}`} • {typeof spell.damage === 'object' ? spell.damage.dice : spell.damage}
                        </div>
                      </div>
                      {slots && (
                        <div className="text-xs text-purple-300 bg-purple-900/50 px-2 py-1 rounded">
                          {slots.total - slots.used}/{slots.total}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          {!combatEnded && !showSpells && !showAttackDetails && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="lg"
                className="h-12 pixel-text flex-col gap-0.5"
                onClick={() => setShowAttackDetails(true)}
                disabled={!isPlayerTurn || attackMutation.isPending}
              >
                <img src="/sprites/items/sword.png" alt="Attack" className="w-5 h-5 pixelated" />
                <span className="text-xs">Atacar</span>
              </Button>
              {availableSpells.length > 0 && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 pixel-text bg-purple-600 hover:bg-purple-700 flex-col gap-0.5"
                  onClick={() => setShowSpells(true)}
                  disabled={!isPlayerTurn}
                >
                  <img src="/sprites/items/staff.png" alt="Magic" className="w-5 h-5 pixelated" />
                  <span className="text-xs">Magia</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="h-12 pixel-text flex-col gap-0.5"
                onClick={handleFlee}
                disabled={!isPlayerTurn || fleeMutation.isPending}
              >
                <Wind className="w-5 h-5" />
                <span className="text-xs">Fugir</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
