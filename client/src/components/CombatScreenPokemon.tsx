import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES, CLASS_ABILITIES, MONSTER_ABILITIES, MonsterAbility, getMonsterAbilities, rollDiceString } from "../../../shared/gameConstants";
import { CombatAnimation, DamageNumber, getSpellEffectType, getAttackEffectType, CombatAnimationStyles, VictoryAnimation, DefeatAnimation } from "./CombatAnimations";
import { audioSystem } from "@/lib/audioSystem";

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
  druid: "/sprites/classes/druid.png",
  monk: "/sprites/classes/monk.png",
  sorcerer: "/sprites/classes/sorcerer.png",
  warlock: "/sprites/classes/warlock.png",
};

// Monster sprites mapping
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
}

function getMonsterSprite(monsterType: string | undefined | null): string {
  if (!monsterType) return MONSTER_SPRITES.default;
  const type = monsterType.toLowerCase();
  return MONSTER_SPRITES[type] || MONSTER_SPRITES.default;
}

// Pixel Art styled button component
function PixelButton({ 
  children, 
  onClick, 
  disabled, 
  className,
  variant = 'default'
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  disabled?: boolean;
  className?: string;
  variant?: 'default' | 'fight' | 'bag' | 'run' | 'skills';
}) {
  const variantStyles = {
    default: 'bg-gray-700 hover:bg-gray-600 border-gray-500',
    fight: 'bg-orange-600 hover:bg-orange-500 border-orange-400',
    bag: 'bg-yellow-600 hover:bg-yellow-500 border-yellow-400',
    run: 'bg-blue-600 hover:bg-blue-500 border-blue-400',
    skills: 'bg-purple-600 hover:bg-purple-500 border-purple-400',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 font-bold text-white uppercase tracking-wider",
        "border-2 border-b-4 active:border-b-2 active:translate-y-0.5",
        "transition-all duration-100",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "[image-rendering:pixelated]",
        variantStyles[variant],
        className
      )}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '10px',
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  );
}

// HP Bar component styled like Pokémon
function HPBar({ current, max, label, isPlayer = false }: { current: number; max: number; label: string; isPlayer?: boolean }) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));
  const barColor = percentage > 50 ? 'bg-green-500' : percentage > 20 ? 'bg-yellow-500' : 'bg-red-500';
  
  return (
    <div className={cn(
      "p-2 rounded",
      isPlayer ? "bg-gray-800/90" : "bg-gray-800/90",
      "border-2 border-gray-600"
    )}>
      <div className="flex justify-between items-center mb-1">
        <span className="text-white font-bold text-xs uppercase" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}>
          {label}
        </span>
        <span className="text-white text-xs" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}>
          Lv.{isPlayer ? '?' : '?'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-yellow-400 text-xs font-bold" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}>HP</span>
        <div className="flex-1 h-3 bg-gray-900 rounded-sm border border-gray-700 overflow-hidden">
          <div 
            className={cn("h-full transition-all duration-500", barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <div className="text-right mt-1">
        <span className="text-white text-xs" style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '8px' }}>
          {current}/{max}
        </span>
      </div>
    </div>
  );
}

// Message box with typewriter effect
function MessageBox({ message, isTyping }: { message: string; isTyping: boolean }) {
  return (
    <div 
      className="bg-gray-900/95 border-4 border-gray-600 rounded-lg p-4 min-h-[80px]"
      style={{ 
        borderStyle: 'solid',
        boxShadow: 'inset 0 0 0 2px #1a1a2e',
      }}
    >
      <p 
        className="text-white leading-relaxed"
        style={{ 
          fontFamily: "'Press Start 2P', monospace", 
          fontSize: '12px',
          lineHeight: '1.8',
        }}
      >
        {message}
        {isTyping && <span className="animate-pulse">▼</span>}
      </p>
    </div>
  );
}

