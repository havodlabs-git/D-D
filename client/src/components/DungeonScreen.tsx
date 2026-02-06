import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL } from "../../../shared/gameConstants";
import { PixelFrame, PixelBtn, PixelText, PixelTitleBar, PixelBar, PixelDialogBox, PixelSeparator, PixelOverlay, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

interface DungeonRoom {
  id: number;
  type: "empty" | "monster" | "treasure" | "trap" | "boss" | "stairs" | "entrance";
  explored: boolean;
  content?: {
    name: string; level?: number; health?: number; maxHealth?: number;
    damage?: number; gold?: number; trapDamage?: number;
  };
}

interface DungeonFloor {
  level: number; rooms: DungeonRoom[][]; playerPosition: { x: number; y: number };
}

interface Character {
  id: number; name: string; characterClass: string; level: number;
  currentHealth: number; maxHealth: number; currentMana: number; maxMana: number;
  gold: number; strength: number; dexterity: number; constitution: number;
  intelligence: number; wisdom: number; charisma: number;
}

interface DungeonScreenProps {
  dungeonName: string; dungeonType: string;
  difficulty: "easy" | "normal" | "hard" | "nightmare"; totalFloors: number;
  character: Character; onClose: () => void;
  onComplete: (rewards: { gold: number; experience: number; items?: string[] }) => void;
  onDefeat: () => void;
}

const ROOM_EMOJI: Record<string, string> = {
  empty: "·", monster: "💀", treasure: "💎", trap: "⚠", boss: "👹", stairs: "▲", entrance: "🚪",
};

const ROOM_COLORS: Record<string, string> = {
  empty: "#333", monster: "#ef4444", treasure: "#eab308", trap: "#f97316",
  boss: "#a855f7", stairs: "#22c55e", entrance: "#3b82f6",
};

const DIFFICULTY_MULTIPLIERS = { easy: 0.75, normal: 1, hard: 1.5, nightmare: 2 };
const MONSTER_NAMES = ["Goblin", "Esqueleto", "Orc", "Slime", "Lobo Sombrio", "Zumbi", "Aranha Gigante", "Kobold"];
const BOSS_NAMES = ["Dragao Menor", "Lich Antigo", "Golem de Pedra", "Demonio das Sombras", "Hidra Venenosa"];

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
        content = {
          name: BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)],
          level: level * 3 + 5, health: Math.floor((100 + level * 50) * mult),
          maxHealth: Math.floor((100 + level * 50) * mult), damage: Math.floor((15 + level * 5) * mult),
        };
      } else if (rand < 0.25) {
        type = "monster";
        content = {
          name: MONSTER_NAMES[Math.floor(Math.random() * MONSTER_NAMES.length)],
          level: level + Math.floor(Math.random() * 3), health: Math.floor((20 + level * 10) * mult),
          maxHealth: Math.floor((20 + level * 10) * mult), damage: Math.floor((5 + level * 3) * mult),
        };
      } else if (rand < 0.35) {
        type = "treasure"; content = { name: "Bau do Tesouro", gold: Math.floor((10 + level * 15) * mult) };
      } else if (rand < 0.45) {
        type = "trap"; content = { name: "Armadilha", trapDamage: Math.floor((5 + level * 5) * mult) };
      }

      rooms[y][x] = { id: y * size + x, type, explored: y === 0 && x === Math.floor(size / 2), content };
    }
  }

  return { level, rooms, playerPosition: { x: Math.floor(size / 2), y: 0 } };
}

