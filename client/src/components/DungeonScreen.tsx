import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { Skull, DoorOpen, Gem, AlertTriangle, Swords, ArrowUp, ArrowLeft, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL } from "../../../shared/gameConstants";

interface DungeonRoom {
  id: number;
  type: "empty" | "monster" | "treasure" | "trap" | "boss" | "stairs" | "entrance";
  explored: boolean;
  content?: {
    name: string;
    level?: number;
    health?: number;
    maxHealth?: number;
    damage?: number;
    gold?: number;
    trapDamage?: number;
  };
}

interface DungeonFloor {
  level: number;
  rooms: DungeonRoom[][];
  playerPosition: { x: number; y: number };
}

interface Character {
  id: number;
  name: string;
  characterClass: string;
  level: number;
  currentHealth: number;
  maxHealth: number;
  currentMana: number;
  maxMana: number;
  gold: number;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

interface DungeonScreenProps {
  dungeonName: string;
  dungeonType: string;
  difficulty: "easy" | "normal" | "hard" | "nightmare";
  totalFloors: number;
  character: Character;
  onClose: () => void;
  onComplete: (rewards: { gold: number; experience: number; items?: string[] }) => void;
  onDefeat: () => void;
}

const ROOM_ICONS: Record<string, React.ReactNode> = {
  empty: <div className="w-6 h-6 bg-muted/30 rounded" />,
  monster: <Skull className="w-6 h-6 text-destructive" />,
  treasure: <Gem className="w-6 h-6 text-yellow-400" />,
  trap: <AlertTriangle className="w-6 h-6 text-orange-500" />,
  boss: <Skull className="w-6 h-6 text-purple-500" />,
  stairs: <ArrowUp className="w-6 h-6 text-green-500" />,
  entrance: <DoorOpen className="w-6 h-6 text-blue-500" />,
};

const DIFFICULTY_MULTIPLIERS = {
  easy: 0.75,
  normal: 1,
  hard: 1.5,
  nightmare: 2,
};

const MONSTER_NAMES = ["Goblin", "Esqueleto", "Orc", "Slime", "Lobo Sombrio", "Zumbi", "Aranha Gigante", "Kobold"];
const BOSS_NAMES = ["Dragão Menor", "Lich Antigo", "Golem de Pedra", "Demônio das Sombras", "Hidra Venenosa"];

function generateDungeonFloor(level: number, totalFloors: number, difficulty: string): DungeonFloor {
  const size = 5 + Math.floor(level / 2);
  const rooms: DungeonRoom[][] = [];
  const mult = DIFFICULTY_MULTIPLIERS[difficulty as keyof typeof DIFFICULTY_MULTIPLIERS] || 1;
  
  for (let y = 0; y < size; y++) {
    rooms[y] = [];
    for (let x = 0; x < size; x++) {
      const rand = Math.random();
      let type: DungeonRoom["type"] = "empty";
      let content: DungeonRoom["content"] = undefined;
      
      if (y === 0 && x === Math.floor(size / 2)) {
        type = level === 1 ? "entrance" : "stairs";
      } else if (y === size - 1 && x === Math.floor(size / 2) && level < totalFloors) {
        type = "stairs";
      } else if (y === size - 1 && x === Math.floor(size / 2) && level === totalFloors) {
        type = "boss";
        const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
        content = {
          name: bossName,
          level: level * 3 + 5,
          health: Math.floor((100 + level * 50) * mult),
          maxHealth: Math.floor((100 + level * 50) * mult),
          damage: Math.floor((15 + level * 5) * mult),
        };
      } else if (rand < 0.25) {
        type = "monster";
        const monsterName = MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)];
        content = {
          name: monsterName,
          level: level + Math.floor(Math.random() * 3),
          health: Math.floor((20 + level * 10) * mult),
          maxHealth: Math.floor((20 + level * 10) * mult),
          damage: Math.floor((5 + level * 3) * mult),
        };
      } else if (rand < 0.35) {
        type = "treasure";
        content = {
          name: "Baú do Tesouro",
          gold: Math.floor((10 + level * 15) * mult),
        };
      } else if (rand < 0.45) {
        type = "trap";
        content = {
          name: "Armadilha",
          trapDamage: Math.floor((5 + level * 5) * mult),
        };
      }
      
      rooms[y][x] = {
        id: y * size + x,
        type,
        explored: y === 0 && x === Math.floor(size / 2),
        content,
      };
    }
  }
  
  return {
    level,
    rooms,
    playerPosition: { x: Math.floor(size / 2), y: 0 },
  };
}