export function CombatScreenPokemon({ monster, latitude, longitude, onClose, onVictory, onDefeat }: CombatScreenProps) {
  const [monsterHealth, setMonsterHealth] = useState(monster.health);
  const [playerHealth, setPlayerHealth] = useState(0);
  const [maxPlayerHealth, setMaxPlayerHealth] = useState(0);
  const [combatLogs, setCombatLogs] = useState<CombatLog[]>([]);
  const [isPlayerTurn, setIsPlayerTurn] = useState(true);
  const [combatEnded, setCombatEnded] = useState(false);
  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [showSpells, setShowSpells] = useState(false);
  const [showAbilities, setShowAbilities] = useState(false);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<ClassAbility | null>(null);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [usedSpellSlots, setUsedSpellSlots] = useState<Record<number, number>>({});
  const [isAttacking, setIsAttacking] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [currentMessage, setCurrentMessage] = useState<string>("");
  const [messageQueue, setMessageQueue] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  
  // Class ability states
  const [classAbilities, setClassAbilities] = useState<ClassAbility[]>([]);
  const [isRaging, setIsRaging] = useState(false);
  const [sneakAttackUsed, setSneakAttackUsed] = useState(false);
  const [layOnHandsPool, setLayOnHandsPool] = useState(0);
  const [hasAdvantage, setHasAdvantage] = useState(false);
  const [damageResistance, setDamageResistance] = useState<string[]>([]);
  
  // Monster AI states
  const [monsterAbilities] = useState<MonsterAbility[]>(() => getMonsterAbilities(monster.name));
  const [monsterAbilityCooldowns, setMonsterAbilityCooldowns] = useState<Record<string, number>>({});
  const [monsterBuffs, setMonsterBuffs] = useState<Array<{ type: string; duration: number; value: number }>>([]);
  const [playerDebuffs, setPlayerDebuffs] = useState<Array<{ type: string; duration: number; value: number }>>([]);
  const [turnCount, setTurnCount] = useState(0);

  // Animation states
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationType, setAnimationType] = useState<'fireball' | 'lightning' | 'ice' | 'heal' | 'poison' | 'holy' | 'dark' | 'arcane' | 'slash' | 'pierce' | 'blunt'>('slash');
  const [animationTarget, setAnimationTarget] = useState<'player' | 'monster'>('monster');
  const [animationDamage, setAnimationDamage] = useState<number | undefined>(undefined);
  const [animationIsHeal, setAnimationIsHeal] = useState(false);
  const [animationIsCritical, setAnimationIsCritical] = useState(false);
  
  // Damage number display
  const [showDamageNumber, setShowDamageNumber] = useState(false);
  const [damageNumberValue, setDamageNumberValue] = useState(0);
  const [damageNumberTarget, setDamageNumberTarget] = useState<'player' | 'monster'>('monster');
  const [damageNumberIsCritical, setDamageNumberIsCritical] = useState(false);
  
  // Victory/Defeat animations
  const [showVictory, setShowVictory] = useState(false);
  const [showDefeat, setShowDefeat] = useState(false);
  const [victoryRewards, setVictoryRewards] = useState({ experience: 0, gold: 0, leveledUp: false, newLevel: 1 });

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  // Get class data
  const classData = character?.characterClass ? CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES] : null;
  const playerClass = character?.characterClass?.toLowerCase() || "fighter";

  // Initialize audio
  useEffect(() => {
    audioSystem.initialize();
    audioSystem.playSFX('encounter_start');
  }, []);

  // Typewriter effect for messages
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
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Show damage number
  const showDamage = useCallback((damage: number, target: 'player' | 'monster', isCritical: boolean = false) => {
    setDamageNumberValue(damage);
    setDamageNumberTarget(target);
    setDamageNumberIsCritical(isCritical);
    setShowDamageNumber(true);
    setTimeout(() => setShowDamageNumber(false), 1000);
  }, []);

  // Play animation
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
      
      // Initialize class abilities
      initializeClassAbilities();
      
      // Initialize spells
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
        id: "rage",
        name: "Fúria",
        description: "+2 dano, resistência a dano físico",
        usesRemaining: Math.max(2, Math.floor(level / 4) + 2),
        maxUses: Math.max(2, Math.floor(level / 4) + 2),
        bonusDamage: 2
      });
    }
    
    if (charClass === "rogue") {
      abilities.push({
        id: "sneak_attack",
        name: "Ataque Furtivo",
        description: `+${Math.ceil(level / 2)}d6 dano extra`,
        usesRemaining: 999,
        maxUses: 999,
        bonusDamage: Math.ceil(level / 2) * 3
      });
    }
    
    if (charClass === "paladin") {
      abilities.push({
        id: "divine_smite",
        name: "Punição Divina",
        description: "+2d8 dano radiante (gasta spell slot)",
        usesRemaining: 999,
        maxUses: 999,
        bonusDamage: 9
      });
      setLayOnHandsPool(level * 5);
    }
    
    if (charClass === "fighter") {
      abilities.push({
        id: "action_surge",
        name: "Surto de Ação",
        description: "Ataque extra neste turno",
        usesRemaining: 1,
        maxUses: 1
      });
      abilities.push({
        id: "second_wind",
        name: "Retomar Fôlego",
        description: `Recupera 1d10+${level} HP`,
        usesRemaining: 1,
        maxUses: 1
      });
    }
    
    if (charClass === "cleric") {
      abilities.push({
        id: "turn_undead",
        name: "Expulsar Mortos-Vivos",
        description: "Afasta mortos-vivos por 1 minuto",
        usesRemaining: Math.max(1, Math.floor((level - 1) / 4) + 1),
        maxUses: Math.max(1, Math.floor((level - 1) / 4) + 1),
      });
    }
    
    if (charClass === "wizard") {
      abilities.push({
        id: "arcane_recovery",
        name: "Recuperação Arcana",
        description: "Recupera spell slots",
        usesRemaining: 1,
        maxUses: 1,
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

  // Roll dice helper
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

  // Handle attack
  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded || !character) return;
    
    setShowMenu(false);
    setIsAttacking(true);
    audioSystem.playSFX('attack_hit');
    
    // Roll to hit (d20 + modifier)
    const attackRoll = Math.floor(Math.random() * 20) + 1;
    const attackBonus = Math.floor((character.strength - 10) / 2) + Math.floor(character.level / 4);
    const totalAttack = attackRoll + attackBonus;
    
    const isCritical = attackRoll === 20;
    const isMiss = attackRoll === 1 || totalAttack < monster.armor;
    
    if (isMiss && attackRoll !== 1) {
      typeMessage(`Você ataca ${monster.name}... Mas erra! (${totalAttack} vs AC ${monster.armor})`);
      audioSystem.playSFX('attack_miss');
      addLog("player", `Ataque errou! (${totalAttack} vs AC ${monster.armor})`);
    } else if (attackRoll === 1) {
      typeMessage(`Falha crítica! Seu ataque erra completamente!`);
      audioSystem.playSFX('attack_miss');
      addLog("player", "Falha crítica!");
    } else {
      // Calculate damage
      let baseDamage = Math.floor(Math.random() * 8) + 1 + Math.floor((character.strength - 10) / 2);
      
      // Add rage bonus if active
      if (isRaging) {
        baseDamage += 2;
      }
      
      // Double damage on critical
      if (isCritical) {
        baseDamage *= 2;
        audioSystem.playSFX('attack_critical');
      }
      
      const finalDamage = Math.max(1, baseDamage);
      
      // Play animation
      playAnimation('slash', 'monster', finalDamage, isCritical);
      showDamage(finalDamage, 'monster', isCritical);
      
      setMonsterHealth((prev) => Math.max(0, prev - finalDamage));
      setIsMonsterHit(true);
      setTimeout(() => setIsMonsterHit(false), 300);
      
      if (isCritical) {
        typeMessage(`CRÍTICO! Você causa ${finalDamage} de dano a ${monster.name}!`);
        addLog("player", `Ataque crítico! ${finalDamage} de dano!`, finalDamage, true);
      } else {
        typeMessage(`Você ataca ${monster.name} e causa ${finalDamage} de dano!`);
        addLog("player", `Ataque: ${finalDamage} de dano`, finalDamage);
      }
      
      // Check if monster is defeated
      if (monsterHealth - finalDamage <= 0) {
        handleVictory();
        return;
      }
    }
    
    setIsAttacking(false);
    
    // Monster turn after delay
    setTimeout(() => {
      setIsPlayerTurn(false);
      handleMonsterTurn();
    }, 1500);
  };

  // Handle spell cast
  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded || !character) return;
    
    // Check spell slots
    if (spell.level > 0) {
      const maxSlots = SPELL_SLOTS_BY_LEVEL[character.level]?.[spell.level] || 0;
      const usedSlots = usedSpellSlots[spell.level] || 0;
      if (usedSlots >= maxSlots) {
        toast.error("Sem spell slots disponíveis!");
        return;
      }
      setUsedSpellSlots(prev => ({ ...prev, [spell.level]: (prev[spell.level] || 0) + 1 }));
    }
    
    setShowSpells(false);
    setShowMenu(false);
    audioSystem.playSFX('spell_cast');
    
    const spellEffect = getSpellEffectType(spell.school);
    
    if (spell.damage) {
      const damage = rollDice(spell.damage.dice);
      playAnimation(spellEffect, 'monster', damage);
      showDamage(damage, 'monster');
      
      setMonsterHealth((prev) => Math.max(0, prev - damage));
      setIsMonsterHit(true);
      setTimeout(() => setIsMonsterHit(false), 300);
      
      typeMessage(`Você conjura ${spell.name}! ${damage} de dano ${spell.damage.type}!`);
      addLog("player", `${spell.name}: ${damage} de dano ${spell.damage.type}`, damage);
      
      // Play appropriate sound
      if (spell.school === 'evocation') audioSystem.playSFX('spell_fire');
      else if (spell.damage.type === 'cold') audioSystem.playSFX('spell_ice');
      else if (spell.damage.type === 'lightning') audioSystem.playSFX('spell_lightning');
      else if (spell.damage.type === 'necrotic') audioSystem.playSFX('spell_dark');
      
      if (monsterHealth - damage <= 0) {
        handleVictory();
        return;
      }
    } else if (spell.healing) {
      const healing = rollDice(spell.healing.dice);
      playAnimation('heal', 'player', healing);
      
      setPlayerHealth((prev) => Math.min(maxPlayerHealth, prev + healing));
      audioSystem.playSFX('spell_heal');
      
      typeMessage(`Você conjura ${spell.name} e recupera ${healing} HP!`);
      addLog("player", `${spell.name}: +${healing} HP`, healing);
    }
    
    setTimeout(() => {
      setIsPlayerTurn(false);
      handleMonsterTurn();
    }, 1500);
  };

  // Handle ability use
  const handleUseAbility = async (ability: ClassAbility) => {
    if (!isPlayerTurn || combatEnded || !character) return;
    
    if (ability.usesRemaining <= 0 && ability.maxUses !== 999) {
      toast.error("Habilidade esgotada!");
      return;
    }
    
    setShowAbilities(false);
    setShowMenu(false);
    
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
        typeMessage(`Você entra em FÚRIA! +2 dano e resistência a dano físico!`);
        addLog("ability", "Fúria ativada!");
        audioSystem.playSFX('menu_confirm');
        break;
        
      case 'second_wind':
        const healing = rollDice('1d10') + (character.level || 1);
        setPlayerHealth(prev => Math.min(maxPlayerHealth, prev + healing));
        playAnimation('heal', 'player', healing);
        typeMessage(`Você retoma o fôlego e recupera ${healing} HP!`);
        addLog("ability", `Retomar Fôlego: +${healing} HP`, healing);
        audioSystem.playSFX('spell_heal');
        break;
        
      case 'sneak_attack':
        const sneakDamage = rollDice(`${Math.ceil((character.level || 1) / 2)}d6`);
        setMonsterHealth(prev => Math.max(0, prev - sneakDamage));
        playAnimation('pierce', 'monster', sneakDamage, true);
        showDamage(sneakDamage, 'monster', true);
        typeMessage(`Ataque Furtivo! ${sneakDamage} de dano extra!`);
        addLog("ability", `Ataque Furtivo: ${sneakDamage} de dano`, sneakDamage, true);
        audioSystem.playSFX('attack_critical');
        setSneakAttackUsed(true);
        
        if (monsterHealth - sneakDamage <= 0) {
          handleVictory();
          return;
        }
        break;
        
      case 'divine_smite':
        const smiteDamage = rollDice('2d8');
        setMonsterHealth(prev => Math.max(0, prev - smiteDamage));
        playAnimation('holy', 'monster', smiteDamage, true);
        showDamage(smiteDamage, 'monster', true);
        typeMessage(`Punição Divina! ${smiteDamage} de dano radiante!`);
        addLog("ability", `Punição Divina: ${smiteDamage} de dano`, smiteDamage, true);
        audioSystem.playSFX('spell_heal');
        
        if (monsterHealth - smiteDamage <= 0) {
          handleVictory();
          return;
        }
        break;
        
      default:
        typeMessage(`Você usa ${ability.name}!`);
        addLog("ability", `${ability.name} usado!`);
    }
    
    setTimeout(() => {
      setIsPlayerTurn(false);
      handleMonsterTurn();
    }, 1500);
  };

  // Handle flee
  const handleFlee = async () => {
    if (!isPlayerTurn || combatEnded) return;
    
    setShowMenu(false);
    
    // 50% chance to flee
    const fleeRoll = Math.random();
    if (fleeRoll > 0.5) {
      typeMessage(`Você conseguiu fugir!`);
      audioSystem.playSFX('menu_cancel');
      setTimeout(() => onClose(), 1500);
    } else {
      typeMessage(`Você não conseguiu fugir!`);
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
      // Monster attack
      const attackRoll = Math.floor(Math.random() * 20) + 1;
      const monsterAttackBonus = Math.floor(monster.level / 2);
      const playerAC = 10 + Math.floor(((character?.dexterity || 10) - 10) / 2);
      
      const isCritical = attackRoll === 20;
      const isMiss = attackRoll === 1 || (attackRoll + monsterAttackBonus) < playerAC;
      
      if (isMiss) {
        typeMessage(`${monster.name} ataca... Mas erra!`);
        audioSystem.playSFX('attack_miss');
        addLog("monster", `${monster.name} errou o ataque!`);
      } else {
        let damage = monster.damage + Math.floor(Math.random() * 4);
        
        // Apply damage resistance
        if (damageResistance.length > 0) {
          damage = Math.floor(damage / 2);
        }
        
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
          typeMessage(`${monster.name} acerta um golpe CRÍTICO! ${damage} de dano!`);
          addLog("monster", `${monster.name} crítico: ${damage} de dano!`, damage, true);
        } else {
          typeMessage(`${monster.name} ataca e causa ${damage} de dano!`);
          addLog("monster", `${monster.name}: ${damage} de dano`, damage);
        }
        
        // Check if player is defeated
        if (playerHealth - damage <= 0) {
          handleDefeat();
          return;
        }
      }
      
      // Player turn
      setTimeout(() => {
        setIsPlayerTurn(true);
        setShowMenu(true);
        typeMessage(`O que ${character?.name || 'você'} vai fazer?`);
      }, 1500);
    }, 1000);
  };

  // Handle victory
  const handleVictory = () => {
    setCombatEnded(true);
    audioSystem.playSFX('victory');
    
    const tierMultiplier = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 };
    const multiplier = tierMultiplier[monster.tier as keyof typeof tierMultiplier] || 1;
    
    const experience = Math.floor((monster.level * 10 + 20) * multiplier);
    const gold = Math.floor((monster.level * 5 + 10) * multiplier);
    
    setVictoryRewards({ experience, gold, leveledUp: false, newLevel: character?.level || 1 });
    
    typeMessage(`${monster.name} foi derrotado!`);
    
    setTimeout(() => {
      setShowVictory(true);
    }, 1500);
  };

  // Handle defeat
  const handleDefeat = () => {
    setCombatEnded(true);
    audioSystem.playSFX('defeat');
    
    typeMessage(`Você foi derrotado...`);
    
    setTimeout(() => {
      setShowDefeat(true);
    }, 1500);
  };

  const monsterSprite = getMonsterSprite(monster.monsterType);
  const playerSprite = CLASS_SPRITES[playerClass] || CLASS_SPRITES.fighter;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <CombatAnimationStyles />
      
      {/* Battle scene */}
      <div 
        className="flex-1 relative overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, #87CEEB 0%, #87CEEB 60%, #228B22 60%, #228B22 100%)',
        }}
      >
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-2 right-2 z-50 p-2 bg-black/50 rounded-full hover:bg-black/70"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        
        {/* Monster side (top right) */}
        <div className="absolute top-4 right-4 w-48">
          <HPBar 
            current={monsterHealth} 
            max={monster.health} 
            label={monster.name}
          />
        </div>
        
        {/* Monster sprite */}
        <div 
          className={cn(
            "absolute top-20 right-8 w-32 h-32 transition-all duration-200",
            isMonsterHit && "brightness-200 translate-x-2",
            monsterHealth <= 0 && "opacity-0 scale-0"
          )}
        >
          <img 
            src={monsterSprite}
            alt={monster.name}
            className="w-full h-full object-contain"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        {/* Player side (bottom left) */}
        <div className="absolute bottom-32 left-4 w-48">
          <HPBar 
            current={playerHealth} 
            max={maxPlayerHealth} 
            label={character?.name || "Herói"}
            isPlayer
          />
        </div>
        
        {/* Player sprite (back view) */}
        <div 
          className={cn(
            "absolute bottom-24 left-8 w-40 h-40 transition-all duration-200",
            isPlayerHit && "brightness-200 -translate-x-2",
            isAttacking && "translate-x-4"
          )}
        >
          <img 
            src={playerSprite}
            alt="Player"
            className="w-full h-full object-contain transform scale-x-[-1]"
            style={{ imageRendering: 'pixelated' }}
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
      
      {/* Message and menu area */}
      <div className="bg-gray-900 p-4 space-y-4">
        {/* Message box */}
        <MessageBox message={currentMessage} isTyping={isTyping} />
        
        {/* Action menu */}
        {showMenu && isPlayerTurn && !combatEnded && (
          <div className="grid grid-cols-2 gap-2">
            <PixelButton variant="fight" onClick={handleAttack}>
              LUTAR
            </PixelButton>
            <PixelButton variant="skills" onClick={() => setShowSpells(!showSpells)}>
              MAGIAS
            </PixelButton>
            <PixelButton variant="bag" onClick={() => setShowAbilities(!showAbilities)}>
              SKILLS
            </PixelButton>
            <PixelButton variant="run" onClick={handleFlee}>
              FUGIR
            </PixelButton>
          </div>
        )}
        
        {/* Spells menu */}
        {showSpells && (
          <div className="bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold text-sm">Magias</span>
              <button onClick={() => setShowSpells(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {availableSpells.map((spell) => (
                <button
                  key={spell.id}
                  onClick={() => handleCastSpell(spell)}
                  className={cn(
                    "p-2 rounded text-left text-xs",
                    SCHOOL_COLORS[spell.school] || "bg-gray-700",
                    "hover:brightness-110 transition-all"
                  )}
                >
                  <div className="font-bold text-white">{spell.name}</div>
                  <div className="text-gray-300 text-[10px]">
                    {spell.damage?.dice || spell.healing?.dice || spell.description.slice(0, 30)}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Abilities menu */}
        {showAbilities && (
          <div className="bg-gray-800 rounded-lg p-4 max-h-48 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-bold text-sm">Habilidades</span>
              <button onClick={() => setShowAbilities(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {classAbilities.map((ability) => (
                <button
                  key={ability.id}
                  onClick={() => handleUseAbility(ability)}
                  disabled={ability.usesRemaining <= 0 && ability.maxUses !== 999}
                  className={cn(
                    "p-2 rounded text-left text-xs",
                    "bg-purple-600/50 hover:bg-purple-500/50",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition-all"
                  )}
                >
                  <div className="font-bold text-white">{ability.name}</div>
                  <div className="text-gray-300 text-[10px]">{ability.description}</div>
                  {ability.maxUses !== 999 && (
                    <div className="text-yellow-400 text-[10px]">
                      {ability.usesRemaining}/{ability.maxUses}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Victory animation */}
      {showVictory && (
        <VictoryAnimation 
          experience={victoryRewards.experience}
          gold={victoryRewards.gold}
          leveledUp={victoryRewards.leveledUp}
          newLevel={victoryRewards.newLevel}
          onComplete={() => onVictory(victoryRewards)}
        />
      )}
      
      {/* Defeat animation */}
      {showDefeat && (
        <DefeatAnimation onComplete={onDefeat} />
      )}
    </div>
  );
}