export function DungeonScreen({ dungeonName, dungeonType, difficulty, totalFloors, character, onClose, onComplete, onDefeat }: DungeonScreenProps) {
  const [currentFloor, setCurrentFloor] = useState<DungeonFloor>(() => generateDungeonFloor(1, totalFloors, difficulty));
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
    if (newX < 0 || newX >= currentFloor.rooms[0].length || newY < 0 || newY >= currentFloor.rooms.length) return;

    const room = currentFloor.rooms[newY][newX];
    room.explored = true;
    setCurrentFloor({ ...currentFloor, playerPosition: { x: newX, y: newY } });
    handleRoomInteraction(room, newX, newY);
  };

  const handleRoomInteraction = (room: DungeonRoom, x: number, y: number) => {
    switch (room.type) {
      case "monster": case "boss":
        if (room.content && room.content.health && room.content.health > 0) {
          setCurrentEnemy(room.content); setCombatMode(true);
          setCombatLog([`Encontraste ${room.content.name}!`]);
        }
        break;
      case "treasure":
        if (room.content?.gold) {
          setGoldCollected(prev => prev + room.content!.gold!);
          toast.success(`Encontraste ${room.content.gold} de ouro!`);
          room.type = "empty"; room.content = undefined;
        }
        break;
      case "trap":
        if (room.content?.trapDamage) {
          const damage = room.content.trapDamage;
          setPlayerHealth(prev => Math.max(0, prev - damage));
          toast.error(`Armadilha! Recebeste ${damage} de dano!`);
          room.type = "empty"; room.content = undefined;
          if (playerHealth - damage <= 0) onDefeat();
        }
        break;
      case "stairs":
        if (y === currentFloor.rooms.length - 1 && floorNumber < totalFloors) {
          setFloorNumber(prev => prev + 1);
          setCurrentFloor(generateDungeonFloor(floorNumber + 1, totalFloors, difficulty));
          toast.info(`Descendo para o andar ${floorNumber + 1}...`);
        } else if (y === 0) {
          if (floorNumber > 1) {
            setFloorNumber(prev => prev - 1);
            setCurrentFloor(generateDungeonFloor(floorNumber - 1, totalFloors, difficulty));
          } else onClose();
        }
        break;
    }
  };

  const handleCombatAttack = () => {
    if (!currentEnemy) return;
    const playerDamage = Math.floor(10 + character.strength * 0.5 + Math.random() * 10);
    const newEnemyHealth = Math.max(0, (currentEnemy.health || 0) - playerDamage);
    setCombatLog(prev => [...prev, `Causaste ${playerDamage} de dano!`]);

    if (newEnemyHealth <= 0) {
      setCombatLog(prev => [...prev, `${currentEnemy.name} foi derrotado!`]);
      setMonstersKilled(prev => prev + 1);
      const { x, y } = currentFloor.playerPosition;
      currentFloor.rooms[y][x].type = "empty"; currentFloor.rooms[y][x].content = undefined;
      if (currentEnemy.level && currentEnemy.level > 10) {
        setDungeonComplete(true);
        setTimeout(() => onComplete({ gold: goldCollected + Math.floor(currentEnemy.level! * 50), experience: 100 * totalFloors + monstersKilled * 25, items: ["Espada Rara", "Pocao de Cura"] }), 2000);
      }
      setCombatMode(false); setCurrentEnemy(null);
    } else {
      const enemyDamage = Math.floor((currentEnemy.damage || 5) * (0.5 + Math.random() * 0.5));
      const newPlayerHealth = Math.max(0, playerHealth - enemyDamage);
      setCurrentEnemy({ ...currentEnemy, health: newEnemyHealth });
      setCombatLog(prev => [...prev, `${currentEnemy.name} causou ${enemyDamage} de dano!`]);
      setPlayerHealth(newPlayerHealth);
      if (newPlayerHealth <= 0) { setCombatLog(prev => [...prev, "Foste derrotado..."]); setTimeout(() => onDefeat(), 2000); }
    }
  };

  const handleCombatFlee = () => {
    const fleeChance = 0.5 + character.dexterity * 0.02;
    if (Math.random() < fleeChance) {
      setCombatLog(prev => [...prev, "Fugiste com sucesso!"]); setCombatMode(false); setCurrentEnemy(null); movePlayer(0, -1);
    } else {
      if (currentEnemy) {
        const enemyDamage = Math.floor((currentEnemy.damage || 5) * (0.5 + Math.random() * 0.5));
        const newPlayerHealth = Math.max(0, playerHealth - enemyDamage);
        setCombatLog(prev => [...prev, `Falha ao fugir! ${currentEnemy.name} causou ${enemyDamage} de dano!`]);
        setPlayerHealth(newPlayerHealth);
        if (newPlayerHealth <= 0) setTimeout(() => onDefeat(), 2000);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (combatMode) return;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": movePlayer(0, -1); break;
        case "ArrowDown": case "s": case "S": movePlayer(0, 1); break;
        case "ArrowLeft": case "a": case "A": movePlayer(-1, 0); break;
        case "ArrowRight": case "d": case "D": movePlayer(1, 0); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentFloor, combatMode]);

  const diffColors: Record<string, string> = { easy: COLORS.textGreen, normal: COLORS.textWhite, hard: COLORS.xpGold, nightmare: COLORS.textRed };

  return (
    <PixelOverlay>
      <PixelFrame borderColor={COLORS.gold} ornate glow className="w-full max-w-lg" bgColor={COLORS.panelDark}>
        <div className="p-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <PixelText size="md" color={COLORS.textGold} bold className="block">{dungeonName}</PixelText>
              <div className="flex items-center gap-2">
                <PixelText size="xxs" color={COLORS.textGray}>Andar {floorNumber}/{totalFloors}</PixelText>
                <PixelText size="xxs" color={diffColors[difficulty]}>{difficulty.toUpperCase()}</PixelText>
              </div>
            </div>
            <button onClick={onClose} className="w-6 h-6 flex items-center justify-center" style={{
              background: '#6b1a1a', border: '2px solid #ef4444', fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            }}>X</button>
          </div>

          {/* Player Stats */}
          <PixelFrame borderColor="#555" className="p-2 mb-2">
            <div className="flex items-center justify-between mb-1">
              <PixelBar current={playerHealth} max={character.maxHealth} label="HP" height={10} segments={12} />
            </div>
            <div className="flex items-center justify-between">
              <PixelText size="xxs" color={COLORS.textGold}>Ouro: {goldCollected}</PixelText>
              <PixelText size="xxs" color={COLORS.textGray}>Mortos: {monstersKilled}</PixelText>
            </div>
          </PixelFrame>

          {/* Combat Mode */}
          {combatMode && currentEnemy && (
            <PixelFrame borderColor={COLORS.textRed} className="p-2 mb-2">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <PixelText size="sm" color={COLORS.textRed} bold>{currentEnemy.name}</PixelText>
                  <PixelText size="xxs" color={COLORS.textGray}> Nv.{currentEnemy.level}</PixelText>
                </div>
                <PixelBar current={currentEnemy.health || 0} max={currentEnemy.maxHealth || 1} height={8} segments={10} showValue />
              </div>

              {/* Combat Log */}
              <PixelScrollArea maxHeight="80px" className="mb-2 p-1.5" >
                <div style={{ background: '#0a0a0a', border: '1px solid #222', padding: '4px' }}>
                  {combatLog.map((log, i) => (
                    <PixelText key={i} size="xxs" color={i === combatLog.length - 1 ? COLORS.textWhite : COLORS.textGray} as="div">{log}</PixelText>
                  ))}
                </div>
              </PixelScrollArea>

              <div className="flex gap-1.5">
                <PixelBtn variant="attack" size="sm" fullWidth onClick={handleCombatAttack}>ATACAR</PixelBtn>
                <PixelBtn variant="flee" size="sm" fullWidth onClick={handleCombatFlee}>FUGIR</PixelBtn>
              </div>
            </PixelFrame>
          )}

          {/* Dungeon Map */}
          {!combatMode && !dungeonComplete && (
            <div>
              <PixelText size="xs" color={COLORS.textGray} className="block mb-1 text-center">Mapa da Dungeon</PixelText>
              <div className="flex flex-col items-center gap-0.5">
                {currentFloor.rooms.map((row, y) => (
                  <div key={y} className="flex gap-0.5">
                    {row.map((room, x) => {
                      const isPlayer = currentFloor.playerPosition.x === x && currentFloor.playerPosition.y === y;
                      const isAdjacent = Math.abs(x - currentFloor.playerPosition.x) + Math.abs(y - currentFloor.playerPosition.y) === 1;
                      return (
                        <button
                          key={room.id}
                          onClick={() => isAdjacent && movePlayer(x - currentFloor.playerPosition.x, y - currentFloor.playerPosition.y)}
                          className="flex items-center justify-center transition-all"
                          style={{
                            width: '32px', height: '32px',
                            background: isPlayer ? '#1a3a1a' : room.explored ? COLORS.panelMid : '#050510',
                            border: isPlayer ? `2px solid ${COLORS.textGreen}` : room.explored ? '1px solid #333' : '1px solid #111',
                            boxShadow: isPlayer ? `0 0 6px ${COLORS.textGreen}40, inset 0 0 4px ${COLORS.textGreen}20` : 'none',
                            cursor: isAdjacent ? 'pointer' : 'default',
                            fontFamily: PIXEL_FONT, fontSize: '10px',
                            imageRendering: 'pixelated' as const,
                          }}
                        >
                          {isPlayer ? (
                            <span style={{ color: COLORS.textGreen, fontSize: '12px' }}>@</span>
                          ) : room.explored ? (
                            <span style={{ color: ROOM_COLORS[room.type], fontSize: room.type === 'empty' ? '8px' : '12px' }}>
                              {ROOM_EMOJI[room.type]}
                            </span>
                          ) : (
                            <span style={{ color: '#222', fontSize: '8px' }}>?</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* D-Pad Mobile Controls */}
              <div className="flex justify-center mt-3">
                <div className="grid grid-cols-3 gap-0.5" style={{ width: '90px' }}>
                  <div />
                  <button onClick={() => movePlayer(0, -1)} className="flex items-center justify-center" style={{
                    width: '28px', height: '28px', background: COLORS.panelMid, border: `1px solid ${COLORS.gold}60`,
                    fontFamily: PIXEL_FONT, fontSize: '10px', color: COLORS.textGold,
                  }}>▲</button>
                  <div />
                  <button onClick={() => movePlayer(-1, 0)} className="flex items-center justify-center" style={{
                    width: '28px', height: '28px', background: COLORS.panelMid, border: `1px solid ${COLORS.gold}60`,
                    fontFamily: PIXEL_FONT, fontSize: '10px', color: COLORS.textGold,
                  }}>◄</button>
                  <div className="flex items-center justify-center" style={{ width: '28px', height: '28px' }}>
                    <div style={{ width: '6px', height: '6px', background: COLORS.gold, transform: 'rotate(45deg)' }} />
                  </div>
                  <button onClick={() => movePlayer(1, 0)} className="flex items-center justify-center" style={{
                    width: '28px', height: '28px', background: COLORS.panelMid, border: `1px solid ${COLORS.gold}60`,
                    fontFamily: PIXEL_FONT, fontSize: '10px', color: COLORS.textGold,
                  }}>►</button>
                  <div />
                  <button onClick={() => movePlayer(0, 1)} className="flex items-center justify-center" style={{
                    width: '28px', height: '28px', background: COLORS.panelMid, border: `1px solid ${COLORS.gold}60`,
                    fontFamily: PIXEL_FONT, fontSize: '10px', color: COLORS.textGold,
                  }}>▼</button>
                  <div />
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {Object.entries(ROOM_EMOJI).filter(([k]) => k !== 'empty').map(([key, emoji]) => (
                  <div key={key} className="flex items-center gap-0.5">
                    <span style={{ fontSize: '10px' }}>{emoji}</span>
                    <PixelText size="xxs" color={COLORS.textGray}>{key === 'monster' ? 'Monstro' : key === 'treasure' ? 'Tesouro' : key === 'trap' ? 'Armadilha' : key === 'boss' ? 'Chefe' : key === 'stairs' ? 'Escadas' : 'Entrada'}</PixelText>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dungeon Complete */}
          {dungeonComplete && (
            <PixelFrame borderColor={COLORS.textGold} glow className="p-4 text-center">
              <PixelText size="lg" color={COLORS.textGold} bold glow as="div" className="mb-2">DUNGEON CONQUISTADA!</PixelText>
              <PixelSeparator />
              <PixelText size="xs" color={COLORS.textWhite} as="div">Monstros derrotados: {monstersKilled}</PixelText>
              <PixelText size="xs" color={COLORS.textGold} as="div">Ouro recolhido: {goldCollected}</PixelText>
            </PixelFrame>
          )}

          <div className="mt-2 text-center">
            <PixelText size="xxs" color={COLORS.textGray}>WASD ou setas para mover</PixelText>
          </div>
        </div>
      </PixelFrame>
    </PixelOverlay>
  );
}