export function DungeonScreen({
  dungeonName,
  dungeonType,
  difficulty,
  totalFloors,
  character,
  onClose,
  onComplete,
  onDefeat,
}: DungeonScreenProps) {
  const [currentFloor, setCurrentFloor] = useState<DungeonFloor>(() => 
    generateDungeonFloor(1, totalFloors, difficulty)
  );
  const [floorNumber, setFloorNumber] = useState(1);
  const [playerHealth, setPlayerHealth] = useState(character.currentHealth);
  const [playerMana, setPlayerMana] = useState(character.currentMana);
  const [goldCollected, setGoldCollected] = useState(0);
  const [monstersKilled, setMonstersKilled] = useState(0);
  const [combatMode, setCombatMode] = useState(false);
  const [currentEnemy, setCurrentEnemy] = useState<DungeonRoom["content"] | null>(null);
  const [combatLog, setCombatLog] = useState<string[]>([]);
  const [dungeonComplete, setDungeonComplete] = useState(false);
  
  const movePlayer = (dx: number, dy: number) => {
    if (combatMode || dungeonComplete) return;
    
    const newX = currentFloor.playerPosition.x + dx;
    const newY = currentFloor.playerPosition.y + dy;
    
    if (newX < 0 || newX >= currentFloor.rooms[0].length || newY < 0 || newY >= currentFloor.rooms.length) {
      return;
    }
    
    const room = currentFloor.rooms[newY][newX];
    room.explored = true;
    
    setCurrentFloor({
      ...currentFloor,
      playerPosition: { x: newX, y: newY },
    });
    
    // Handle room interaction
    handleRoomInteraction(room, newX, newY);
  };
  
  const handleRoomInteraction = (room: DungeonRoom, x: number, y: number) => {
    switch (room.type) {
      case "monster":
      case "boss":
        if (room.content && room.content.health && room.content.health > 0) {
          setCurrentEnemy(room.content);
          setCombatMode(true);
          setCombatLog([`Você encontrou ${room.content.name}!`]);
        }
        break;
        
      case "treasure":
        if (room.content?.gold) {
          setGoldCollected(prev => prev + room.content!.gold!);
          toast.success(`Encontrou ${room.content.gold} de ouro!`);
          room.type = "empty";
          room.content = undefined;
        }
        break;
        
      case "trap":
        if (room.content?.trapDamage) {
          const damage = room.content.trapDamage;
          setPlayerHealth(prev => Math.max(0, prev - damage));
          toast.error(`Armadilha! Você recebeu ${damage} de dano!`);
          room.type = "empty";
          room.content = undefined;
          
          if (playerHealth - damage <= 0) {
            onDefeat();
          }
        }
        break;
        
      case "stairs":
        if (y === currentFloor.rooms.length - 1) {
          // Going down
          if (floorNumber < totalFloors) {
            setFloorNumber(prev => prev + 1);
            setCurrentFloor(generateDungeonFloor(floorNumber + 1, totalFloors, difficulty));
            toast.info(`Descendo para o andar ${floorNumber + 1}...`);
          }
        } else if (y === 0) {
          // Going up or exit
          if (floorNumber > 1) {
            setFloorNumber(prev => prev - 1);
            setCurrentFloor(generateDungeonFloor(floorNumber - 1, totalFloors, difficulty));
            toast.info(`Subindo para o andar ${floorNumber - 1}...`);
          } else {
            // Exit dungeon
            onClose();
          }
        }
        break;
    }
  };
  
  const handleCombatAttack = () => {
    if (!currentEnemy) return;
    
    // Player attack
    const playerDamage = Math.floor(10 + character.strength * 0.5 + Math.random() * 10);
    const newEnemyHealth = Math.max(0, (currentEnemy.health || 0) - playerDamage);
    
    setCombatLog(prev => [...prev, `Você causou ${playerDamage} de dano!`]);
    
    if (newEnemyHealth <= 0) {
      // Enemy defeated
      setCombatLog(prev => [...prev, `${currentEnemy.name} foi derrotado!`]);
      setMonstersKilled(prev => prev + 1);
      
      // Clear the room
      const { x, y } = currentFloor.playerPosition;
      currentFloor.rooms[y][x].type = "empty";
      currentFloor.rooms[y][x].content = undefined;
      
      // Check if boss was defeated
      if (currentEnemy.level && currentEnemy.level > 10) {
        // Boss defeated - dungeon complete!
        setDungeonComplete(true);
        const xpReward = 100 * totalFloors + monstersKilled * 25;
        setTimeout(() => {
          onComplete({
            gold: goldCollected + Math.floor(currentEnemy.level! * 50),
            experience: xpReward,
            items: ["Espada Rara", "Poção de Cura"],
          });
        }, 2000);
      }
      
      setCombatMode(false);
      setCurrentEnemy(null);
    } else {
      // Enemy counter-attack
      const enemyDamage = Math.floor((currentEnemy.damage || 5) * (0.5 + Math.random() * 0.5));
      const newPlayerHealth = Math.max(0, playerHealth - enemyDamage);
      
      setCurrentEnemy({ ...currentEnemy, health: newEnemyHealth });
      setCombatLog(prev => [...prev, `${currentEnemy.name} causou ${enemyDamage} de dano!`]);
      setPlayerHealth(newPlayerHealth);
      
      if (newPlayerHealth <= 0) {
        setCombatLog(prev => [...prev, "Você foi derrotado..."]);
        setTimeout(() => onDefeat(), 2000);
      }
    }
  };
  
  const handleCombatFlee = () => {
    const fleeChance = 0.5 + character.dexterity * 0.02;
    if (Math.random() < fleeChance) {
      setCombatLog(prev => [...prev, "Você fugiu com sucesso!"]);
      setCombatMode(false);
      setCurrentEnemy(null);
      // Move back
      movePlayer(0, -1);
    } else {
      // Failed to flee, enemy attacks
      if (currentEnemy) {
        const enemyDamage = Math.floor((currentEnemy.damage || 5) * (0.5 + Math.random() * 0.5));
        const newPlayerHealth = Math.max(0, playerHealth - enemyDamage);
        setCombatLog(prev => [...prev, `Falha ao fugir! ${currentEnemy.name} causou ${enemyDamage} de dano!`]);
        setPlayerHealth(newPlayerHealth);
        
        if (newPlayerHealth <= 0) {
          setTimeout(() => onDefeat(), 2000);
        }
      }
    }
  };
  
  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (combatMode) return;
      
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          movePlayer(0, -1);
          break;
        case "ArrowDown":
        case "s":
        case "S":
          movePlayer(0, 1);
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          movePlayer(-1, 0);
          break;
        case "ArrowRight":
        case "d":
        case "D":
          movePlayer(1, 0);
          break;
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFloor, combatMode]);
  
  const healthPercent = (playerHealth / character.maxHealth) * 100;
  
  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl fantasy-card overflow-hidden max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2 bg-gradient-to-r from-purple-900/50 to-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl pixel-text flex items-center gap-2">
                <img src="/sprites/buildings/castle.png" alt="Dungeon" className="w-8 h-8 pixelated" />
                {dungeonName}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Andar {floorNumber}/{totalFloors} • {difficulty.toUpperCase()}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 pt-4">
          {/* Player Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="flex items-center gap-1">
                  <img src="/sprites/ui/heart.png" alt="HP" className="w-4 h-4 pixelated" /> Vida
                </span>
                <span className="pixel-text">{playerHealth}/{character.maxHealth}</span>
              </div>
              <Progress value={healthPercent} className={cn("h-2", healthPercent < 25 && "bg-destructive")} />
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1">
                  <img src="/sprites/items/gold.png" alt="Gold" className="w-4 h-4 pixelated" /> Ouro
                </span>
                <span className="pixel-text text-yellow-400">{goldCollected}</span>
              </div>
            </div>
          </div>
          
          {/* Combat Mode */}
          {combatMode && currentEnemy && (
            <div className="bg-destructive/10 rounded-lg p-4 border border-destructive/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Skull className="w-10 h-10 text-destructive" />
                  <div>
                    <h3 className="font-bold pixel-text">{currentEnemy.name}</h3>
                    <p className="text-xs text-muted-foreground">Nível {currentEnemy.level}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm">HP: {currentEnemy.health}/{currentEnemy.maxHealth}</span>
                  <Progress 
                    value={(currentEnemy.health! / currentEnemy.maxHealth!) * 100} 
                    className="h-2 w-24" 
                  />
                </div>
              </div>
              
              {/* Combat Log */}
              <div className="bg-black/30 rounded p-2 h-20 overflow-y-auto text-xs space-y-1">
                {combatLog.map((log, i) => (
                  <div key={i} className="text-muted-foreground">{log}</div>
                ))}
              </div>
              
              {/* Combat Actions */}
              <div className="grid grid-cols-2 gap-2">
                <Button onClick={handleCombatAttack} className="pixel-text">
                  <Swords className="w-4 h-4 mr-2" /> Atacar
                </Button>
                <Button variant="outline" onClick={handleCombatFlee} className="pixel-text">
                  Fugir
                </Button>
              </div>
            </div>
          )}
          
          {/* Dungeon Map */}
          {!combatMode && !dungeonComplete && (
            <div className="bg-muted/20 rounded-lg p-4 border border-border">
              <h4 className="text-sm font-semibold mb-3 pixel-text">Mapa da Dungeon</h4>
              <div className="flex flex-col items-center gap-1">
                {currentFloor.rooms.map((row, y) => (
                  <div key={y} className="flex gap-1">
                    {row.map((room, x) => {
                      const isPlayer = currentFloor.playerPosition.x === x && currentFloor.playerPosition.y === y;
                      return (
                        <button
                          key={room.id}
                          onClick={() => {
                            const dx = x - currentFloor.playerPosition.x;
                            const dy = y - currentFloor.playerPosition.y;
                            if (Math.abs(dx) + Math.abs(dy) === 1) {
                              movePlayer(dx, dy);
                            }
                          }}
                          className={cn(
                            "w-10 h-10 rounded border flex items-center justify-center transition-all",
                            room.explored ? "bg-muted/50 border-border" : "bg-black/50 border-black",
                            isPlayer && "ring-2 ring-primary bg-primary/20",
                            !room.explored && "cursor-not-allowed"
                          )}
                        >
                          {isPlayer ? (
                            <img src="/sprites/tiles/player.png" alt="Player" className="w-6 h-6 pixelated" />
                          ) : room.explored ? (
                            ROOM_ICONS[room.type]
                          ) : (
                            <span className="text-muted-foreground">?</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
              
              {/* Movement Controls (Mobile) */}
              <div className="flex justify-center mt-4 md:hidden">
                <div className="grid grid-cols-3 gap-1">
                  <div />
                  <Button size="sm" variant="outline" onClick={() => movePlayer(0, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <div />
                  <Button size="sm" variant="outline" onClick={() => movePlayer(-1, 0)}>
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div className="w-8 h-8" />
                  <Button size="sm" variant="outline" onClick={() => movePlayer(1, 0)}>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                  <div />
                  <Button size="sm" variant="outline" onClick={() => movePlayer(0, 1)}>
                    <ArrowUp className="w-4 h-4 rotate-180" />
                  </Button>
                  <div />
                </div>
              </div>
              
              {/* Legend */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Skull className="w-4 h-4 text-destructive" /> Monstro
                </div>
                <div className="flex items-center gap-1">
                  <Gem className="w-4 h-4 text-yellow-400" /> Tesouro
                </div>
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-orange-500" /> Armadilha
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUp className="w-4 h-4 text-green-500" /> Escadas
                </div>
                <div className="flex items-center gap-1">
                  <Skull className="w-4 h-4 text-purple-500" /> Chefe
                </div>
                <div className="flex items-center gap-1">
                  <DoorOpen className="w-4 h-4 text-blue-500" /> Entrada
                </div>
              </div>
            </div>
          )}
          
          {/* Dungeon Complete */}
          {dungeonComplete && (
            <div className="bg-accent/20 rounded-lg p-6 border-2 border-accent text-center">
              <img src="/sprites/items/gold.png" alt="Victory" className="w-20 h-20 mx-auto pixelated animate-bounce" />
              <h3 className="text-2xl font-bold text-accent pixel-text mt-4">Dungeon Conquistada!</h3>
              <p className="text-muted-foreground mt-2">
                Monstros derrotados: {monstersKilled} • Ouro coletado: {goldCollected}
              </p>
            </div>
          )}
          
          {/* Stats */}
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Monstros: {monstersKilled}</span>
            <span>Use WASD ou setas para mover</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
