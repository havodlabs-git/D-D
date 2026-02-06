import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES, CLASS_ABILITIES, MONSTER_ABILITIES, MonsterAbility, getMonsterAbilities, rollDiceString } from "../../../shared/gameConstants";
import { CombatAnimation, DamageNumber, getSpellEffectType, getAttackEffectType, CombatAnimationStyles, VictoryAnimation, DefeatAnimation } from "./CombatAnimations";
import { audioSystem } from "@/lib/audioSystem";

// ═══════════════════════════════════════════════════════════
// PIXEL ART NANO BANANA STYLE - D&D GO COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════

const PIXEL_FONT = "'Press Start 2P', monospace";

// Class sprites
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

// Monster sprites
const MONSTER_SPRITES: Record<string, string> = {
  goblin: "/sprites/monsters/goblin.png",
  orc: "/sprites/monsters/orc.png",
  skeleton: "/sprites/monsters/skeleton.png",
  dragon: "/sprites/monsters/dragon.png",
  slime: "/sprites/monsters/slime.png",
  wolf: "/sprites/monsters/wolf.png",
  goblin_archer: "/sprites/monsters/goblin_archer.png",
  goblin_shaman: "/sprites/monsters/goblin_shaman.png",
  goblin_boss: "/sprites/monsters/goblin_boss.png",
  rat: "/sprites/monsters/rat_giant.png",
  rat_giant: "/sprites/monsters/rat_giant.png",
  kobold: "/sprites/monsters/kobold.png",
  zombie: "/sprites/monsters/zombie.png",
  spider: "/sprites/monsters/spider_giant.png",
  bandit: "/sprites/monsters/bandit.png",
  troll: "/sprites/monsters/troll.png",
  ogre: "/sprites/monsters/ogre.png",
  default: "/sprites/monsters/goblin.png",
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
  iconUrl?: string | null;
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
  type: "player" | "monster" | "system" | "ability";
  message: string;
  damage?: number;
  isCritical?: boolean;
}

interface ClassAbility {
  id: string;
  name: string;
  description: string;
  usesRemaining: number;
  maxUses: number;
  isActive?: boolean;
  bonusDamage?: number;
  isBonusAction?: boolean; // D&D 5e: true = bonus action, false = action
}

function getMonsterSprite(monsterType: string | undefined | null): string {
  if (!monsterType) return MONSTER_SPRITES.default;
  const type = monsterType.toLowerCase();
  return MONSTER_SPRITES[type] || MONSTER_SPRITES.default;
}

// ═══════════════════════════════════════════════════════════
// PIXEL ART UI COMPONENTS
// ═══════════════════════════════════════════════════════════

// Pixel border box - the core nano banana style element
function PixelBox({ children, className, borderColor = "#f59e0b", bgColor = "#1a1a2e" }: {
  children: React.ReactNode;
  className?: string;
  borderColor?: string;
  bgColor?: string;
}) {
  return (
    <div
      className={cn("relative", className)}
      style={{
        background: bgColor,
        border: `4px solid ${borderColor}`,
        boxShadow: `
          inset 0 0 0 2px ${bgColor},
          inset 0 0 0 4px ${borderColor}40,
          6px 6px 0 0 rgba(0,0,0,0.4),
          0 0 0 2px rgba(0,0,0,0.3)
        `,
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </div>
  );
}

// Pixel HP Bar
function PixelHPBar({ current, max, label, level, isPlayer = false }: {
  current: number;
  max: number;
  label: string;
  level: number;
  isPlayer?: boolean;
}) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = percentage > 50 ? '#22c55e' : percentage > 20 ? '#eab308' : '#ef4444';
  const segments = 20;
  const filledSegments = Math.ceil((percentage / 100) * segments);

  return (
    <PixelBox borderColor={isPlayer ? "#22c55e" : "#ef4444"} className="p-2">
      <div className="flex justify-between items-center mb-1">
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '9px', color: '#fff', textTransform: 'uppercase' }}>
          {label}
        </span>
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#f59e0b' }}>
          Nv.{level}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: '#ef4444' }}>HP</span>
        <div className="flex-1 h-4 bg-black/80 border-2 border-gray-700 flex gap-px p-px" style={{ imageRendering: 'pixelated' }}>
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              className="flex-1 transition-all duration-300"
              style={{
                background: i < filledSegments ? barColor : '#1a1a1a',
                boxShadow: i < filledSegments ? `0 0 2px ${barColor}40` : 'none',
              }}
            />
          ))}
        </div>
      </div>
      <div className="text-right mt-1">
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff' }}>
          {current}/{max}
        </span>
      </div>
    </PixelBox>
  );
}

