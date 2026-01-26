import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sword, Shield, Wind, X } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL } from "../../../shared/gameConstants";

// Monster sprites mapping
const MONSTER_SPRITES: Record<string, string> = {
  goblin: "/sprites/monsters/goblin.png",
  orc: "/sprites/monsters/orc.png",
  skeleton: "/sprites/monsters/skeleton.png",
  dragon: "/sprites/monsters/dragon.png",
  slime: "/sprites/monsters/slime.png",
  wolf: "/sprites/monsters/wolf.png",
  // Default fallback
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
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [usedSpellSlots, setUsedSpellSlots] = useState<Record<number, number>>({});
  const [isAttacking, setIsAttacking] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (character) {
      setPlayerHealth(character.currentHealth);
      setMaxPlayerHealth(character.maxHealth);
      addLog("system", `Combate iniciado contra ${monster.name}!`);
      
      // Load available spells based on character class
      const classSpells = Object.values(SPELLS).filter(spell => {
        const classes = spell.classes as string[];
        return classes.includes(character.characterClass) && spell.level <= Math.ceil(character.level / 2);
      });
      setAvailableSpells(classSpells);
    }
  }, [character, monster.name]);

  const addLog = (type: CombatLog["type"], message: string, damage?: number, isCritical?: boolean) => {
    setCombatLogs((prev) => [...prev, { type, message, damage, isCritical }]);
  };

  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded) return;

    setIsRolling(true);
    setIsAttacking(true);
    
    // Animate dice roll
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

        // Player attack log
        if (result.playerAttack.isCriticalMiss) {
          addLog("player", "Falha crítica! Você errou completamente!");
        } else if (result.playerAttack.hit) {
          setIsMonsterHit(true);
          setTimeout(() => setIsMonsterHit(false), 300);
          const critText = result.playerAttack.isCritical ? " CRÍTICO!" : "";
          addLog("player", `Você atacou e causou ${result.playerAttack.damage} de dano!${critText}`, result.playerAttack.damage, result.playerAttack.isCritical);
        } else {
          addLog("player", "Seu ataque errou!");
        }

        setMonsterHealth(result.newMonsterHealth);
        setIsAttacking(false);

        // Monster attack log
        if (result.newMonsterHealth > 0) {
          setTimeout(() => {
            if (result.monsterAttack.hit) {
              setIsPlayerHit(true);
              setTimeout(() => setIsPlayerHit(false), 300);
              addLog("monster", `${monster.name} atacou e causou ${result.monsterAttack.damage} de dano!`, result.monsterAttack.damage);
            } else {
              addLog("monster", `${monster.name} errou o ataque!`);
            }
            setPlayerHealth(result.newPlayerHealth);
          }, 500);
        }

        // Check combat result
        if (result.result === "victory") {
          setCombatEnded(true);
          addLog("system", `Vitória! Você derrotou ${monster.name}!`);
          if (result.rewards) {
            addLog("system", `+${result.rewards.experience} XP, +${result.rewards.gold} Ouro`);
            if (result.rewards.leveledUp) {
              addLog("system", `🎉 SUBIU DE NÍVEL! Agora você é nível ${result.rewards.newLevel}!`);
            }
          }
          utils.character.get.invalidate();
          setTimeout(() => onVictory(result.rewards!), 2000);
        } else if (result.result === "defeat") {
          setCombatEnded(true);
          addLog("system", "Você foi derrotado...");
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
        addLog("system", "Você fugiu do combate!");
        setCombatEnded(true);
        utils.character.get.invalidate();
        setTimeout(() => onClose(), 1500);
      } else {
        setIsPlayerHit(true);
        setTimeout(() => setIsPlayerHit(false), 300);
        addLog("system", `Falha ao fugir! ${monster.name} atacou e causou ${result.damageTaken} de dano!`);
        setPlayerHealth(result.newHealth);
        
        if (result.newHealth <= 0) {
          setCombatEnded(true);
          addLog("system", "Você foi derrotado...");
          utils.character.get.invalidate();
          setTimeout(() => onDefeat(), 2000);
        }
      }
    } catch (error) {
      toast.error("Erro ao fugir");
    }
  };

  // Cast a spell
  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded || !character) return;
    
    // Check if spell requires a slot
    if (spell.level > 0) {
      const slots = SPELL_SLOTS_BY_LEVEL[character.level] || [0, 0, 0, 0, 0, 0, 0, 0, 0];
      const availableSlots = slots[spell.level - 1] - (usedSpellSlots[spell.level] || 0);
      
      if (availableSlots <= 0) {
        toast.error(`Sem slots de magia de nível ${spell.level} disponíveis!`);
        return;
      }
      
      // Use a spell slot
      setUsedSpellSlots(prev => ({
        ...prev,
        [spell.level]: (prev[spell.level] || 0) + 1
      }));
    }
    
    setShowSpells(false);
    setIsRolling(true);
    setIsAttacking(true);
    
    // Animate dice roll
    const rollInterval = setInterval(() => {
      setDiceRoll(Math.floor(Math.random() * 20) + 1);
    }, 50);
    
    setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      
      // Calculate spell damage
      const spellDamageStr = typeof spell.damage === 'object' ? spell.damage.dice : (spell.damage || "1d6");
      const [numDice, diceSize] = spellDamageStr.split("d").map(Number);
      let totalDamage = 0;
      for (let i = 0; i < numDice; i++) {
        totalDamage += Math.floor(Math.random() * diceSize) + 1;
      }
      
      // Spell attack roll
      const attackRoll = Math.floor(Math.random() * 20) + 1;
      const isCritical = attackRoll === 20;
      const isMiss = attackRoll === 1;
      
      setDiceRoll(attackRoll);
      
      if (isMiss) {
        addLog("player", `${spell.name} falhou completamente!`);
      } else {
        const finalDamage = isCritical ? totalDamage * 2 : totalDamage;
        setIsMonsterHit(true);
        setTimeout(() => setIsMonsterHit(false), 300);
        addLog("player", `${spell.name} causou ${finalDamage} de dano!${isCritical ? " CRÍTICO!" : ""}`, finalDamage, isCritical);
        
        const newMonsterHealth = Math.max(0, monsterHealth - finalDamage);
        setMonsterHealth(newMonsterHealth);
        
        // Check victory
        if (newMonsterHealth <= 0) {
          setCombatEnded(true);
          addLog("system", `Vitória! Você derrotou ${monster.name}!`);
          const xpReward = monster.level * 25;
          const goldReward = monster.level * 10 + Math.floor(Math.random() * 20);
          addLog("system", `+${xpReward} XP, +${goldReward} Ouro`);
          utils.character.get.invalidate();
          setTimeout(() => onVictory({ experience: xpReward, gold: goldReward }), 2000);
        } else {
          // Monster counter attack
          setTimeout(() => {
            const monsterRoll = Math.floor(Math.random() * 20) + 1;
            const monsterHit = monsterRoll >= 10;
            if (monsterHit) {
              const monsterDmg = Math.floor(Math.random() * monster.damage) + 1;
              setIsPlayerHit(true);
              setTimeout(() => setIsPlayerHit(false), 300);
              addLog("monster", `${monster.name} atacou e causou ${monsterDmg} de dano!`, monsterDmg);
              const newPlayerHealth = Math.max(0, playerHealth - monsterDmg);
              setPlayerHealth(newPlayerHealth);
              
              if (newPlayerHealth <= 0) {
                setCombatEnded(true);
                addLog("system", "Você foi derrotado...");
                utils.character.get.invalidate();
                setTimeout(() => onDefeat(), 2000);
              }
            } else {
              addLog("monster", `${monster.name} errou o ataque!`);
            }
          }, 500);
        }
      }
      setIsAttacking(false);
    }, 500);
  };
  
  // Get available spell slots for display
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

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg fantasy-card overflow-hidden">
        <CardHeader className="pb-2 bg-gradient-to-r from-destructive/20 to-primary/20">
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

        <CardContent className="space-y-4 pt-4">
          {/* Battle Arena */}
          <div className="relative bg-gradient-to-b from-muted/50 to-muted/20 rounded-lg p-4 min-h-[180px]">
            {/* Player Side */}
            <div className={cn(
              "absolute left-4 bottom-4 transition-all duration-200",
              isAttacking && "translate-x-8",
              isPlayerHit && "animate-shake"
            )}>
              <img 
                src={CLASS_SPRITES[playerClass]} 
                alt="Player"
                className={cn(
                  "w-24 h-24 pixelated drop-shadow-lg",
                  isPlayerHit && "brightness-150"
                )}
              />
              {isPlayerHit && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-destructive font-bold animate-bounce">
                  -{combatLogs[combatLogs.length - 1]?.damage || 0}
                </div>
              )}
            </div>

            {/* VS */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
              <span className="text-2xl font-bold text-primary pixel-text">VS</span>
            </div>

            {/* Monster Side */}
            <div className={cn(
              "absolute right-4 bottom-4 transition-all duration-200",
              isMonsterHit && "animate-shake"
            )}>
              <img 
                src={getMonsterSprite(monster.monsterType)} 
                alt={monster.name}
                className={cn(
                  "w-24 h-24 pixelated drop-shadow-lg",
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
                <p className="text-xs text-muted-foreground">Nível {monster.level}</p>
              </div>
            </div>

            {/* Monster Health */}
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
                <Sword className="w-3 h-3" /> Dano: {monster.damage}
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" /> Armadura: {monster.armor}
              </div>
            </div>
          </div>

          {/* Player Health */}
          <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <img src="/sprites/ui/heart.png" alt="HP" className="w-4 h-4 pixelated" /> Sua Vida
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
                "relative w-20 h-20 flex items-center justify-center",
                isRolling && "animate-spin"
              )}>
                <img 
                  src="/sprites/ui/d20.png" 
                  alt="D20" 
                  className="w-full h-full pixelated"
                />
                <span className={cn(
                  "absolute text-2xl font-bold pixel-text",
                  diceRoll === 20 && "text-yellow-400",
                  diceRoll === 1 && "text-destructive"
                )}>
                  {!isRolling && diceRoll}
                </span>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="bg-muted/20 rounded-lg p-3 h-28 overflow-y-auto scrollbar-fantasy border border-border">
            <div className="space-y-1 text-sm">
              {combatLogs.map((log, index) => (
                <div
                  key={index}
                  className={cn(
                    "py-1",
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

          {/* Action Buttons */}
          {!combatEnded && !showSpells && (
            <div className="grid grid-cols-3 gap-2">
              <Button
                size="lg"
                className="h-14 pixel-text"
                onClick={handleAttack}
                disabled={!isPlayerTurn || attackMutation.isPending}
              >
                <img src="/sprites/items/sword.png" alt="Attack" className="w-6 h-6 mr-2 pixelated" />
                Atacar
              </Button>
              {availableSpells.length > 0 && (
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-14 pixel-text bg-purple-600 hover:bg-purple-700"
                  onClick={() => setShowSpells(true)}
                  disabled={!isPlayerTurn}
                >
                  <img src="/sprites/items/staff.png" alt="Magic" className="w-6 h-6 mr-2 pixelated" />
                  Magia
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="h-14 pixel-text"
                onClick={handleFlee}
                disabled={!isPlayerTurn || fleeMutation.isPending}
              >
                <Wind className="w-5 h-5 mr-2" />
                Fugir
              </Button>
            </div>
          )}

          {/* Spells Panel */}
          {!combatEnded && showSpells && (
            <div className="bg-purple-900/30 rounded-lg p-3 border border-purple-500/50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-bold text-purple-300 pixel-text">Magias Disponíveis</h4>
                <Button variant="ghost" size="sm" onClick={() => setShowSpells(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {availableSpells.map(spell => {
                  const slots = spell.level > 0 ? getSpellSlots(spell.level) : null;
                  const canCast = spell.level === 0 || (slots && slots.total - slots.used > 0);
                  
                  return (
                    <button
                      key={spell.id}
                      onClick={() => canCast && handleCastSpell(spell)}
                      disabled={!canCast}
                      className={cn(
                        "w-full text-left p-2 rounded-lg transition-colors flex items-center justify-between",
                        canCast ? "bg-purple-800/50 hover:bg-purple-700/50 cursor-pointer" : "bg-gray-800/50 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div>
                        <div className="font-medium text-sm">{spell.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {spell.level === 0 ? "Cantrip" : `Nível ${spell.level}`} • {typeof spell.damage === 'object' ? spell.damage.dice : spell.damage} dano
                        </div>
                      </div>
                      {slots && (
                        <div className="text-xs text-purple-300">
                          {slots.total - slots.used}/{slots.total}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Victory/Defeat Display */}
          {combatEnded && (
            <div className={cn(
              "text-center py-6 rounded-lg",
              monsterHealth <= 0 ? "bg-accent/20 border-2 border-accent" : "bg-destructive/20 border-2 border-destructive"
            )}>
              {monsterHealth <= 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <img src="/sprites/items/gold.png" alt="Victory" className="w-16 h-16 pixelated animate-bounce" />
                  <span className="text-2xl font-bold text-accent pixel-text">Vitória!</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <img src="/sprites/ui/marker-monster.png" alt="Defeat" className="w-16 h-16 pixelated" />
                  <span className="text-2xl font-bold text-destructive pixel-text">Derrota</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
