import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sword, Shield, Wind, Dices, Heart, Sparkles, Trophy, Skull, X } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS } from "../../../shared/gameConstants";

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

export function CombatScreen({ monster, latitude, longitude, onClose, onVictory, onDefeat }: CombatScreenProps) {
  const [monsterHealth, setMonsterHealth] = useState(monster.health);
  const [playerHealth, setPlayerHealth] = useState(0);
  const [maxPlayerHealth, setMaxPlayerHealth] = useState(0);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatEnded, setCombatEnded] = useState(false);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  useEffect(() => {
    if (character) {
      setPlayerHealth(character.currentHealth);
      setMaxPlayerHealth(character.maxHealth);
      addLog("system", `Combate iniciado contra ${monster.name}!`);
    }
  }, [character, monster.name]);

  const addLog = (type: CombatLog["type"], message: string, damage?: number, isCritical?: boolean) => {
    setCombatLogs((prev) => [...prev, { type, message, damage, isCritical }]);
  };

  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded) return;

    setIsRolling(true);
    
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
          const critText = result.playerAttack.isCritical ? " CRÍTICO!" : "";
          addLog("player", `Você atacou e causou ${result.playerAttack.damage} de dano!${critText}`, result.playerAttack.damage, result.playerAttack.isCritical);
        } else {
          addLog("player", "Seu ataque errou!");
        }

        setMonsterHealth(result.newMonsterHealth);

        // Monster attack log
        if (result.newMonsterHealth > 0) {
          if (result.monsterAttack.hit) {
            addLog("monster", `${monster.name} atacou e causou ${result.monsterAttack.damage} de dano!`, result.monsterAttack.damage);
          } else {
            addLog("monster", `${monster.name} errou o ataque!`);
          }
          setPlayerHealth(result.newPlayerHealth);
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

  const tierData = MONSTER_TIERS[monster.tier as keyof typeof MONSTER_TIERS];
  const healthPercent = (monsterHealth / monster.health) * 100;
  const playerHealthPercent = maxPlayerHealth > 0 ? (playerHealth / maxPlayerHealth) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg fantasy-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">⚔️ Combate</CardTitle>
            {!combatEnded && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Monster Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-full bg-destructive/20 border-2 border-destructive flex items-center justify-center text-3xl">
                👹
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{monster.name}</h3>
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
                <p className="text-sm text-muted-foreground">Nível {monster.level}</p>
              </div>
            </div>

            {/* Monster Health */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-destructive flex items-center gap-1">
                  <Heart className="w-4 h-4" /> HP
                </span>
                <span>{monsterHealth}/{monster.health}</span>
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
          <div className="bg-primary/10 rounded-lg p-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4 text-destructive" /> Sua Vida
              </span>
              <span>{playerHealth}/{maxPlayerHealth}</span>
            </div>
            <Progress 
              value={playerHealthPercent} 
              className={cn("h-2", playerHealthPercent < 25 && "health-low")} 
            />
          </div>

          {/* Dice Roll Display */}
          {diceRoll !== null && (
            <div className="flex justify-center">
              <div className={cn(
                "w-16 h-16 rounded-lg bg-card border-2 border-primary flex items-center justify-center text-2xl font-bold",
                isRolling && "dice-rolling",
                diceRoll === 20 && "text-yellow-400 border-yellow-400",
                diceRoll === 1 && "text-destructive border-destructive"
              )}>
                {diceRoll}
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="bg-muted/20 rounded-lg p-3 h-32 overflow-y-auto scrollbar-fantasy">
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
          {!combatEnded && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                size="lg"
                className="h-14"
                onClick={handleAttack}
                disabled={!isPlayerTurn || attackMutation.isPending}
              >
                <Sword className="w-5 h-5 mr-2" />
                Atacar
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="h-14"
                onClick={handleFlee}
                disabled={!isPlayerTurn || fleeMutation.isPending}
              >
                <Wind className="w-5 h-5 mr-2" />
                Fugir
              </Button>
            </div>
          )}

          {/* Victory/Defeat Display */}
          {combatEnded && (
            <div className={cn(
              "text-center py-4 rounded-lg",
              monsterHealth <= 0 ? "bg-accent/20" : "bg-destructive/20"
            )}>
              {monsterHealth <= 0 ? (
                <div className="flex flex-col items-center gap-2">
                  <Trophy className="w-12 h-12 text-yellow-400" />
                  <span className="text-xl font-bold text-accent">Vitória!</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Skull className="w-12 h-12 text-destructive" />
                  <span className="text-xl font-bold text-destructive">Derrota</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
