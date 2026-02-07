import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES, CLASS_ABILITIES, MONSTER_ABILITIES, MonsterAbility, getMonsterAbilities, rollDiceString } from "../../../shared/gameConstants";
import { CombatAnimation, DamageNumber, getSpellEffectType, getAttackEffectType, CombatAnimationStyles, VictoryAnimation, DefeatAnimation } from "./CombatAnimations";
import { audioSystem } from "@/lib/audioSystem";
import { PixelFrame, PixelBar, PixelBtn, PixelText, PixelDialogBox, PixelSeparator, PixelScrollArea, PIXEL_FONT, COLORS } from "./ui/pixelUI";

// ═══════════════════════════════════════════════════════════
// NANO BANANA PRO - D&D GO COMBAT SYSTEM
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
  goblin_archer: "/sprites/monsters/goblin_archer.png",
  goblin_shaman: "/sprites/monsters/goblin_shaman.png",
  goblin_boss: "/sprites/monsters/goblin_boss.png",
  orc: "/sprites/monsters/orc.png",
  skeleton: "/sprites/monsters/skeleton.png",
  skeleton_warrior: "/sprites/monsters/skeleton_warrior.png",
  dragon: "/sprites/monsters/dragon.png",
  slime: "/sprites/monsters/slime.png",
  wolf: "/sprites/monsters/wolf.png",
  wolf_dire: "/sprites/monsters/wolf_dire.png",
  rat: "/sprites/monsters/rat_giant.png",
  rat_giant: "/sprites/monsters/rat_giant.png",
  rat_sewer: "/sprites/monsters/rat_sewer.png",
  rat_king: "/sprites/monsters/rat_king.png",
  kobold: "/sprites/monsters/kobold.png",
  zombie: "/sprites/monsters/zombie.png",
  spider: "/sprites/monsters/spider_giant.png",
  spider_giant: "/sprites/monsters/spider_giant.png",
  bandit: "/sprites/monsters/bandit.png",
  troll: "/sprites/monsters/troll.png",
  ogre: "/sprites/monsters/ogre.png",
  bat_giant: "/sprites/monsters/bat_giant.png",
  ghoul: "/sprites/monsters/ghoul.png",
  imp: "/sprites/monsters/imp.png",
  harpy: "/sprites/monsters/harpy.png",
  mimic: "/sprites/monsters/mimic.png",
  gelatinous_cube: "/sprites/monsters/gelatinous_cube.png",
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
  const victoryRewardsRef = useRef(victoryRewards);
  useEffect(() => { victoryRewardsRef.current = victoryRewards; }, [victoryRewards]);

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
    if (charClass === "ranger") {
      abilities.push({ id: "hunters_mark", name: "Marca do Cacador", description: "+1d6 dano ao alvo", usesRemaining: 999, maxUses: 999, bonusDamage: 3, isBonusAction: true });
    }
    if (charClass === "monk") {
      abilities.push({ id: "flurry_of_blows", name: "Rajada de Golpes", description: "2 ataques extra", usesRemaining: Math.max(2, level), maxUses: Math.max(2, level), isBonusAction: true });
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
        if (isRaging && damageResistance.length > 0) { damage = Math.floor(damage / 2); }
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

  // D&D 5e XP by CR/tier table
  const claimVictoryMutation = trpc.combat.claimVictory.useMutation({
    onSuccess: (data) => {
      console.log('[Combat] Victory claimed:', data);
      if (data.leveledUp) {
        setVictoryRewards(prev => ({ ...prev, leveledUp: true, newLevel: data.newLevel }));
      }
    },
    onError: (err) => {
      console.error('[Combat] Failed to claim victory:', err);
    },
  });

  const handleVictory = () => {
    setCombatEnded(true); audioSystem.playSFX('victory');
    const XP_BY_TIER: Record<string, number[]> = {
      common:    [25, 10],
      elite:     [50, 30],
      boss:      [100, 75],
      legendary: [200, 150],
    };
    const tierData = XP_BY_TIER[monster.tier] || XP_BY_TIER.common;
    const experience = Math.floor(tierData[0] * monster.level + tierData[1]);
    const gold = Math.floor((monster.level * 8 + 5) * (monster.tier === 'legendary' ? 5 : monster.tier === 'boss' ? 3 : monster.tier === 'elite' ? 2 : 1));
    
    setVictoryRewards({ experience, gold, leveledUp: false, newLevel: character?.level || 1 });
    
    claimVictoryMutation.mutate({
      experience,
      gold,
      monsterName: monster.name,
      monsterLevel: monster.level,
      monsterTier: monster.tier,
    });
    
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

  // Choose background based on monster type
  const getBackgroundImage = () => {
    const type = monster.monsterType?.toLowerCase() || '';
    if (['skeleton', 'skeleton_warrior', 'zombie', 'ghoul', 'imp', 'mimic', 'gelatinous_cube'].includes(type)) {
      return '/sprites/combat/battle-background-dungeon.png';
    }
    if (['wolf', 'wolf_dire', 'spider', 'spider_giant', 'troll', 'ogre', 'harpy'].includes(type)) {
      return '/sprites/combat/battle-background-forest.png';
    }
    return '/sprites/combat/battle-background-grass.png';
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER - NANO BANANA PIXEL ART COMBAT UI
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="relative w-full" style={{ zIndex: 50, background: '#0a0a0a', minHeight: '100dvh' }}>
      <CombatAnimationStyles />

      {/* Full-screen container */}
      <div className="relative flex flex-col w-full" style={{ height: '100dvh', maxHeight: '100dvh' }}>

      {/* ═══ BATTLE ARENA - Top half ═══ */}
      <div
        className="relative flex-shrink-0 overflow-hidden"
        style={{ height: '50%', imageRendering: 'pixelated' as const }}
      >
        {/* Battle background */}
        <img
          src={getBackgroundImage()}
          alt="Battle background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Subtle vignette */}
        <div className="absolute inset-0" style={{ 
          background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.3) 100%)',
        }} />

        {/* ═══ MONSTER (top-right area) ═══ */}
        <div className="absolute z-10" style={{ top: '5%', right: '5%', width: '30%', maxWidth: '320px' }}>
          {/* Monster HP bar */}
          <div className="mb-1" style={{
            background: 'rgba(10,10,25,0.9)',
            border: `2px solid ${tierColor}`,
            borderRadius: '2px',
            padding: '4px 6px',
            boxShadow: `0 0 8px ${tierColor}30`,
          }}>
            <div className="flex justify-between items-center mb-0.5">
              <PixelText size="xxs" color={tierColor} bold className="truncate">{monster.name}</PixelText>
              <PixelText size="xxs" color={COLORS.textGold}>Nv.{monster.level}</PixelText>
            </div>
            <div className="flex items-center gap-1">
              <img src="/sprites/ui/heart.png" alt="HP" style={{ width: '10px', height: '10px', imageRendering: 'pixelated' }} />
              <div className="flex-1">
                <PixelBar current={monsterHealth} max={monster.health} color={COLORS.hpGreen} showValue={false} height={8} segments={10} />
              </div>
              <PixelText size="xxs" color={COLORS.textGray}>{monsterHealth}/{monster.health}</PixelText>
            </div>
          </div>

          {/* Monster sprite on platform */}
          <div className="relative flex flex-col items-center">
            <div className={cn(
              "relative z-10 transition-all duration-200",
              isMonsterHit && "brightness-[3] translate-x-2",
              monsterHealth <= 0 && "opacity-0 scale-0"
            )} style={{ marginBottom: '-35px' }}>
              <img 
                src={monsterSprite} 
                alt={monster.name} 
                className="drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" 
                style={{ imageRendering: 'pixelated', width: 'clamp(80px, 12vw, 180px)', height: 'clamp(80px, 12vw, 180px)', objectFit: 'contain' }} 
              />
            </div>
            <img 
              src="/sprites/combat/platform-enemy.png" 
              alt="" 
              className="relative z-0" 
              style={{ imageRendering: 'pixelated', width: 'clamp(110px, 15vw, 220px)', height: 'auto', opacity: 0.85 }} 
            />
          </div>
        </div>

        {/* ═══ PLAYER (bottom-left area) ═══ */}
        <div className="absolute z-10" style={{ bottom: '2%', left: '4%', width: '30%', maxWidth: '320px' }}>
          {/* Player sprite on platform */}
          <div className={cn(
            "relative flex flex-col items-center transition-all duration-200",
            isPlayerHit && "brightness-[3] -translate-x-2",
            isAttacking && "translate-x-4"
          )}>
            <div className="relative z-10" style={{ marginBottom: '-35px' }}>
              <img 
                src={playerSprite} 
                alt="Player" 
                className="transform scale-x-[-1] drop-shadow-[0_4px_8px_rgba(0,0,0,0.7)]" 
                style={{ imageRendering: 'pixelated', width: 'clamp(80px, 12vw, 180px)', height: 'clamp(80px, 12vw, 180px)', objectFit: 'contain' }} 
              />
            </div>
            <img 
              src="/sprites/combat/platform-player.png" 
              alt="" 
              className="relative z-0" 
              style={{ imageRendering: 'pixelated', width: 'clamp(120px, 16vw, 240px)', height: 'auto', opacity: 0.85 }} 
            />
          </div>

          {/* Player HP bar */}
          <div className="mt-1" style={{
            background: 'rgba(10,10,25,0.9)',
            border: `2px solid ${COLORS.hpGreen}`,
            borderRadius: '2px',
            padding: '4px 6px',
            boxShadow: `0 0 8px ${COLORS.hpGreen}30`,
          }}>
            <div className="flex justify-between items-center mb-0.5">
              <PixelText size="xxs" color={COLORS.textGold} bold className="truncate">{character?.name || "Heroi"}</PixelText>
              <PixelText size="xxs" color={COLORS.textGold}>Nv.{character?.level || 1}</PixelText>
            </div>
            <div className="flex items-center gap-1">
              <img src="/sprites/ui/heart.png" alt="HP" style={{ width: '10px', height: '10px', imageRendering: 'pixelated' }} />
              <div className="flex-1">
                <PixelBar current={playerHealth} max={maxPlayerHealth} color={COLORS.hpGreen} showValue={false} height={8} segments={10} />
              </div>
              <PixelText size="xxs" color={COLORS.textGray}>{playerHealth}/{maxPlayerHealth}</PixelText>
            </div>
            {isRaging && <PixelText size="xxs" color="#ef4444" glow className="block mt-0.5 text-center">FURIA ATIVA</PixelText>}
          </div>
        </div>

        {/* Close button */}
        <button onClick={onClose} className="absolute top-2 left-2 z-30 w-7 h-7 flex items-center justify-center transition-all hover:brightness-125 active:scale-95" style={{
          background: 'linear-gradient(180deg, #8b2020 0%, #5a1010 100%)',
          border: '2px solid #ef4444',
          boxShadow: '0 2px 4px rgba(0,0,0,0.6)',
          fontFamily: PIXEL_FONT, fontSize: '8px', color: '#fff',
        }}>X</button>

        {/* Combat animations */}
        {showAnimation && <CombatAnimation type={animationType} target={animationTarget} damage={animationDamage} isCritical={animationIsCritical} />}
        {showDamageNumber && <DamageNumber value={damageNumberValue} target={damageNumberTarget} isCritical={damageNumberIsCritical} />}
      </div>

      {/* ═══ BOTTOM PANEL - Dialog + Actions (50%) ═══ */}
      <div className="flex-1 flex flex-col overflow-y-auto" style={{
        background: '#0c0c1d',
        borderTop: `3px solid ${COLORS.gold}`,
      }}>

        {/* Turn indicator */}
        {isPlayerTurn && !combatEnded && (
          <div className="flex items-center justify-center gap-3 py-1 flex-shrink-0" style={{ 
            background: 'rgba(20,20,40,0.8)',
            borderBottom: `1px solid ${COLORS.gold}30`,
          }}>
            <img src="/sprites/ui/d20.png" alt="d20" style={{ width: '12px', height: '12px', imageRendering: 'pixelated' }} />
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5" style={{
                background: actionUsed ? '#333' : COLORS.hpGreen,
                border: `1px solid ${actionUsed ? '#555' : COLORS.hpGreen}`,
                boxShadow: actionUsed ? 'none' : `0 0 4px ${COLORS.hpGreen}60`,
              }} />
              <PixelText size="xxs" color={actionUsed ? COLORS.textGray : COLORS.hpGreen}>ACAO</PixelText>
            </div>
            <div className="w-1 h-1" style={{ background: COLORS.gold, transform: 'rotate(45deg)' }} />
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5" style={{
                background: bonusActionUsed ? '#333' : COLORS.xpGold,
                border: `1px solid ${bonusActionUsed ? '#555' : COLORS.xpGold}`,
                boxShadow: bonusActionUsed ? 'none' : `0 0 4px ${COLORS.xpGold}60`,
              }} />
              <PixelText size="xxs" color={bonusActionUsed ? COLORS.textGray : COLORS.xpGold}>BONUS</PixelText>
            </div>
            <img src="/sprites/ui/d20.png" alt="d20" style={{ width: '12px', height: '12px', imageRendering: 'pixelated', transform: 'scaleX(-1)' }} />
          </div>
        )}

        {/* Dialog box with clean Nano Banana frame */}
        <div className="flex-shrink-0 mx-2 mt-1 relative" style={{
          minHeight: 'clamp(75px, 12vh, 120px)',
          maxWidth: '700px',
          alignSelf: 'center',
          width: '100%',
          imageRendering: 'pixelated' as const,
        }}>
          {/* Dialog box background image - clean dark interior */}
          <img 
            src="/sprites/ui/dialog-box.png" 
            alt="" 
            className="absolute inset-0 w-full h-full"
            style={{ imageRendering: 'pixelated', objectFit: 'fill' }}
          />
          {/* Text centered in the clean dark area */}
          <div className="relative z-10 flex items-center justify-center" style={{
            padding: '22px 44px',
            minHeight: '75px',
          }}>
            <PixelText size="md" color="#f0e8d0" className="leading-relaxed text-center" glow>
              {currentMessage}
              {isTyping && <span className="animate-pulse" style={{ color: COLORS.gold }}> _</span>}
            </PixelText>
          </div>
        </div>

        {/* Action buttons with Nano Banana assets */}
        {showMenu && isPlayerTurn && !combatEnded && !showSpells && !showAbilities && (
          <div className="grid grid-cols-2 gap-2 px-3 py-2 flex-shrink-0" style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
            <button
              onClick={handleAttack}
              disabled={actionUsed}
              className="relative transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              style={{ height: 'clamp(48px, 8vh, 80px)' }}
            >
              <img src="/sprites/ui/button-fight.png" alt="FIGHT" className="w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
            </button>
            <button
              onClick={() => { setShowSpells(!showSpells); setShowAbilities(false); }}
              disabled={actionUsed}
              className="relative transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              style={{ height: 'clamp(48px, 8vh, 80px)' }}
            >
              <img src="/sprites/ui/button-magic.png" alt="MAGIC" className="w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
            </button>
            <button
              onClick={() => { setShowAbilities(!showAbilities); setShowSpells(false); }}
              className="relative transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95"
              style={{ height: 'clamp(48px, 8vh, 80px)' }}
            >
              <img src="/sprites/ui/button-items.png" alt="ITEMS" className="w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
            </button>
            <button
              onClick={handleFlee}
              disabled={actionUsed}
              className="relative transition-all hover:brightness-110 hover:scale-[1.02] active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
              style={{ height: 'clamp(48px, 8vh, 80px)' }}
            >
              <img src="/sprites/ui/button-run.png" alt="RUN" className="w-full h-full" style={{ imageRendering: 'pixelated', objectFit: 'contain' }} />
            </button>
          </div>
        )}

        {/* End turn button */}
        {isPlayerTurn && !combatEnded && actionUsed && !showSpells && !showAbilities && (
          <div className="px-2 py-1 flex-shrink-0">
            <button
              onClick={endTurnManually}
              className="w-full py-2 transition-all hover:brightness-125 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(180deg, #3a3a5c 0%, #1e1e3a 100%)',
                border: `2px solid ${COLORS.gold}`,
                boxShadow: `0 3px 0 0 #151530, 0 4px 0 0 rgba(0,0,0,0.3), 0 0 8px ${COLORS.gold}20`,
                fontFamily: PIXEL_FONT,
                fontSize: '8px',
                color: COLORS.gold,
                letterSpacing: '2px',
              }}
            >
              TERMINAR TURNO
            </button>
          </div>
        )}

        {/* Spells sub-menu */}
        {showSpells && (
          <div className="mx-2 mt-1 flex-shrink-0" style={{
            background: 'rgba(20,10,50,0.95)',
            border: `2px solid ${COLORS.textPurple}`,
            boxShadow: `0 0 12px ${COLORS.textPurple}30`,
            padding: '6px',
          }}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1">
                <img src="/sprites/ui/mana.png" alt="" style={{ width: '12px', height: '12px', imageRendering: 'pixelated' }} />
                <PixelText size="xs" color={COLORS.textPurple}>MAGIAS</PixelText>
              </div>
              <button onClick={() => setShowSpells(false)} className="hover:brightness-150 px-1" style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: COLORS.textRed }}>X</button>
            </div>
            <PixelScrollArea maxHeight="90px">
              <div className="grid grid-cols-2 gap-1">
                {availableSpells.length === 0 && <PixelText size="xxs" color={COLORS.textGray}>Sem magias</PixelText>}
                {availableSpells.map((spell) => (
                  <button key={spell.id} onClick={() => handleCastSpell(spell)} disabled={actionUsed}
                    className="p-1.5 text-left transition-all hover:brightness-125 disabled:opacity-35"
                    style={{ background: '#1a0e3a', border: `1px solid ${COLORS.textPurple}40` }}>
                    <PixelText size="xxs" color="#fff" className="block truncate">{spell.name}</PixelText>
                    <PixelText size="xxs" color={COLORS.textPurple}>{spell.damage?.dice || spell.healing?.dice || '—'}</PixelText>
                  </button>
                ))}
              </div>
            </PixelScrollArea>
          </div>
        )}

        {/* Abilities sub-menu */}
        {showAbilities && (
          <div className="mx-2 mt-1 flex-shrink-0" style={{
            background: 'rgba(20,15,5,0.95)',
            border: `2px solid ${COLORS.xpGold}`,
            boxShadow: `0 0 12px ${COLORS.xpGold}30`,
            padding: '6px',
          }}>
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1">
                <img src="/sprites/ui/d20.png" alt="" style={{ width: '12px', height: '12px', imageRendering: 'pixelated' }} />
                <PixelText size="xs" color={COLORS.textGold}>HABILIDADES</PixelText>
              </div>
              <button onClick={() => setShowAbilities(false)} className="hover:brightness-150 px-1" style={{ fontFamily: PIXEL_FONT, fontSize: '8px', color: COLORS.textRed }}>X</button>
            </div>
            <PixelScrollArea maxHeight="90px">
              <div className="grid grid-cols-1 gap-1">
                {classAbilities.length === 0 && <PixelText size="xxs" color={COLORS.textGray}>Sem habilidades</PixelText>}
                {classAbilities.map((ability) => {
                  const isDisabled = ability.isBonusAction ? bonusActionUsed : actionUsed;
                  const usesOk = ability.usesRemaining > 0 || ability.maxUses === 999;
                  const abilityColor = ability.isBonusAction ? COLORS.xpGold : COLORS.hpGreen;
                  return (
                    <button key={ability.id} onClick={() => handleUseAbility(ability)} disabled={isDisabled || !usesOk}
                      className="p-1.5 text-left transition-all hover:brightness-125 disabled:opacity-35 flex items-center gap-2"
                      style={{ background: 'rgba(30,25,15,0.8)', border: `1px solid ${abilityColor}40` }}>
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
          </div>
        )}

        {/* Combat log - single line per entry, no overlap */}
        {!showSpells && !showAbilities && combatLogs.length > 0 && (
          <div className="flex-shrink-0 px-2 py-1">
            {combatLogs.slice(-3).map((log, i) => (
              <div key={i} className="flex items-center gap-1 leading-none" style={{ marginBottom: '2px' }}>
                <div className="w-1.5 h-1.5 flex-shrink-0" style={{
                  background: log.type === 'player' ? COLORS.hpGreen : log.type === 'monster' ? COLORS.hpRed : COLORS.xpGold,
                }} />
                <span className="truncate block" style={{ fontFamily: PIXEL_FONT, fontSize: '7px', color: log.isCritical ? COLORS.textGold : COLORS.textGray, lineHeight: '1.2' }}>{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      </div>{/* end max-width container */}

      {/* Victory/Defeat overlays */}
      {showVictory && <VictoryAnimation experience={victoryRewards.experience} gold={victoryRewards.gold} leveledUp={victoryRewards.leveledUp} newLevel={victoryRewards.newLevel} onComplete={() => onVictory(victoryRewardsRef.current)} />}
      {showDefeat && <DefeatAnimation onComplete={onDefeat} />}
    </div>
  );
}