// Pixel Button with retro RPG style
function PixelButton({ children, onClick, disabled, variant = 'default', small = false }: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'attack' | 'magic' | 'skill' | 'flee' | 'default' | 'close';
  small?: boolean;
}) {
  const styles: Record<string, { bg: string; border: string; shadow: string; hoverBg: string }> = {
    attack: { bg: '#dc2626', border: '#fbbf24', shadow: '#991b1b', hoverBg: '#ef4444' },
    magic: { bg: '#7c3aed', border: '#c084fc', shadow: '#5b21b6', hoverBg: '#8b5cf6' },
    skill: { bg: '#d97706', border: '#fbbf24', shadow: '#92400e', hoverBg: '#f59e0b' },
    flee: { bg: '#2563eb', border: '#60a5fa', shadow: '#1e40af', hoverBg: '#3b82f6' },
    default: { bg: '#374151', border: '#9ca3af', shadow: '#1f2937', hoverBg: '#4b5563' },
    close: { bg: '#991b1b', border: '#ef4444', shadow: '#7f1d1d', hoverBg: '#dc2626' },
  };

  const s = styles[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative text-white uppercase tracking-wider transition-all duration-100",
        "active:translate-y-1 disabled:opacity-40 disabled:cursor-not-allowed",
        small ? "px-2 py-1" : "px-4 py-3",
      )}
      style={{
        fontFamily: PIXEL_FONT,
        fontSize: small ? '7px' : '10px',
        background: s.bg,
        border: `3px solid ${s.border}`,
        boxShadow: `
          0 4px 0 0 ${s.shadow},
          0 6px 0 0 rgba(0,0,0,0.3),
          inset 0 1px 0 0 rgba(255,255,255,0.2)
        `,
        imageRendering: 'pixelated',
      }}
      onMouseEnter={(e) => { if (!disabled) (e.target as HTMLElement).style.background = s.hoverBg; }}
      onMouseLeave={(e) => { (e.target as HTMLElement).style.background = s.bg; }}
    >
      {children}
    </button>
  );
}

// Pixel Message Box with typewriter
function PixelMessageBox({ message, isTyping }: { message: string; isTyping: boolean }) {
  return (
    <PixelBox borderColor="#f59e0b" className="p-3 min-h-[60px]">
      <p style={{
        fontFamily: PIXEL_FONT,
        fontSize: '10px',
        color: '#fff',
        lineHeight: '1.8',
        textShadow: '1px 1px 0 rgba(0,0,0,0.5)',
      }}>
        {message}
        {isTyping && <span className="animate-pulse ml-1" style={{ color: '#f59e0b' }}>▼</span>}
      </p>
    </PixelBox>
  );
}

// Turn indicator showing what actions remain
function TurnIndicator({ actionUsed, bonusActionUsed, isPlayerTurn }: {
  actionUsed: boolean;
  bonusActionUsed: boolean;
  isPlayerTurn: boolean;
}) {
  if (!isPlayerTurn) return null;

  return (
    <div className="flex items-center gap-2 justify-center mb-1">
      <div className="flex items-center gap-1">
        <div
          className="w-3 h-3 border border-gray-600"
          style={{
            background: actionUsed ? '#374151' : '#22c55e',
            boxShadow: actionUsed ? 'none' : '0 0 4px #22c55e80',
            imageRendering: 'pixelated',
          }}
        />
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '6px', color: actionUsed ? '#6b7280' : '#22c55e' }}>
          AÇÃO
        </span>
      </div>
      <div className="flex items-center gap-1">
        <div
          className="w-3 h-3 border border-gray-600"
          style={{
            background: bonusActionUsed ? '#374151' : '#f59e0b',
            boxShadow: bonusActionUsed ? 'none' : '0 0 4px #f59e0b80',
            imageRendering: 'pixelated',
          }}
        />
        <span style={{ fontFamily: PIXEL_FONT, fontSize: '6px', color: bonusActionUsed ? '#6b7280' : '#f59e0b' }}>
          BÓNUS
        </span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMBAT SCREEN
// ═══════════════════════════════════════════════════════════

