import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES, CLASS_ABILITIES, MONSTER_ABILITIES, MonsterAbility, getMonsterAbilities, rollDiceString } from "../../../shared/gameConstants";
import { CombatAnimation, DamageNumber, getSpellEffectType, getAttackEffectType, CombatAnimationStyles, VictoryAnimation, DefeatAnimation } from "./CombatAnimations";
import { audioSystem } from "@/lib/audioSystem";
import { PixelFrame, PixelBar, PixelBtn, PixelText, PixelDialogBox, PixelSeparator, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

// ═══════════════════════════════════════════════════════════
// PIXEL ART NANO BANANA PRO - D&D GO COMBAT SYSTEM
// ═══════════════════════════════════════════════════════════

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

// Tier colors for monster name plates
const TIER_COLORS: Record<string, string> = {
  common: "#9ca3af",
  uncommon: "#22c55e",
  rare: "#3b82f6",
  epic: "#a855f7",
  legendary: "#f59e0b",
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
  isBonusAction?: boolean;
}

function getMonsterSprite(monsterType: string | undefined | null): string {
  if (!monsterType) return MONSTER_SPRITES.default;
  const type = monsterType.toLowerCase();
  return MONSTER_SPRITES[type] || MONSTER_SPRITES.default;
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
      abilities.push({ id: "rage", name: "Furia", description: "+2 dano, resistencia fisica", usesRemaining: Math.max(2, Math.floor(level / 4) + 2), maxUses: Math.max(2, Math.floor(level / 4) + 2), bonusDamage: 2, isBonusAction: true });
    }
    if (charClass === "rogue") {
      abilities.push({ id: "sneak_attack", name: "Ataque Furtivo", description: `+${Math.ceil(level / 2)}d6 dano`, usesRemaining: 999, maxUses: 999, bonusDamage: Math.ceil(level / 2) * 3, isBonusAction: false });
    }
    if (charClass === "paladin") {
      abilities.push({ id: "divine_smite", name: "Punicao Divina", description: "+2d8 radiante", usesRemaining: 999, maxUses: 999, bonusDamage: 9, isBonusAction: false });
      setLayOnHandsPool(level * 5);
    }
    if (charClass === "fighter") {
      abilities.push({ id: "action_surge", name: "Surto de Acao", description: "Acao extra neste turno", usesRemaining: 1, maxUses: 1, isBonusAction: true });
      abilities.push({ id: "second_wind", name: "Retomar Folego", description: `Recupera 1d10+${level} HP`, usesRemaining: 1, maxUses: 1, isBonusAction: true });
    }
    if (charClass === "cleric") {
      abilities.push({ id: "turn_undead", name: "Expulsar Mortos-Vivos", description: "Afasta mortos-vivos", usesRemaining: Math.max(1, Math.floor((level - 1) / 4) + 1), maxUses: Math.max(1, Math.floor((level - 1) / 4) + 1), isBonusAction: false });
    }
    if (charClass === "wizard") {
      abilities.push({ id: "arcane_recovery", name: "Recuperacao Arcana", description: "Recupera spell slots", usesRemaining: 1, maxUses: 1, isBonusAction: true });
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
  // ═══════════════════════════════════════════════════════════

  const checkEndTurn = useCallback(() => {
    if (actionUsed) {
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        setTimeout(() => { setIsPlayerTurn(false); setShowMenu(false); handleMonsterTurn(); }, 1200);
        return true;
      }
    }
    return false;
  }, [actionUsed, bonusActionUsed, classAbilities]);

  const endTurnManually = useCallback(() => {
    if (!isPlayerTurn || combatEnded) return;
    setShowMenu(false);
    setTimeout(() => { setIsPlayerTurn(false); handleMonsterTurn(); }, 500);
  }, [isPlayerTurn, combatEnded]);

  const handleAttack = async () => {
    if (!isPlayerTurn || combatEnded || !character || actionUsed) return;
    setShowMenu(false); setShowSpells(false); setShowAbilities(false);
    setIsAttacking(true); setActionUsed(true);
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
      typeMessage(`Falha critica! O ataque erra completamente!`);
      audioSystem.playSFX('attack_miss');
      addLog("player", "Falha critica!");
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
        typeMessage(`CRITICO! ${finalDamage} de dano a ${monster.name}!`);
        addLog("player", `Critico! ${finalDamage} dano`, finalDamage, true);
      } else {
        typeMessage(`${finalDamage} de dano a ${monster.name}!`);
        addLog("player", `Ataque: ${finalDamage} dano`, finalDamage);
      }
      if (monsterHealth - finalDamage <= 0) { handleVictory(); return; }
    }
    setIsAttacking(false);
    setTimeout(() => {
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        setTimeout(() => { setIsPlayerTurn(false); setShowMenu(false); handleMonsterTurn(); }, 800);
      } else {
        setShowMenu(true);
        typeMessage(`Acao usada! Ainda tens Acao Bonus disponivel.`);
      }
    }, 800);
  };

  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded || !character || actionUsed) return;
    if (spell.level > 0) {
      const maxSlots = SPELL_SLOTS_BY_LEVEL[character.level]?.[spell.level] || 0;
      const usedSlots = usedSpellSlots[spell.level] || 0;
      if (usedSlots >= maxSlots) { toast.error("Sem spell slots!"); return; }
      setUsedSpellSlots(prev => ({ ...prev, [spell.level]: (prev[spell.level] || 0) + 1 }));
    }
    setShowSpells(false); setShowMenu(false); setActionUsed(true);
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
      if (monsterHealth - damage <= 0) { handleVictory(); return; }
    } else if (spell.healing) {
      const healing = rollDice(spell.healing.dice);
      playAnimation('heal', 'player', healing);
      setPlayerHealth((prev) => Math.min(maxPlayerHealth, prev + healing));
      audioSystem.playSFX('spell_heal');
      typeMessage(`${spell.name}! +${healing} HP!`);
      addLog("player", `${spell.name}: +${healing} HP`, healing);
    }
    setTimeout(() => {
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && (a.usesRemaining > 0 || a.maxUses === 999));
      if (bonusActionUsed || !hasBonusActions) {
        setTimeout(() => { setIsPlayerTurn(false); setShowMenu(false); handleMonsterTurn(); }, 800);
      } else {
        setShowMenu(true);
        typeMessage(`Magia lancada! Ainda tens Acao Bonus.`);
      }
    }, 800);
  };

  const handleUseAbility = async (ability: ClassAbility) => {
    if (!isPlayerTurn || combatEnded || !character) return;
    if (ability.isBonusAction && bonusActionUsed) { toast.error("Acao Bonus ja usada neste turno!"); return; }
    if (!ability.isBonusAction && actionUsed) { toast.error("Acao ja usada neste turno!"); return; }
    if (ability.usesRemaining <= 0 && ability.maxUses !== 999) { toast.error("Habilidade esgotada!"); return; }

    setShowAbilities(false); setShowMenu(false);
    if (ability.isBonusAction) { setBonusActionUsed(true); } else { setActionUsed(true); }
    if (ability.maxUses !== 999) {
      setClassAbilities(prev => prev.map(a => a.id === ability.id ? { ...a, usesRemaining: a.usesRemaining - 1 } : a));
    }

    switch (ability.id) {
      case 'rage':
        setIsRaging(true); setDamageResistance(['bludgeoning', 'piercing', 'slashing']);
        typeMessage(`FURIA! +2 dano e resistencia fisica!`);
        addLog("ability", "Furia ativada!"); audioSystem.playSFX('menu_confirm'); break;
      case 'second_wind':
        const healing = rollDice('1d10') + (character.level || 1);
        setPlayerHealth(prev => Math.min(maxPlayerHealth, prev + healing));
        playAnimation('heal', 'player', healing);
        typeMessage(`Retomar Folego! +${healing} HP!`);
        addLog("ability", `Retomar Folego: +${healing} HP`, healing); audioSystem.playSFX('spell_heal'); break;
      case 'action_surge':
        setActionUsed(false);
        typeMessage(`Surto de Acao! Ganhas uma acao extra!`);
        addLog("ability", "Surto de Acao!"); audioSystem.playSFX('menu_confirm'); break;
      case 'sneak_attack':
        const sneakDamage = rollDice(`${Math.ceil((character.level || 1) / 2)}d6`);
        setMonsterHealth(prev => Math.max(0, prev - sneakDamage));
        playAnimation('pierce', 'monster', sneakDamage, true);
        showDamage(sneakDamage, 'monster', true);
        typeMessage(`Ataque Furtivo! ${sneakDamage} de dano!`);
        addLog("ability", `Furtivo: ${sneakDamage} dano`, sneakDamage, true);
        audioSystem.playSFX('attack_critical'); setSneakAttackUsed(true);
        if (monsterHealth - sneakDamage <= 0) { handleVictory(); return; } break;
      case 'divine_smite':
        const smiteDamage = rollDice('2d8');
        setMonsterHealth(prev => Math.max(0, prev - smiteDamage));
        playAnimation('holy', 'monster', smiteDamage, true);
        showDamage(smiteDamage, 'monster', true);
        typeMessage(`Punicao Divina! ${smiteDamage} radiante!`);
        addLog("ability", `Punicao: ${smiteDamage} dano`, smiteDamage, true);
        audioSystem.playSFX('spell_heal');
        if (monsterHealth - smiteDamage <= 0) { handleVictory(); return; } break;
      default:
        typeMessage(`${ability.name} usado!`); addLog("ability", `${ability.name}!`);
    }

    setTimeout(() => {
      const newActionUsed = ability.isBonusAction ? actionUsed : true;
      const newBonusUsed = ability.isBonusAction ? true : bonusActionUsed;
      const effectiveActionUsed = ability.id === 'action_surge' ? false : newActionUsed;
      const hasBonusActions = classAbilities.some(a => a.isBonusAction && a.id !== ability.id && (a.usesRemaining > 0 || a.maxUses === 999));
      if (effectiveActionUsed && (newBonusUsed || !hasBonusActions)) {
        setTimeout(() => { setIsPlayerTurn(false); setShowMenu(false); handleMonsterTurn(); }, 800);
      } else {
        setShowMenu(true);
        if (ability.id === 'action_surge') { typeMessage(`Surto de Acao! Podes atacar novamente!`); }
        else if (!effectiveActionUsed) { typeMessage(`${ability.name} usado! Ainda tens a tua Acao.`); }
        else { typeMessage(`${ability.name} usado! Turno a terminar...`); }
      }
    }, 800);
  };

  const handleFlee = async () => {
    if (!isPlayerTurn || combatEnded || actionUsed) return;
    setShowMenu(false); setActionUsed(true);
    const fleeRoll = Math.random();
    if (fleeRoll > 0.5) {
      typeMessage(`Conseguiste fugir!`); audioSystem.playSFX('menu_cancel');
      setTimeout(() => onClose(), 1500);
    } else {
      typeMessage(`Nao conseguiste fugir!`); audioSystem.playSFX('attack_miss');
      setTimeout(() => { setIsPlayerTurn(false); handleMonsterTurn(); }, 1500);
    }
  };

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
        if (isCritical) { damage *= 2; audioSystem.playSFX('attack_critical'); } else { audioSystem.playSFX('player_hit'); }
        playAnimation('slash', 'player', damage, isCritical);
        showDamage(damage, 'player', isCritical);
        setPlayerHealth(prev => Math.max(0, prev - damage));
        setIsPlayerHit(true);
        setTimeout(() => setIsPlayerHit(false), 300);
        if (isCritical) {
          typeMessage(`${monster.name} CRITICO! ${damage} de dano!`);
          addLog("monster", `Critico: ${damage} dano!`, damage, true);
        } else {
          typeMessage(`${monster.name} ataca! ${damage} de dano!`);
          addLog("monster", `${damage} dano`, damage);
        }
        if (playerHealth - damage <= 0) { handleDefeat(); return; }
      }
      setTimeout(() => {
        setIsPlayerTurn(true); setActionUsed(false); setBonusActionUsed(false); setSneakAttackUsed(false);
        setShowMenu(true);
        typeMessage(`O que ${character?.name || 'Heroi'} vai fazer?`);
      }, 1500);
    }, 1000);
  };

  const handleVictory = () => {
    setCombatEnded(true); audioSystem.playSFX('victory');
    const tierMultiplier = { common: 1, uncommon: 1.5, rare: 2, epic: 3, legendary: 5 };
    const multiplier = tierMultiplier[monster.tier as keyof typeof tierMultiplier] || 1;
    const experience = Math.floor((monster.level * 10 + 20) * multiplier);
    const gold = Math.floor((monster.level * 5 + 10) * multiplier);
    setVictoryRewards({ experience, gold, leveledUp: false, newLevel: character?.level || 1 });
    typeMessage(`${monster.name} foi derrotado!`);
    setTimeout(() => setShowVictory(true), 1500);
  };

  const handleDefeat = () => {
    setCombatEnded(true); audioSystem.playSFX('defeat');
    typeMessage(`Foste derrotado...`);
    setTimeout(() => setShowDefeat(true), 1500);
  };

  const monsterSprite = getMonsterSprite(monster.monsterType);
  const playerSprite = CLASS_SPRITES[playerClass] || CLASS_SPRITES.fighter;
  const tierColor = TIER_COLORS[monster.tier] || TIER_COLORS.common;

  // ═══════════════════════════════════════════════════════════
  // RENDER - PIXEL ART NANO BANANA PRO STYLE
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0" style={{ zIndex: 9999, background: '#0a0a0a', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <CombatAnimationStyles />

      {/* ═══ BATTLE ARENA - Medieval pixel art battlefield ═══ */}
      <div
        className="relative overflow-hidden"
        style={{
          height: '55vh',
          minHeight: '200px',
          imageRendering: 'pixelated' as const,
        }}
      >
        {/* Sky gradient with clouds */}
        <div className="absolute inset-0" style={{
          background: `
            linear-gradient(180deg,
              #1a0a2e 0%,
              #2d1b4e 15%,
              #4a2d6e 30%,
              #6b4a8e 45%,
              #4a6b2a 52%,
              #3a5a1a 55%,
              #2d4a12 60%,
              #1e3a0a 75%,
              #152e08 100%
            )
          `,
        }} />

        {/* Stars in the dark sky */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `
            radial-gradient(1px 1px at 10% 8%, rgba(255,255,200,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 30% 5%, rgba(255,255,200,0.6) 0%, transparent 100%),
            radial-gradient(1px 1px at 50% 12%, rgba(255,255,200,0.7) 0%, transparent 100%),
            radial-gradient(1px 1px at 70% 3%, rgba(255,255,200,0.5) 0%, transparent 100%),
            radial-gradient(1px 1px at 85% 10%, rgba(255,255,200,0.8) 0%, transparent 100%),
            radial-gradient(1px 1px at 15% 15%, rgba(255,255,200,0.4) 0%, transparent 100%),
            radial-gradient(1px 1px at 60% 7%, rgba(255,255,200,0.6) 0%, transparent 100%),
            radial-gradient(2px 2px at 90% 6%, rgba(255,200,100,0.9) 0%, transparent 100%)
          `,
        }} />

        {/* Ground tile pattern */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{
          height: '50%',
          background: `
            repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(0,0,0,0.08) 48px, rgba(0,0,0,0.08) 50px),
            repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(0,0,0,0.08) 48px, rgba(0,0,0,0.08) 50px)
          `,
        }} />

        {/* Pixel scanline overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.06]" style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.4) 2px, rgba(0,0,0,0.4) 4px)',
        }} />

        {/* ═══ MONSTER (top right) ═══ */}
        <div className="absolute top-2 right-2 z-20" style={{ width: '42%', maxWidth: '200px' }}>
          <PixelFrame borderColor={tierColor} bgColor="rgba(12,12,29,0.9)" className="p-1.5">
            <div className="flex justify-between items-center mb-1">
              <PixelText size="xs" color={tierColor} bold className="truncate">{monster.name}</PixelText>
              <PixelText size="xxs" color={COLORS.textGold}>Nv.{monster.level}</PixelText>
            </div>
            <PixelBar current={monsterHealth} max={monster.health} color={COLORS.hpGreen} label="HP" labelColor={COLORS.hpRed} height={10} segments={12} />
            <div className="flex justify-between mt-1">
              <PixelText size="xxs" color={COLORS.textGray}>AC {monster.armor}</PixelText>
              <PixelText size="xxs" color={tierColor}>{monster.tier}</PixelText>
            </div>
          </PixelFrame>
        </div>

        {/* Monster sprite */}
        <div className="absolute top-14 right-6 z-10" style={{ width: '120px' }}>
          <div className={cn(
            "w-full transition-all duration-200",
            isMonsterHit && "brightness-[3] translate-x-2",
            monsterHealth <= 0 && "opacity-0 scale-0"
          )}>
            <img src={monsterSprite} alt={monster.name} className="w-full h-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" style={{ imageRendering: 'pixelated' }} />
          </div>
          <div className="mx-auto -mt-1 opacity-40" style={{ width: '80%', height: '10px', background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)' }} />
        </div>

        {/* ═══ PLAYER (bottom left) ═══ */}
        <div className="absolute bottom-2 left-2 z-20" style={{ width: '42%', maxWidth: '200px' }}>
          <PixelFrame borderColor={COLORS.hpGreen} bgColor="rgba(12,12,29,0.9)" className="p-1.5">
            <div className="flex justify-between items-center mb-1">
              <PixelText size="xs" color={COLORS.textGold} bold className="truncate">{character?.name || "Heroi"}</PixelText>
              <PixelText size="xxs" color={COLORS.textGold}>Nv.{character?.level || 1}</PixelText>
            </div>
            <PixelBar current={playerHealth} max={maxPlayerHealth} color={COLORS.hpGreen} label="HP" labelColor={COLORS.hpRed} height={10} segments={12} />
            {isRaging && <PixelText size="xxs" color="#ef4444" glow className="block mt-0.5">FURIA ATIVA</PixelText>}
          </PixelFrame>
        </div>

        {/* Player sprite */}
        <div className={cn(
          "absolute bottom-10 left-8 z-10 transition-all duration-200",
          isPlayerHit && "brightness-[3] -translate-x-2",
          isAttacking && "translate-x-6"
        )} style={{ width: '110px' }}>
          <img src={playerSprite} alt="Player" className="w-full h-auto transform scale-x-[-1] drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" style={{ imageRendering: 'pixelated' }} />
          <div className="mx-auto -mt-1 opacity-40" style={{ width: '80%', height: '10px', background: 'radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)' }} />
        </div>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 left-2 z-30 w-7 h-7 flex items-center justify-center transition-all hover:brightness-125" style={{
          background: '#6b1a1a', border: '2px solid #ef4444', boxShadow: '2px 2px 0 rgba(0,0,0,0.5)',
          fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff',
        }}>X</button>

        {/* Combat animations */}
        {showAnimation && <CombatAnimation type={animationType} target={animationTarget} damage={animationDamage} isCritical={animationIsCritical} />}
        {showDamageNumber && <DamageNumber value={damageNumberValue} target={damageNumberTarget} isCritical={damageNumberIsCritical} />}
      </div>

      {/* ═══ BOTTOM UI PANEL - Medieval RPG style ═══ */}
      <div style={{
        height: '45vh',
        background: `linear-gradient(180deg, ${COLORS.panelDark} 0%, #080818 100%)`,
        borderTop: `3px solid ${COLORS.gold}`,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        overflow: 'hidden',
      }}>
        {/* Turn indicator */}
        {isPlayerTurn && !combatEnded && (
          <div className="flex items-center justify-center gap-3 py-1" style={{ borderBottom: `1px solid ${COLORS.gold}20` }}>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3" style={{
                background: actionUsed ? '#333' : COLORS.hpGreen,
                border: `1px solid ${actionUsed ? '#555' : COLORS.hpGreen}`,
                boxShadow: actionUsed ? 'none' : `0 0 6px ${COLORS.hpGreen}60`,
              }} />
              <PixelText size="xxs" color={actionUsed ? COLORS.textGray : COLORS.hpGreen}>ACAO</PixelText>
            </div>
            <div className="w-1 h-1" style={{ background: COLORS.gold, transform: 'rotate(45deg)' }} />
            <div className="flex items-center gap-1">
              <div className="w-3 h-3" style={{
                background: bonusActionUsed ? '#333' : COLORS.xpGold,
                border: `1px solid ${bonusActionUsed ? '#555' : COLORS.xpGold}`,
                boxShadow: bonusActionUsed ? 'none' : `0 0 6px ${COLORS.xpGold}60`,
              }} />
              <PixelText size="xxs" color={bonusActionUsed ? COLORS.textGray : COLORS.xpGold}>BONUS</PixelText>
            </div>
          </div>
        )}

        {/* Message box */}
        <PixelDialogBox message={currentMessage} isTyping={isTyping} />

        {/* Action menu */}
        {showMenu && isPlayerTurn && !combatEnded && (
          <div className="grid grid-cols-2 gap-1.5">
            <PixelBtn variant="attack" size="sm" onClick={handleAttack} disabled={actionUsed} fullWidth>LUTAR</PixelBtn>
            <PixelBtn variant="magic" size="sm" onClick={() => { setShowSpells(!showSpells); setShowAbilities(false); }} disabled={actionUsed} fullWidth>MAGIAS</PixelBtn>
            <PixelBtn variant="skill" size="sm" onClick={() => { setShowAbilities(!showAbilities); setShowSpells(false); }} fullWidth>SKILLS</PixelBtn>
            <PixelBtn variant="flee" size="sm" onClick={handleFlee} disabled={actionUsed} fullWidth>FUGIR</PixelBtn>
          </div>
        )}

        {/* End turn button */}
        {showMenu && isPlayerTurn && !combatEnded && actionUsed && !bonusActionUsed && (
          <PixelBtn variant="default" size="xs" onClick={endTurnManually} fullWidth>TERMINAR TURNO</PixelBtn>
        )}

        {/* Spells sub-menu */}
        {showSpells && (
          <PixelFrame borderColor={COLORS.textPurple} className="p-2">
            <div className="flex justify-between items-center mb-1">
              <PixelText size="xs" color={COLORS.textPurple}>MAGIAS</PixelText>
              <button onClick={() => setShowSpells(false)} style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: COLORS.textRed }}>X</button>
            </div>
            <PixelScrollArea maxHeight="100px">
              <div className="grid grid-cols-2 gap-1">
                {availableSpells.length === 0 && <PixelText size="xxs" color={COLORS.textGray}>Sem magias</PixelText>}
                {availableSpells.map((spell) => (
                  <button key={spell.id} onClick={() => handleCastSpell(spell)} disabled={actionUsed}
                    className="p-1.5 text-left transition-all hover:brightness-125 disabled:opacity-35"
                    style={{ background: '#1a0e3a', border: `1px solid ${COLORS.textPurple}40`, imageRendering: 'pixelated' as const }}>
                    <PixelText size="xxs" color="#fff" className="block truncate">{spell.name}</PixelText>
                    <PixelText size="xxs" color={COLORS.textPurple}>{spell.damage?.dice || spell.healing?.dice || '—'}</PixelText>
                  </button>
                ))}
              </div>
            </PixelScrollArea>
          </PixelFrame>
        )}

        {/* Abilities sub-menu */}
        {showAbilities && (
          <PixelFrame borderColor={COLORS.xpGold} className="p-2">
            <div className="flex justify-between items-center mb-1">
              <PixelText size="xs" color={COLORS.textGold}>HABILIDADES</PixelText>
              <button onClick={() => setShowAbilities(false)} style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: COLORS.textRed }}>X</button>
            </div>
            <PixelScrollArea maxHeight="100px">
              <div className="grid grid-cols-1 gap-1">
                {classAbilities.length === 0 && <PixelText size="xxs" color={COLORS.textGray}>Sem habilidades</PixelText>}
                {classAbilities.map((ability) => {
                  const isDisabled = ability.isBonusAction ? bonusActionUsed : actionUsed;
                  const usesOk = ability.usesRemaining > 0 || ability.maxUses === 999;
                  const abilityColor = ability.isBonusAction ? COLORS.xpGold : COLORS.hpGreen;
                  return (
                    <button key={ability.id} onClick={() => handleUseAbility(ability)} disabled={isDisabled || !usesOk}
                      className="p-2 text-left transition-all hover:brightness-125 disabled:opacity-35 flex items-center gap-2"
                      style={{ background: COLORS.panelMid, border: `1px solid ${abilityColor}40`, imageRendering: 'pixelated' as const }}>
                      <div className="w-2 h-2 flex-shrink-0" style={{ background: abilityColor, boxShadow: `0 0 4px ${abilityColor}60` }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <PixelText size="xxs" color="#fff" className="truncate">{ability.name}</PixelText>
                          {ability.maxUses !== 999 && (
                            <PixelText size="xxs" color={COLORS.textGold}>{ability.usesRemaining}/{ability.maxUses}</PixelText>
                          )}
                        </div>
                        <PixelText size="xxs" color={COLORS.textGray} className="block truncate">{ability.description}</PixelText>
                      </div>
                      <PixelText size="xxs" color={abilityColor}>{ability.isBonusAction ? 'B' : 'A'}</PixelText>
                    </button>
                  );
                })}
              </div>
            </PixelScrollArea>
          </PixelFrame>
        )}

        {/* Combat log (compact) */}
        {!showSpells && !showAbilities && combatLogs.length > 0 && (
          <div className="flex-1 overflow-hidden">
            <PixelScrollArea maxHeight="60px">
              {combatLogs.slice(-3).map((log, i) => (
                <div key={i} className="flex items-center gap-1 py-0.5">
                  <div className="w-1.5 h-1.5 flex-shrink-0" style={{
                    background: log.type === 'player' ? COLORS.hpGreen : log.type === 'monster' ? COLORS.hpRed : COLORS.xpGold,
                  }} />
                  <PixelText size="xxs" color={log.isCritical ? COLORS.textGold : COLORS.textGray}>{log.message}</PixelText>
                </div>
              ))}
            </PixelScrollArea>
          </div>
        )}
      </div>

      {/* Victory overlay */}
      {showVictory && <VictoryAnimation experience={victoryRewards.experience} gold={victoryRewards.gold} leveledUp={victoryRewards.leveledUp} newLevel={victoryRewards.newLevel} onComplete={() => onVictory(victoryRewards)} />}
      {showDefeat && <DefeatAnimation onComplete={onDefeat} />}
    </div>
  );
}