export function CombatScreenPokemon({ monster, latitude, longitude, onClose, onVictory, onDefeat }: CombatScreenProps) {
  const [monsterHealth, setMonsterHealth] = useState(monster.health);
  const [playerHealth, setPlayerHealth] = useState(0);
  const [maxPlayerHealth, setMaxPlayerHealth] = useState(0);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatEnded, setCombatEnded] = useState(false);
  const [showSpells, setShowSpells] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [usedSpellSlots, setUsedSpellSlots] = useState<Record<number, number>>({});
  const [isAttacking, setIsAttacking] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);

  // D&D 5e Turn Economy
  const [actionUsed, setActionUsed] = useState(false);
  const [bonusActionUsed, setBonusActionUsed] = useState(false);

  // Class ability states
  const [classAbilities, setClassAbilities] = useState<ClassAbility[]>([]);
  const [isRaging, setIsRaging] = useState(false);
  const [sneakAttackUsed, setSneakAttackUsed] = useState(false);
  const [layOnHandsPool, setLayOnHandsPool] = useState(0);
  const [damageResistance, setDamageResistance] = useState<string[]>([]);

  // Monster AI
  const [monsterAbilities] = useState<MonsterAbility[]>(() => getMonsterAbilities(monster.name));
  const [turnCount, setTurnCount] = useState(0);

  // Animation states
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationType, setAnimationType] = useState<'fireball' | 'lightning' | 'ice' | 'heal' | 'poison' | 'holy' | 'dark' | 'arcane' | 'slash' | 'pierce' | 'blunt'>('slash');
  const [animationTarget, setAnimationTarget] = useState<'player' | 'monster'>('monster');
  const [animationDamage, setAnimationDamage] = useState<number | undefined>(undefined);
  const [animationIsCritical, setAnimationIsCritical] = useState(false);
  const [showDamageNumber, setShowDamageNumber] = useState(false);
  const [damageNumberValue, setDamageNumberValue] = useState(0);
  const [damageNumberTarget, setDamageNumberTarget] = useState<'player' | 'monster'>('monster');
  const [damageNumberIsCritical, setDamageNumberIsCritical] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState({ experience: 0, gold: 0, leveledUp: false, newLevel: 1 });

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  const playerClass = character?.characterClass?.toLowerCase() || "fighter";

  // Initialize audio
  useEffect(() => {
    audioSystem.initialize();
    audioSystem.playSFX('encounter_start');
  }, []);

  // Typewriter effect
  const typeMessage = useCallback((message: string) => {
    setIsTyping(true);
    setCurrentMessage("");
    let charIndex = 0;
    const chars = message.split('');
    const interval = setInterval(() => {
      if (charIndex < chars.length) {
        setCurrentMessage(chars.slice(0, charIndex + 1).join(''));
        charIndex++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 25);
    return () => clearInterval(interval);
  }, []);

  const showDamage = useCallback((damage: number, target: 'player' | 'monster', isCritical: boolean = false) => {
    setDamageNumberValue(damage);
    setDamageNumberTarget(target);
    setDamageNumberIsCritical(isCritical);
    setShowDamageNumber(true);
    setTimeout(() => setShowDamageNumber(false), 1000);
  }, []);

  const playAnimation = useCallback((type: typeof animationType, target: 'player' | 'monster', damage?: number, isCritical?: boolean) => {
    setAnimationType(type);
    setAnimationTarget(target);
    setAnimationDamage(damage);
    setAnimationIsCritical(isCritical || false);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 800);
  }, []);

  // Initialize combat
  useEffect(() => {
    if (character) {
      const hp = character.currentHealth || 20;
      setPlayerHealth(hp);
      setMaxPlayerHealth(character.maxHealth || 20);
      typeMessage(`Um ${monster.name} selvagem apareceu!`);
      initializeClassAbilities();
      initializeSpells();
    }
  }, [character, monster.name, typeMessage]);

  const initializeClassAbilities = useCallback(() => {
    if (!character) return;
    const abilities: ClassAbility[] = [];
    const level = character.level || 1;
    const charClass = character.characterClass?.toLowerCase() || "";

    if (charClass === "barbarian") {
      abilities.push({
        id: "rage", name: "Fúria",
        description: "+2 dano, resistência física",
        usesRemaining: Math.max(2, Math.floor(level / 4) + 2),
        maxUses: Math.max(2, Math.floor(level / 4) + 2),
        bonusDamage: 2,
        isBonusAction: true, // Rage is a bonus action in D&D 5e
      });
    }

    if (charClass === "rogue") {
      abilities.push({
        id: "sneak_attack", name: "Ataque Furtivo",
        description: `+${Math.ceil(level / 2)}d6 dano`,
        usesRemaining: 999, maxUses: 999,
        bonusDamage: Math.ceil(level / 2) * 3,
        isBonusAction: false, // Sneak Attack is part of an attack action (free)
      });
    }

    if (charClass === "paladin") {
      abilities.push({
        id: "divine_smite", name: "Punição Divina",
        description: "+2d8 radiante",
        usesRemaining: 999, maxUses: 999,
        bonusDamage: 9,
        isBonusAction: false, // Divine Smite is part of an attack (free)
      });
      setLayOnHandsPool(level * 5);
    }

    if (charClass === "fighter") {
      abilities.push({
        id: "action_surge", name: "Surto de Ação",
        description: "Ação extra neste turno",
        usesRemaining: 1, maxUses: 1,
        isBonusAction: true, // Treating as bonus action (gives extra action)
      });
      abilities.push({
        id: "second_wind", name: "Retomar Fôlego",
        description: `Recupera 1d10+${level} HP`,
        usesRemaining: 1, maxUses: 1,
        isBonusAction: true, // Second Wind is a bonus action in D&D 5e
      });
    }

    if (charClass === "cleric") {
      abilities.push({
        id: "turn_undead", name: "Expulsar Mortos-Vivos",
        description: "Afasta mortos-vivos",
        usesRemaining: Math.max(1, Math.floor((level - 1) / 4) + 1),
        maxUses: Math.max(1, Math.floor((level - 1) / 4) + 1),
        isBonusAction: false, // Action
      });
    }

    if (charClass === "wizard") {
      abilities.push({
        id: "arcane_recovery", name: "Recuperação Arcana",
        description: "Recupera spell slots",
        usesRemaining: 1, maxUses: 1,
        isBonusAction: true, // Bonus action
      });
    }

    setClassAbilities(abilities);
  }, [character]);

  const initializeSpells = useCallback(() => {
    if (!character) return;
    const charClass = character.characterClass?.toLowerCase() || "";
    const spellcastingClasses = ["wizard", "cleric", "druid", "bard", "sorcerer", "warlock", "paladin", "ranger"];
    if (spellcastingClasses.includes(charClass)) {
      const knownSpellIds = character.knownSpells ? JSON.parse(character.knownSpells as string) : [];
      const classSpells = Object.values(SPELLS).filter(spell => {
        const classes = spell.classes as string[];
        const isClassSpell = classes.includes(character.characterClass);
        const isKnown = knownSpellIds.includes(spell.id) || spell.level === 0;
        const levelRequirement = spell.level <= Math.ceil(character.level / 2);
        return isClassSpell && (isKnown || spell.level === 0) && levelRequirement;
      });
      setAvailableSpells(classSpells);
    }
  }, [character]);

  const addLog = (type: CombatLog["type"], message: string, damage?: number, isCritical?: boolean) => {
    setCombatLogs((prev) => [...prev.slice(-9), { type, message, damage, isCritical }]);
  };

  const rollDice = (dice: string): number => {
    const match = dice.match(/(\d+)d(\d+)/);
    if (!match) return 0;
    const [, count, sides] = match;
    let total = 0;
    for (let i = 0; i < parseInt(count); i++) {
      total += Math.floor(Math.random() * parseInt(sides)) + 1;
    }
    return total;
  };

  // ═══════════════════════════════════════════════════════════
  // D&D 5e TURN LOGIC
  // After using action AND bonus action (or choosing to end), monster turn starts
  // ═══════════════════════════════════════════════════════════

  const checkEndTurn = useCallback(() => {
    // If action is used and no bonus actions available (or bonus also used), end turn
    // The player can also manually end turn
    if (actionUsed) {
      // Check if there are any bonus actions available
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        // End player turn, start monster turn
        setTimeout(() => {
          setIsPlayerTurn(false);
          setShowMenu(false);
          handleMonsterTurn();
        }, 1200);
        return true;
      }
    }
    return false;
  }, [actionUsed, bonusActionUsed, classAbilities]);

  const endTurnManually = useCallback(() => {
    if (!isPlayerTurn || combatEnded) return;
    setShowMenu(false);
    setTimeout(() => {
      setIsPlayerTurn(false);
      handleMonsterTurn();
    }, 500);
  }, [isPlayerTurn, combatEnded]);

  // Handle attack (uses ACTION)
  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded || !character || actionUsed) return;

    setShowMenu(false);
    setShowSpells(false);
    setShowAbilities(false);
    setIsAttacking(true);
    setActionUsed(true);
    audioSystem.playSFX('attack_hit');

    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const attackBonus = Math.floor((character.strength - 10) / 2) + Math.floor(character.level / 4);
    const totalAttack = attackRoll + attackBonus;
    const isCritical = attackRoll === 20;
    const isMiss = attackRoll === 1 || totalAttack < monster.armor;

    if (isMiss && attackRoll !== 1) {
      typeMessage(`Ataque erra! (${totalAttack} vs AC ${monster.armor})`);
      audioSystem.playSFX('attack_miss');
      addLog("player", `Errou! (${totalAttack} vs AC ${monster.armor})`);
    } else if (attackRoll === 1) {
      typeMessage(`Falha crítica! O ataque erra completamente!`);
      audioSystem.playSFX('attack_miss');
      addLog("player", "Falha crítica!");
    } else {
      let baseDamage = Math.floor(Math.random() * 8) + 1 + Math.floor((character.strength - 10) / 2);
      if (isRaging) baseDamage += 2;
      if (isCritical) baseDamage *= 2;
      const finalDamage = Math.max(1, baseDamage);

      playAnimation('slash', 'monster', finalDamage, isCritical);
      showDamage(finalDamage, 'monster', isCritical);
      setMonsterHealth((prev) => Math.max(0, prev - finalDamage));
      setIsMonsterHit(true);
      setTimeout(() => setIsMonsterHit(false), 300);

      if (isCritical) {
        typeMessage(`CRÍTICO! ${finalDamage} de dano a ${monster.name}!`);
        addLog("player", `Crítico! ${finalDamage} dano`, finalDamage, true);
      } else {
        typeMessage(`${finalDamage} de dano a ${monster.name}!`);
        addLog("player", `Ataque: ${finalDamage} dano`, finalDamage);
      }

      if (monsterHealth - finalDamage <= 0) {
        handleVictory();
        return;
      }
    }

    setIsAttacking(false);

    // After action, check if turn should end
    setTimeout(() => {
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        setTimeout(() => {
          setIsPlayerTurn(false);
          setShowMenu(false);
          handleMonsterTurn();
        }, 800);
      } else {
        // Still has bonus action available - show menu again
        setShowMenu(true);
        typeMessage(`Ação usada! Ainda tens Ação Bónus disponível.`);
      }
    }, 800);
  };

  // Handle spell cast (uses ACTION)
  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded || !character || actionUsed) return;

    if (spell.level > 0) {
      const maxSlots = SPELL_SLOTS_BY_LEVEL[character.level]?.[spell.level] || 0;
      const usedSlots = usedSpellSlots[spell.level] || 0;
      if (usedSlots >= maxSlots) {
        toast.error("Sem spell slots!");
        return;
      }
      setUsedSpellSlots(prev => ({ ...prev, [spell.level]: (prev[spell.level] || 0) + 1 }));
    }

    setShowSpells(false);
    setShowMenu(false);
    setActionUsed(true);
    audioSystem.playSFX('spell_cast');

    const spellEffect = getSpellEffectType(spell.school);

    if (spell.damage) {
      const damage = rollDice(spell.damage.dice);
      playAnimation(spellEffect, 'monster', damage);
      showDamage(damage, 'monster');
      setMonsterHealth((prev) => Math.max(0, prev - damage));
      setIsMonsterHit(true);
      setTimeout(() => setIsMonsterHit(false), 300);
      typeMessage(`${spell.name}! ${damage} de dano ${spell.damage.type}!`);
      addLog("player", `${spell.name}: ${damage} dano`, damage);

      if (monsterHealth - damage <= 0) {
        handleVictory();
        return;
      }
    } else if (spell.healing) {
      const healing = rollDice(spell.healing.dice);
      playAnimation('heal', 'player', healing);
      setPlayerHealth((prev) => Math.min(maxPlayerHealth, prev + healing));
      audioSystem.playSFX('spell_heal');
      typeMessage(`${spell.name}! +${healing} HP!`);
      addLog("player", `${spell.name}: +${healing} HP`, healing);
    }

    // After action, check if turn should end
    setTimeout(() => {
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        setTimeout(() => {
          setIsPlayerTurn(false);
          setShowMenu(false);
          handleMonsterTurn();
        }, 800);
      } else {
        setShowMenu(true);
        typeMessage(`Magia lançada! Ainda tens Ação Bónus.`);
      }
    }, 800);
  };

  // Handle ability use (ACTION or BONUS ACTION depending on ability)
  const handleUseAbility = async (ability: ClassAbility) => {
    if (!isPlayerTurn || combatEnded || !character) return;

    // Check if the right action type is available
    if (ability.isBonusAction && bonusActionUsed) {
      toast.error("Ação Bónus já usada neste turno!");
      return;
    }
    if (!ability.isBonusAction && actionUsed) {
      toast.error("Ação já usada neste turno!");
      return;
    }

    if (ability.usesRemaining <= 0 && ability.maxUses !== 999) {
      toast.error("Habilidade esgotada!");
      return;
    }

    setShowAbilities(false);
    setShowMenu(false);

    // Mark the correct action type as used
    if (ability.isBonusAction) {
      setBonusActionUsed(true);
    } else {
      setActionUsed(true);
    }

    // Update ability uses
    if (ability.maxUses !== 999) {
      setClassAbilities(prev => prev.map(a =>
        a.id === ability.id ? { ...a, usesRemaining: a.usesRemaining - 1 } : a
      ));
    }

    switch (ability.id) {
      case 'rage':
        setIsRaging(true);
        setDamageResistance(['bludgeoning', 'piercing', 'slashing']);
        typeMessage(`FÚRIA! +2 dano e resistência física!`);
        addLog("ability", "Fúria ativada!");
        audioSystem.playSFX('menu_confirm');
        break;

      case 'second_wind':
        const healing = rollDice('1d10') + (character.level || 1);
        setPlayerHealth(prev => Math.min(maxPlayerHealth, prev + healing));
        playAnimation('heal', 'player', healing);
        typeMessage(`Retomar Fôlego! +${healing} HP!`);
        addLog("ability", `Retomar Fôlego: +${healing} HP`, healing);
        audioSystem.playSFX('spell_heal');
        break;

      case 'action_surge': {
        // Action Surge: grants an additional action this turn
        setActionUsed(false); // Reset action so player can attack again!
        typeMessage(`Surto de Ação! Ganhas uma ação extra!`);
        addLog("ability", "Surto de Ação!");
        audioSystem.playSFX('menu_confirm');
        break;
      }

      case 'sneak_attack':
        const sneakDamage = rollDice(`${Math.ceil((character.level || 1) / 2)}d6`);
        setMonsterHealth(prev => Math.max(0, prev - sneakDamage));
        playAnimation('pierce', 'monster', sneakDamage, true);
        showDamage(sneakDamage, 'monster', true);
        typeMessage(`Ataque Furtivo! ${sneakDamage} de dano!`);
        addLog("ability", `Furtivo: ${sneakDamage} dano`, sneakDamage, true);
        audioSystem.playSFX('attack_critical');
        setSneakAttackUsed(true);
        if (monsterHealth - sneakDamage <= 0) { handleVictory(); return; }
        break;

      case 'divine_smite':
        const smiteDamage = rollDice('2d8');
        setMonsterHealth(prev => Math.max(0, prev - smiteDamage));
        playAnimation('holy', 'monster', smiteDamage, true);
        showDamage(smiteDamage, 'monster', true);
        typeMessage(`Punição Divina! ${smiteDamage} radiante!`);
        addLog("ability", `Punição: ${smiteDamage} dano`, smiteDamage, true);
        audioSystem.playSFX('spell_heal');
        if (monsterHealth - smiteDamage <= 0) { handleVictory(); return; }
        break;

      default:
        typeMessage(`${ability.name} usado!`);
        addLog("ability", `${ability.name}!`);
    }

    // After ability, check if turn should end
    setTimeout(() => {
      const newActionUsed = ability.isBonusAction ? actionUsed : true;
      const newBonusUsed = ability.isBonusAction ? true : bonusActionUsed;
      // Special case: Action Surge resets action
      const effectiveActionUsed = ability.id === 'action_surge' ? false : newActionUsed;

      const hasBonusActions = classAbilities.some(a =>
        a.isBonusAction && a.id !== ability.id && (a.usesRemaining > 0 || a.maxUses === 999)
      );

      if (effectiveActionUsed && (newBonusUsed || !hasBonusActions)) {
        setTimeout(() => {
          setIsPlayerTurn(false);
          setShowMenu(false);
          handleMonsterTurn();
        }, 800);
      } else {
        setShowMenu(true);
        if (ability.id === 'action_surge') {
          typeMessage(`Surto de Ação! Podes atacar novamente!`);
        } else if (!effectiveActionUsed) {
          typeMessage(`${ability.name} usado! Ainda tens a tua Ação.`);
        } else {
          typeMessage(`${ability.name} usado! Turno a terminar...`);
        }
      }
    }, 800);
  };

  // Handle flee (uses ACTION)
  const handleFlee = async () => {
    if (!isPlayerTurn || combatEnded || actionUsed) return;

    setShowMenu(false);
    setActionUsed(true);

    const fleeRoll = Math.random();
    if (fleeRoll > 0.5) {
      typeMessage(`Conseguiste fugir!`);
      audioSystem.playSFX('menu_cancel');
      setTimeout(() => onClose(), 1500);
    } else {
      typeMessage(`Não conseguiste fugir!`);
      audioSystem.playSFX('attack_miss');
      setTimeout(() => {
        setIsPlayerTurn(false);
        handleMonsterTurn();
      }, 1500);
    }
  };

  // Monster turn
  const handleMonsterTurn = () => {
    if (combatEnded) return;
    setTurnCount(prev => prev + 1);

    setTimeout(() => {
      const attackRoll = Math.floor(Math.random() * 20) + 1;
      const monsterAttackBonus = Math.floor(monster.level / 2);
      const playerAC = 10 + Math.floor(((character?.dexterity || 10) - 10) / 2);
      const isCritical = attackRoll === 20;
      const isMiss = attackRoll === 1 || (attackRoll + monsterAttackBonus) < playerAC;

      if (isMiss) {
        typeMessage(`${monster.name} ataca... Mas erra!`);
        audioSystem.playSFX('attack_miss');
        addLog("monster", `${monster.name} errou!`);
      } else {
        let damage = monster.damage + Math.floor(Math.random() * 4);
        if (damageResistance.length > 0) damage = Math.floor(damage / 2);
        if (isCritical) {
          damage *= 2;
          audioSystem.playSFX('attack_critical');
        } else {
          audioSystem.playSFX('player_hit');
        }

        playAnimation('slash', 'player', damage, isCritical);
        showDamage(damage, 'player', isCritical);
        setPlayerHealth(prev => Math.max(0, prev - damage));
        setIsPlayerHit(true);
        setTimeout(() => setIsPlayerHit(false), 300);

        if (isCritical) {
          typeMessage(`${monster.name} CRÍTICO! ${damage} de dano!`);
          addLog("monster", `Crítico: ${damage} dano!`, damage, true);
        } else {
          typeMessage(`${monster.name} ataca! ${damage} de dano!`);
          addLog("monster", `${damage} dano`, damage);
        }

        if (playerHealth - damage <= 0) {
          handleDefeat();
          return;
        }
      }

      // New player turn - reset action economy
      setTimeout(() => {
        setIsPlayerTurn(true);
        setActionUsed(false);
        setBonusActionUsed(false);
        setSneakAttackUsed(false);
        setShowMenu(true);
        typeMessage(`O que ${character?.name || 'Herói'} vai fazer?`);
      }, 1500);
    }, 1000);
  };

  // Victory
  const handleVictory = () => {
    setCombatEnded(true);
    audioSystem.playSFX('victory');
    const tierMultiplier = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 };
    const multiplier = tierMultiplier[monster.tier as keyof typeof tierMultiplier] || 1;
    const experience = Math.floor((monster.level * 10 + 20) * multiplier);
    const gold = Math.floor((monster.level * 5 + 10) * multiplier);
    setVictoryRewards({ experience, gold, leveledUp: false, newLevel: character?.level || 1 });
    typeMessage(`${monster.name} foi derrotado!`);
    setTimeout(() => setShowVictory(true), 1500);
  };

  // Defeat
  const handleDefeat = () => {
    setCombatEnded(true);
    audioSystem.playSFX('defeat');
    typeMessage(`Foste derrotado...`);
    setTimeout(() => setShowDefeat(true), 1500);
  };

  const monsterSprite = getMonsterSprite(monster.monsterType);
  const playerSprite = CLASS_SPRITES[playerClass] || CLASS_SPRITES.fighter;

  // ═══════════════════════════════════════════════════════════
  // RENDER - PIXEL ART NANO BANANA STYLE
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999, background: '#0a0a1a', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CombatAnimationStyles />

      {/* ═══ BATTLE ARENA ═══ */}
      <div
        className="relative overflow-hidden"
        style={{
          height: '55vh',
          background: `
            linear-gradient(180deg,
              #4a90c2 0%,
              #6bb5e0 25%,
              #87CEEB 45%,
              #87CEEB 55%,
              #2d8a4e 55%,
              #228B22 65%,
              #1a6b1a 100%
            )
          `,
          imageRendering: 'pixelated',
        }}
      >
        {/* Pixel scanline overlay for retro feel */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          }}
        />

        {/* Ground pattern */}
        <div
          className="absolute bottom-0 left-0 right-0 pointer-events-none"
          style={{
            height: '45%',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 30px,
                rgba(0,0,0,0.05) 30px,
                rgba(0,0,0,0.05) 32px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 30px,
                rgba(0,0,0,0.05) 30px,
                rgba(0,0,0,0.05) 32px
              )
            `,
          }}
        />

        {/* Close button - pixel style */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-50 w-8 h-8 flex items-center justify-center"
          style={{
            background: '#991b1b',
            border: '2px solid #ef4444',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
            fontFamily: PIXEL_FONT,
            fontSize: '10px',
            color: '#fff',
            imageRendering: 'pixelated',
          }}
        >
          X
        </button>

        {/* ═══ MONSTER (top right) ═══ */}
        <div className="absolute top-2 right-2 w-40 z-10">
          <PixelHPBar
            current={monsterHealth}
            max={monster.health}
            label={monster.name}
            level={monster.level}
          />
        </div>

        {/* Monster platform */}
        <div className="absolute top-12 right-4 w-32 z-5">
          <div
            className={cn(
              "w-32 h-32 transition-all duration-200",
              isMonsterHit && "brightness-200 translate-x-2",
              monsterHealth <= 0 && "opacity-0 scale-0"
            )}
          >
            <img
              src={monsterSprite}
              alt={monster.name}
              className="w-full h-full object-contain drop-shadow-lg"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          {/* Shadow under monster */}
          <div
            className="mx-auto -mt-2 opacity-30"
            style={{
              width: '80px',
              height: '12px',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* ═══ PLAYER (bottom left) ═══ */}
        <div className="absolute bottom-2 left-3 w-40 z-10">
          <PixelHPBar
            current={playerHealth}
            max={maxPlayerHealth}
            label={character?.name || "Herói"}
            level={character?.level || 1}
            isPlayer
          />
        </div>

        {/* Player sprite */}
        <div
          className={cn(
            "absolute bottom-8 left-6 w-32 h-32 transition-all duration-200 z-5",
            isPlayerHit && "brightness-200 -translate-x-2",
            isAttacking && "translate-x-4"
          )}
        >
          <img
            src={playerSprite}
            alt="Player"
            className="w-full h-full object-contain transform scale-x-[-1] drop-shadow-lg"
            style={{ imageRendering: 'pixelated' }}
          />
          {/* Shadow under player */}
          <div
            className="mx-auto -mt-2 opacity-30"
            style={{
              width: '100px',
              height: '14px',
              background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Combat animations */}
        {showAnimation && (
          <CombatAnimation
            type={animationType}
            target={animationTarget}
            damage={animationDamage}
            isCritical={animationIsCritical}
          />
        )}

        {/* Damage numbers */}
        {showDamageNumber && (
          <DamageNumber
            value={damageNumberValue}
            target={damageNumberTarget}
            isCritical={damageNumberIsCritical}
          />
        )}
      </div>

      {/* ═══ BOTTOM UI PANEL ═══ */}
      <div
        style={{
          height: '45vh',
          background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a2e 100%)',
          borderTop: '4px solid #f59e0b',
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          overflowY: 'auto',
        }}
      >
        {/* Turn indicator */}
        <TurnIndicator
          actionUsed={actionUsed}
          bonusActionUsed={bonusActionUsed}
          isPlayerTurn={isPlayerTurn}
        />

        {/* Message box */}
        <PixelMessageBox message={currentMessage} isTyping={isTyping} />

        {/* Action menu */}
        {showMenu && isPlayerTurn && !combatEnded && (
          <div className="grid grid-cols-2 gap-2">
            <PixelButton variant="attack" onClick={handleAttack} disabled={actionUsed}>
              ⚔️ LUTAR
            </PixelButton>
            <PixelButton variant="magic" onClick={() => { setShowSpells(!showSpells); setShowAbilities(false); }} disabled={actionUsed}>
              ✨ MAGIAS
            </PixelButton>
            <PixelButton variant="skill" onClick={() => { setShowAbilities(!showAbilities); setShowSpells(false); }}>
              🛡️ SKILLS
            </PixelButton>
            <PixelButton variant="flee" onClick={handleFlee} disabled={actionUsed}>
              🏃 FUGIR
            </PixelButton>
          </div>
        )}

        {/* End turn button (when action used but bonus available) */}
        {showMenu && isPlayerTurn && !combatEnded && actionUsed && !bonusActionUsed && (
          <PixelButton variant="default" onClick={endTurnManually} small>
            ⏭️ TERMINAR TURNO
          </PixelButton>
        )}

        {/* Spells menu */}
        {showSpells && (
          <PixelBox borderColor="#7c3aed" className="p-3 max-h-40 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#c084fc' }}>MAGIAS</span>
              <button onClick={() => setShowSpells(false)} style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#ef4444' }}>X</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {availableSpells.length === 0 && (
                <span style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: '#6b7280' }}>Sem magias disponíveis</span>
              )}
              {availableSpells.map((spell) => (
                <button
                  key={spell.id}
                  onClick={() => handleCastSpell(spell)}
                  disabled={actionUsed}
                  className="p-2 text-left transition-all hover:brightness-125 disabled:opacity-40"
                  style={{
                    background: '#2d1b69',
                    border: '2px solid #7c3aed',
                    imageRendering: 'pixelated',
                  }}
                >
                  <div style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: '#fff' }}>{spell.name}</div>
                  <div style={{ fontFamily: PIXEL_FONT, fontSize: '6px', color: '#a78bfa' }}>
                    {spell.damage?.dice || spell.healing?.dice || '—'}
                  </div>
                </button>
              ))}
            </div>
          </PixelBox>
        )}

        {/* Abilities menu */}
        {showAbilities && (
          <PixelBox borderColor="#d97706" className="p-3 max-h-40 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fbbf24' }}>HABILIDADES</span>
              <button onClick={() => setShowAbilities(false)} style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: '#ef4444' }}>X</button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              {classAbilities.length === 0 && (
                <span style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: '#6b7280' }}>Sem habilidades</span>
              )}
              {classAbilities.map((ability) => {
                const isDisabled = ability.isBonusAction ? bonusActionUsed : actionUsed;
                const usesOk = ability.usesRemaining > 0 || ability.maxUses === 999;
                return (
                  <button
                    key={ability.id}
                    onClick={() => handleUseAbility(ability)}
                    disabled={isDisabled || !usesOk}
                    className="p-2 text-left transition-all hover:brightness-125 disabled:opacity-40"
                    style={{
                      background: '#4a2800',
                      border: `2px solid ${ability.isBonusAction ? '#f59e0b' : '#22c55e'}`,
                      imageRendering: 'pixelated',
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: ability.isBonusAction ? '#f59e0b' : '#22c55e' }}
                        title={ability.isBonusAction ? 'Ação Bónus' : 'Ação'}
                      />
                      <span style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: '#fff' }}>{ability.name}</span>
                    </div>
                    <div style={{ fontFamily: PIXEL_FONT, fontSize: '6px', color: '#d4d4d4' }}>{ability.description}</div>
                    {ability.maxUses !== 999 && (
                      <div style={{ fontFamily: PIXEL_FONT, fontSize: '6px', color: '#fbbf24' }}>
                        {ability.usesRemaining}/{ability.maxUses}
                      </div>
                    )}
                    <div style={{ fontFamily: PIXEL_FONT, fontSize: '5px', color: ability.isBonusAction ? '#f59e0b' : '#22c55e' }}>
                      {ability.isBonusAction ? '● BÓNUS' : '● AÇÃO'}
                    </div>
                  </button>
                );
              })}
            </div>
          </PixelBox>
        )}
      </div>

      {/* Victory */}
      {showVictory && (
        <VictoryAnimation
          experience={victoryRewards.experience}
          gold={victoryRewards.gold}
          leveledUp={victoryRewards.leveledUp}
          newLevel={victoryRewards.newLevel}
          onComplete={() => onVictory(victoryRewards)}
        />
      )}

      {/* Defeat */}
      {showDefeat && (
        <DefeatAnimation onComplete={onDefeat} />
      )}
    </div>
  );
}
