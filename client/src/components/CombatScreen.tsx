import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Sword, Shield, Wind, X, Zap, Target, Clock, BookOpen, Flame, Skull, Heart, Star } from "lucide-react";
import { toast } from "sonner";
import { MONSTER_TIERS, SPELLS, Spell, SPELL_SLOTS_BY_LEVEL, CHARACTER_CLASSES, CLASS_ABILITIES } from "../../../shared/gameConstants";

// Monster sprites mapping
const MONSTER_SPRITES: Record<string, string> = {
  // Base monsters
  goblin: "/sprites/monsters/goblin.png",
  orc: "/sprites/monsters/orc.png",
  skeleton: "/sprites/monsters/skeleton.png",
  dragon: "/sprites/monsters/dragon.png",
  slime: "/sprites/monsters/slime.png",
  wolf: "/sprites/monsters/wolf.png",
  // Goblin variants
  goblin_archer: "/sprites/monsters/goblin_archer.png",
  goblin_shaman: "/sprites/monsters/goblin_shaman.png",
  goblin_boss: "/sprites/monsters/goblin_boss.png",
  // Rat variants
  rat: "/sprites/monsters/rat_giant.png",
  rat_giant: "/sprites/monsters/rat_giant.png",
  rat_sewer: "/sprites/monsters/rat_sewer.png",
  rat_king: "/sprites/monsters/rat_king.png",
  giant_rat: "/sprites/monsters/rat_giant.png",
  // New monsters
  kobold: "/sprites/monsters/kobold.png",
  zombie: "/sprites/monsters/zombie.png",
  spider: "/sprites/monsters/spider_giant.png",
  spider_giant: "/sprites/monsters/spider_giant.png",
  giant_spider: "/sprites/monsters/spider_giant.png",
  bandit: "/sprites/monsters/bandit.png",
  troll: "/sprites/monsters/troll.png",
  ogre: "/sprites/monsters/ogre.png",
  bat: "/sprites/monsters/bat_giant.png",
  bat_giant: "/sprites/monsters/bat_giant.png",
  giant_bat: "/sprites/monsters/bat_giant.png",
  dire_wolf: "/sprites/monsters/wolf_dire.png",
  wolf_dire: "/sprites/monsters/wolf_dire.png",
  skeleton_warrior: "/sprites/monsters/skeleton_warrior.png",
  ghoul: "/sprites/monsters/ghoul.png",
  harpy: "/sprites/monsters/harpy.png",
  mimic: "/sprites/monsters/mimic.png",
  gelatinous_cube: "/sprites/monsters/gelatinous_cube.png",
  ooze: "/sprites/monsters/gelatinous_cube.png",
  imp: "/sprites/monsters/imp.png",
  default: "/sprites/monsters/goblin.png",
};

// Class sprites for player (D&D 5e 2024) - All unique sprites
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

// Ability colors by class
const ABILITY_COLORS: Record<string, string> = {
  barbarian: "text-red-400 bg-red-500/20 border-red-500/50",
  rogue: "text-gray-300 bg-gray-500/20 border-gray-500/50",
  paladin: "text-yellow-400 bg-yellow-500/20 border-yellow-500/50",
  fighter: "text-orange-400 bg-orange-500/20 border-orange-500/50",
  wizard: "text-blue-400 bg-blue-500/20 border-blue-500/50",
  cleric: "text-white bg-white/20 border-white/50",
  ranger: "text-green-400 bg-green-500/20 border-green-500/50",
  bard: "text-pink-400 bg-pink-500/20 border-pink-500/50",
  druid: "text-emerald-400 bg-emerald-500/20 border-emerald-500/50",
  monk: "text-cyan-400 bg-cyan-500/20 border-cyan-500/50",
  sorcerer: "text-purple-400 bg-purple-500/20 border-purple-500/50",
  warlock: "text-violet-400 bg-violet-500/20 border-violet-500/50",
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

// Roll dice helper
function rollDice(dice: string): number {
  const match = dice.match(/(\d+)d(\d+)/);
  if (!match) return 0;
  const [, count, sides] = match;
  let total = 0;
  for (let i = 0; i < parseInt(count); i++) {
    total += Math.floor(Math.random() * parseInt(sides)) + 1;
  }
  return total;
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
  const [showAbilities, setShowAbilities] = useState(false);
  const [selectedSpell, setSelectedSpell] = useState<Spell | null>(null);
  const [selectedAbility, setSelectedAbility] = useState<ClassAbility | null>(null);
  const [availableSpells, setAvailableSpells] = useState<Spell[]>([]);
  const [usedSpellSlots, setUsedSpellSlots] = useState<Record<number, number>>({});
  const [isAttacking, setIsAttacking] = useState(false);
  const [isMonsterHit, setIsMonsterHit] = useState(false);
  const [isPlayerHit, setIsPlayerHit] = useState(false);
  const [showAttackDetails, setShowAttackDetails] = useState(false);
  
  // Class ability states
  const [classAbilities, setClassAbilities] = useState<ClassAbility[]>([]);
  const [isRaging, setIsRaging] = useState(false);
  const [sneakAttackUsed, setSneakAttackUsed] = useState(false);
  const [layOnHandsPool, setLayOnHandsPool] = useState(0);
  const [hasAdvantage, setHasAdvantage] = useState(false);
  const [damageResistance, setDamageResistance] = useState<string[]>([]);

  const { data: character } = trpc.character.get.useQuery();
  const attackMutation = trpc.combat.attack.useMutation();
  const fleeMutation = trpc.combat.flee.useMutation();
  const utils = trpc.useUtils();

  // Get class data for attack details
  const classData = character ? CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES] : null;

  // Initialize class abilities based on character class and level
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
        const isKnown = knownSpellIds.includes(spell.id) || spell.level === 0;
        const levelRequirement = spell.level <= Math.ceil(character.level / 2);
        return isClassSpell && (isKnown || spell.level === 0) && levelRequirement;
      });
      setAvailableSpells(classSpells);
      
      // Initialize class abilities
      const abilities: ClassAbility[] = [];
      const charClass = character.characterClass;
      const charLevel = character.level;
      
      // BARBARIAN abilities
      if (charClass === "barbarian") {
        const rageAbility = CLASS_ABILITIES.rage;
        const rageUses = rageAbility.usesAtLevel[Math.min(charLevel - 1, 19)];
        abilities.push({
          id: "rage",
          name: "Fúria",
          description: "Bônus de dano, resistência a dano físico, vantagem em Força.",
          usesRemaining: rageUses,
          maxUses: rageUses,
          bonusDamage: rageAbility.bonusDamageAtLevel[Math.min(charLevel - 1, 19)],
        });
        
        if (charLevel >= 2) {
          abilities.push({
            id: "reckless_attack",
            name: "Ataque Descuidado",
            description: "Vantagem em ataques, mas inimigos têm vantagem contra você.",
            usesRemaining: 999,
            maxUses: 999,
          });
        }
      }
      
      // ROGUE abilities
      if (charClass === "rogue") {
        const sneakDice = CLASS_ABILITIES.sneak_attack.damageDiceAtLevel[Math.min(charLevel - 1, 19)];
        abilities.push({
          id: "sneak_attack",
          name: "Ataque Furtivo",
          description: `Dano extra de ${sneakDice} quando tem vantagem ou aliado próximo.`,
          usesRemaining: 1,
          maxUses: 1,
        });
        
        if (charLevel >= 5) {
          abilities.push({
            id: "uncanny_dodge",
            name: "Esquiva Sobrenatural",
            description: "Reduz o dano de um ataque pela metade (reação).",
            usesRemaining: 1,
            maxUses: 1,
          });
        }
      }
      
      // PALADIN abilities
      if (charClass === "paladin") {
        abilities.push({
          id: "lay_on_hands",
          name: "Cura pelas Mãos",
          description: `Cura até ${charLevel * 5} pontos de vida total.`,
          usesRemaining: charLevel * 5,
          maxUses: charLevel * 5,
        });
        setLayOnHandsPool(charLevel * 5);
        
        if (charLevel >= 2) {
          abilities.push({
            id: "divine_smite",
            name: "Punição Divina",
            description: "Gasta slot de magia para 2d8+ dano radiante extra.",
            usesRemaining: 999,
            maxUses: 999,
          });
        }
      }
      
      // FIGHTER abilities
      if (charClass === "fighter") {
        abilities.push({
          id: "second_wind",
          name: "Retomar Fôlego",
          description: `Recupera 1d10+${charLevel} pontos de vida.`,
          usesRemaining: 1,
          maxUses: 1,
        });
        
        if (charLevel >= 2) {
          const actionSurgeUses = charLevel >= 17 ? 2 : 1;
          abilities.push({
            id: "action_surge",
            name: "Surto de Ação",
            description: "Realiza uma ação adicional neste turno.",
            usesRemaining: actionSurgeUses,
            maxUses: actionSurgeUses,
          });
        }
      }
      
      // CLERIC abilities
      if (charClass === "cleric" && charLevel >= 2) {
        const channelUses = charLevel >= 18 ? 3 : charLevel >= 6 ? 2 : 1;
        abilities.push({
          id: "channel_divinity",
          name: "Canalizar Divindade",
          description: "Expulsa mortos-vivos ou usa poder do domínio.",
          usesRemaining: channelUses,
          maxUses: channelUses,
        });
      }
      
      // WIZARD abilities
      if (charClass === "wizard") {
        abilities.push({
          id: "arcane_recovery",
          name: "Recuperação Arcana",
          description: `Recupera slots de magia (até nível ${Math.ceil(charLevel / 2)}).`,
          usesRemaining: 1,
          maxUses: 1,
        });
      }
      
      // MONK abilities
      if (charClass === "monk" && charLevel >= 2) {
        abilities.push({
          id: "ki_points",
          name: "Pontos de Ki",
          description: "Use para Flurry of Blows, Patient Defense ou Step of the Wind.",
          usesRemaining: charLevel,
          maxUses: charLevel,
        });
      }
      
      // RANGER abilities
      if (charClass === "ranger") {
        abilities.push({
          id: "favored_enemy",
          name: "Inimigo Favorito",
          description: "Vantagem em rastrear e bônus de dano contra tipo de criatura.",
          usesRemaining: 999,
          maxUses: 999,
        });
      }
      
      // SORCERER abilities
      if (charClass === "sorcerer" && charLevel >= 2) {
        abilities.push({
          id: "sorcery_points",
          name: "Pontos de Feitiçaria",
          description: "Use para Metamagia ou converter em slots de magia.",
          usesRemaining: charLevel,
          maxUses: charLevel,
        });
      }
      
      // WARLOCK abilities
      if (charClass === "warlock") {
        abilities.push({
          id: "eldritch_invocations",
          name: "Invocações Místicas",
          description: "Poderes especiais concedidos pelo patrono.",
          usesRemaining: 999,
          maxUses: 999,
        });
      }
      
      // BARD abilities
      if (charClass === "bard") {
        const inspirationDice = charLevel >= 15 ? "d12" : charLevel >= 10 ? "d10" : charLevel >= 5 ? "d8" : "d6";
        const charisma = character.charisma || 10;
        const chaMod = Math.max(1, Math.floor((charisma - 10) / 2));
        abilities.push({
          id: "bardic_inspiration",
          name: "Inspiração Bárdica",
          description: `Dá ${inspirationDice} de bônus a um aliado.`,
          usesRemaining: chaMod,
          maxUses: chaMod,
        });
      }
      
      // DRUID abilities
      if (charClass === "druid" && charLevel >= 2) {
        abilities.push({
          id: "wild_shape",
          name: "Forma Selvagem",
          description: "Transforma-se em um animal.",
          usesRemaining: 2,
          maxUses: 2,
        });
      }
      
      setClassAbilities(abilities);
    }
  }, [character, monster.name, monster.level]);

  const addLog = (type: CombatLog["type"], message: string, damage?: number, isCritical?: boolean) => {
    setCombatLogs((prev) => [...prev, { type, message, damage, isCritical }]);
  };

  // Calculate player attack damage based on D&D 5e rules
  const calculatePlayerDamage = () => {
    if (!character || !classData) return { min: 1, max: 6, avg: 3.5, modifier: 0, diceSize: 6 };
    
    const primaryStat = classData.primaryAbility;
    const statValue = character[primaryStat as keyof typeof character] as number || 10;
    const modifier = Math.floor((statValue - 10) / 2);
    
    const hasMartial = (classData.weaponProficiencies as readonly string[]).includes("martial");
    const diceSize = hasMartial ? 8 : 6;
    
    // Add rage bonus if active
    let bonusDamage = 0;
    if (isRaging) {
      const rageAbility = classAbilities.find(a => a.id === "rage");
      bonusDamage = rageAbility?.bonusDamage || 2;
    }
    
    return {
      min: 1 + modifier + bonusDamage,
      max: diceSize + modifier + bonusDamage,
      avg: ((1 + diceSize) / 2) + modifier + bonusDamage,
      modifier,
      diceSize,
      bonusDamage,
    };
  };

  // Use class ability
  const useAbility = (ability: ClassAbility) => {
    if (ability.usesRemaining <= 0 && ability.maxUses !== 999) {
      toast.error("Habilidade esgotada!");
      return;
    }
    
    switch (ability.id) {
      case "rage":
        if (isRaging) {
          toast.info("Você já está em fúria!");
          return;
        }
        setIsRaging(true);
        setDamageResistance(["bludgeoning", "piercing", "slashing"]);
        setHasAdvantage(true);
        addLog("ability", `🔥 FÚRIA ATIVADA! +${ability.bonusDamage} dano, resistência a dano físico!`);
        setClassAbilities(prev => prev.map(a => 
          a.id === "rage" ? { ...a, usesRemaining: a.usesRemaining - 1, isActive: true } : a
        ));
        break;
        
      case "reckless_attack":
        setHasAdvantage(true);
        addLog("ability", "⚡ Ataque Descuidado! Vantagem em ataques, mas inimigos têm vantagem contra você.");
        // Perform attack with advantage
        handleAttackWithBonus(true);
        return;
        
      case "sneak_attack":
        if (sneakAttackUsed) {
          toast.info("Ataque Furtivo já usado neste turno!");
          return;
        }
        const sneakDice = CLASS_ABILITIES.sneak_attack.damageDiceAtLevel[Math.min((character?.level || 1) - 1, 19)];
        const sneakDamage = rollDice(sneakDice);
        addLog("ability", `🗡️ Ataque Furtivo! +${sneakDamage} de dano extra (${sneakDice})!`);
        setSneakAttackUsed(true);
        handleAttackWithBonus(false, sneakDamage);
        return;
        
      case "divine_smite":
        setSelectedAbility(ability);
        setShowAbilities(false);
        // Will be handled when attacking
        addLog("ability", "✨ Punição Divina preparada! Próximo ataque causará dano radiante extra.");
        break;
        
      case "lay_on_hands":
        if (layOnHandsPool <= 0) {
          toast.error("Reserva de cura esgotada!");
          return;
        }
        const healAmount = Math.min(layOnHandsPool, maxPlayerHealth - playerHealth, 10);
        if (healAmount <= 0) {
          toast.info("Você já está com vida cheia!");
          return;
        }
        setPlayerHealth(prev => Math.min(prev + healAmount, maxPlayerHealth));
        setLayOnHandsPool(prev => prev - healAmount);
        addLog("ability", `💚 Cura pelas Mãos! Recuperou ${healAmount} pontos de vida.`);
        setClassAbilities(prev => prev.map(a => 
          a.id === "lay_on_hands" ? { ...a, usesRemaining: layOnHandsPool - healAmount } : a
        ));
        break;
        
      case "second_wind":
        const healRoll = rollDice("1d10") + (character?.level || 1);
        const actualHeal = Math.min(healRoll, maxPlayerHealth - playerHealth);
        setPlayerHealth(prev => Math.min(prev + actualHeal, maxPlayerHealth));
        addLog("ability", `💨 Retomar Fôlego! Recuperou ${actualHeal} pontos de vida.`);
        setClassAbilities(prev => prev.map(a => 
          a.id === "second_wind" ? { ...a, usesRemaining: a.usesRemaining - 1 } : a
        ));
        break;
        
      case "action_surge":
        addLog("ability", "⚡ Surto de Ação! Você pode realizar uma ação adicional!");
        setClassAbilities(prev => prev.map(a => 
          a.id === "action_surge" ? { ...a, usesRemaining: a.usesRemaining - 1 } : a
        ));
        // Allow another attack
        handleAttack();
        return;
        
      case "uncanny_dodge":
        addLog("ability", "🛡️ Esquiva Sobrenatural preparada! O próximo dano recebido será reduzido pela metade.");
        setClassAbilities(prev => prev.map(a => 
          a.id === "uncanny_dodge" ? { ...a, usesRemaining: a.usesRemaining - 1, isActive: true } : a
        ));
        break;
        
      case "channel_divinity":
        // Turn Undead effect
        if (monster.monsterType?.toLowerCase() === "skeleton" || monster.name.toLowerCase().includes("morto-vivo")) {
          const wisdomSave = Math.floor(Math.random() * 20) + 1;
          const dc = 8 + 2 + Math.floor(((character?.wisdom || 10) - 10) / 2);
          if (wisdomSave < dc) {
            addLog("ability", `✝️ Expulsar Mortos-Vivos! ${monster.name} está aterrorizado e foge!`);
            // End combat with victory
            handleVictory();
            return;
          } else {
            addLog("ability", `✝️ Expulsar Mortos-Vivos! ${monster.name} resistiu ao efeito.`);
          }
        } else {
          addLog("ability", `✝️ Canalizar Divindade! Energia divina flui através de você.`);
        }
        setClassAbilities(prev => prev.map(a => 
          a.id === "channel_divinity" ? { ...a, usesRemaining: a.usesRemaining - 1 } : a
        ));
        break;
        
      case "ki_points":
        // Flurry of Blows - two extra attacks
        addLog("ability", "👊 Rajada de Golpes! Dois ataques extras!");
        setClassAbilities(prev => prev.map(a => 
          a.id === "ki_points" ? { ...a, usesRemaining: a.usesRemaining - 1 } : a
        ));
        handleAttackWithBonus(false, 0, 2);
        return;
        
      default:
        addLog("ability", `✨ ${ability.name} ativada!`);
    }
    
    setShowAbilities(false);
  };

  const handleAttackWithBonus = async (withAdvantage: boolean = false, bonusDamage: number = 0, extraAttacks: number = 0) => {
    if (!isPlayerTurn || combatEnded) return;

    setShowAttackDetails(false);
    setShowAbilities(false);
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

        // Apply advantage - roll twice, take higher
        let finalRoll = result.playerAttack.roll;
        if (withAdvantage || hasAdvantage) {
          const secondRoll = Math.floor(Math.random() * 20) + 1;
          finalRoll = Math.max(result.playerAttack.roll, secondRoll);
          addLog("system", `🎲 Vantagem! Rolagens: ${result.playerAttack.roll}, ${secondRoll} → ${finalRoll}`);
        }
        
        setDiceRoll(finalRoll);

        // Calculate total damage with bonuses
        let totalDamage = result.playerAttack.damage + bonusDamage;
        if (isRaging) {
          const rageAbility = classAbilities.find(a => a.id === "rage");
          totalDamage += rageAbility?.bonusDamage || 2;
        }
        
        // Divine Smite
        if (selectedAbility?.id === "divine_smite") {
          const smiteDamage = rollDice("2d8");
          totalDamage += smiteDamage;
          addLog("ability", `✨ Punição Divina! +${smiteDamage} dano radiante!`);
          setSelectedAbility(null);
          // Use a spell slot
          setUsedSpellSlots(prev => ({ ...prev, 1: (prev[1] || 0) + 1 }));
        }

        if (finalRoll === 1) {
          addLog("player", "🎲 Falha crítica (1)! Você errou completamente!");
        } else if (finalRoll >= monster.armor || finalRoll === 20) {
          setIsMonsterHit(true);
          setTimeout(() => setIsMonsterHit(false), 300);
          const isCrit = finalRoll === 20 || result.playerAttack.isCritical;
          const finalDamage = isCrit ? totalDamage * 2 : totalDamage;
          const critText = isCrit ? " 💥 CRÍTICO!" : "";
          addLog("player", `⚔️ Ataque (${finalRoll} vs AC ${monster.armor}): ${finalDamage} de dano!${critText}`, finalDamage, isCrit);
          
          const newHealth = Math.max(0, monsterHealth - finalDamage);
          setMonsterHealth(newHealth);
          
          if (newHealth <= 0) {
            handleVictory();
            return;
          }
        } else {
          addLog("player", `⚔️ Ataque (${finalRoll} vs AC ${monster.armor}): Errou!`);
        }

        // Extra attacks (from abilities like Flurry of Blows)
        if (extraAttacks > 0) {
          for (let i = 0; i < extraAttacks; i++) {
            const extraRoll = Math.floor(Math.random() * 20) + 1;
            const extraDamage = Math.floor(Math.random() * 6) + 1 + Math.floor(((character?.dexterity || 10) - 10) / 2);
            if (extraRoll >= monster.armor) {
              addLog("player", `👊 Ataque extra (${extraRoll}): ${extraDamage} de dano!`, extraDamage);
              setMonsterHealth(prev => Math.max(0, prev - extraDamage));
            } else {
              addLog("player", `👊 Ataque extra (${extraRoll}): Errou!`);
            }
          }
        }

        setIsAttacking(false);

        // Monster's turn
        if (monsterHealth > 0) {
          setTimeout(() => {
            let monsterDamage = result.monsterAttack.damage;
            
            // Apply damage resistance from Rage
            if (damageResistance.length > 0) {
              monsterDamage = Math.floor(monsterDamage / 2);
              addLog("system", `🛡️ Resistência a dano! Dano reduzido para ${monsterDamage}.`);
            }
            
            // Uncanny Dodge
            const uncannyDodge = classAbilities.find(a => a.id === "uncanny_dodge" && a.isActive);
            if (uncannyDodge) {
              monsterDamage = Math.floor(monsterDamage / 2);
              addLog("ability", `🛡️ Esquiva Sobrenatural! Dano reduzido para ${monsterDamage}.`);
              setClassAbilities(prev => prev.map(a => 
                a.id === "uncanny_dodge" ? { ...a, isActive: false } : a
              ));
            }
            
            if (result.monsterAttack.hit) {
              setIsPlayerHit(true);
              setTimeout(() => setIsPlayerHit(false), 300);
              addLog("monster", `👹 ${monster.name} atacou: ${monsterDamage} de dano!`, monsterDamage);
            } else {
              addLog("monster", `👹 ${monster.name} errou o ataque!`);
            }

            const newPlayerHealth = Math.max(0, playerHealth - (result.monsterAttack.hit ? monsterDamage : 0));
            setPlayerHealth(newPlayerHealth);

            if (newPlayerHealth <= 0) {
              setCombatEnded(true);
              addLog("system", "💀 Você foi derrotado...");
            } else {
              setIsPlayerTurn(true);
              setSneakAttackUsed(false); // Reset sneak attack for new turn
            }
          }, 500);
        }
      } catch (error) {
        console.error("Attack error:", error);
        toast.error("Erro ao atacar!");
        setIsAttacking(false);
      }
    }, 500);
  };

  const handleAttack = async () => {
    handleAttackWithBonus(false, 0, 0);
  };

  const handleVictory = () => {
    setCombatEnded(true);
    const xpReward = monster.level * 50 + Math.floor((MONSTER_TIERS[monster.tier as keyof typeof MONSTER_TIERS]?.rewardMultiplier || 1) * 25);
    const goldReward = Math.floor(Math.random() * (monster.level * 10)) + monster.level * 5;
    addLog("system", `🎉 Vitória! +${xpReward} XP, +${goldReward} ouro!`);
    
    setTimeout(() => {
      onVictory({ experience: xpReward, gold: goldReward });
    }, 1500);
  };

  const handleCastSpell = async (spell: Spell) => {
    if (!isPlayerTurn || combatEnded) return;
    
    // Check spell slots
    if (spell.level > 0) {
      const slots = getSpellSlots(spell.level);
      if (slots.total - slots.used <= 0) {
        toast.error("Sem slots de magia disponíveis!");
        return;
      }
      setUsedSpellSlots(prev => ({ ...prev, [spell.level]: (prev[spell.level] || 0) + 1 }));
    }
    
    setShowSpells(false);
    setSelectedSpell(null);
    setIsRolling(true);
    
    const rollInterval = setInterval(() => {
      setDiceRoll(Math.floor(Math.random() * 20) + 1);
    }, 50);

    setTimeout(() => {
      clearInterval(rollInterval);
      setIsRolling(false);
      
      // Calculate spell damage
      let damage = 0;
      if (typeof spell.damage === 'object' && spell.damage.dice) {
        damage = rollDice(spell.damage.dice);
      } else if (typeof spell.damage === 'string') {
        damage = rollDice(spell.damage);
      }
      
      // Add spellcasting modifier
      if (character && classData) {
        const spellcastingData = classData.spellcasting;
        if (typeof spellcastingData === 'object' && spellcastingData && 'spellcastingAbility' in spellcastingData) {
          const spellAbility = (spellcastingData as { spellcastingAbility: string }).spellcastingAbility || "intelligence";
          const statValue = character[spellAbility as keyof typeof character] as number || 10;
          const modifier = Math.floor((statValue - 10) / 2);
          damage += modifier;
        }
      }
      
      setIsMonsterHit(true);
      setTimeout(() => setIsMonsterHit(false), 300);
      
      addLog("player", `✨ ${spell.name}: ${damage} de dano ${spell.damage?.type || "mágico"}!`, damage);
      
      const newHealth = Math.max(0, monsterHealth - damage);
      setMonsterHealth(newHealth);
      
      if (newHealth <= 0) {
        handleVictory();
      } else {
        setIsPlayerTurn(false);
        setTimeout(() => {
          // Monster counter-attack
          const monsterRoll = Math.floor(Math.random() * 20) + 1;
          const playerAC = 10 + Math.floor(((character?.dexterity || 10) - 10) / 2);
          
          if (monsterRoll >= playerAC) {
            let monsterDamage = Math.floor(Math.random() * monster.damage) + 1;
            
            if (damageResistance.length > 0) {
              monsterDamage = Math.floor(monsterDamage / 2);
            }
            
            setIsPlayerHit(true);
            setTimeout(() => setIsPlayerHit(false), 300);
            addLog("monster", `👹 ${monster.name} atacou: ${monsterDamage} de dano!`, monsterDamage);
            
            const newPlayerHealth = Math.max(0, playerHealth - monsterDamage);
            setPlayerHealth(newPlayerHealth);
            
            if (newPlayerHealth <= 0) {
              setCombatEnded(true);
              addLog("system", "💀 Você foi derrotado...");
            }
          } else {
            addLog("monster", `👹 ${monster.name} errou o ataque!`);
          }
          
          setIsPlayerTurn(true);
          setSneakAttackUsed(false);
        }, 500);
      }
    }, 500);
  };

  const handleFlee = async () => {
    if (!isPlayerTurn || combatEnded) return;
    
    try {
      const result = await fleeMutation.mutateAsync({ monsterLevel: monster.level, monsterDamage: monster.damage });
      
      if (result.success) {
        addLog("system", "🏃 Você fugiu com sucesso!");
        setCombatEnded(true);
        setTimeout(onClose, 1000);
      } else {
        addLog("system", "❌ Falha ao fugir! O monstro bloqueia sua saída.");
        setIsPlayerTurn(false);
        
        setTimeout(() => {
          let monsterDamage = Math.floor(Math.random() * monster.damage) + 1;
          if (damageResistance.length > 0) {
            monsterDamage = Math.floor(monsterDamage / 2);
          }
          setIsPlayerHit(true);
          setTimeout(() => setIsPlayerHit(false), 300);
          addLog("monster", `👹 ${monster.name} atacou enquanto você tentava fugir: ${monsterDamage} de dano!`, monsterDamage);
          
          const newPlayerHealth = Math.max(0, playerHealth - monsterDamage);
          setPlayerHealth(newPlayerHealth);
          
          if (newPlayerHealth <= 0) {
            setCombatEnded(true);
            addLog("system", "💀 Você foi derrotado...");
          } else {
            setIsPlayerTurn(true);
          }
        }, 500);
      }
    } catch (error) {
      console.error("Flee error:", error);
      toast.error("Erro ao tentar fugir!");
    }
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
              {isRaging && <Flame className="w-5 h-5 text-red-500 animate-pulse" />}
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
                  isPlayerHit && "brightness-150",
                  isRaging && "hue-rotate-15 saturate-150"
                )}
              />
              {isRaging && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Flame className="w-6 h-6 text-red-500 animate-bounce" />
                </div>
              )}
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
                    tierData?.color || "bg-gray-500"
                  )}>
                    {tierData?.name || monster.tier}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Nível {monster.level} • AC {monster.armor} • Dano {monster.damage}
                </div>
              </div>
            </div>
            <Progress value={healthPercent} className="h-3 bg-destructive/20" />
            <div className="text-xs text-center mt-1 text-destructive">
              {monsterHealth} / {monster.health} HP
            </div>
          </div>

          {/* Player Info */}
          <div className="bg-primary/10 rounded-lg p-3 border border-primary/30">
            <div className="flex items-center gap-3 mb-2">
              <img 
                src={CLASS_SPRITES[playerClass]} 
                alt="Player"
                className="w-10 h-10 pixelated"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold pixel-text">{character?.name || "Herói"}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20">
                    {CHARACTER_CLASSES[playerClass as keyof typeof CHARACTER_CLASSES]?.name || playerClass}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Nível {character?.level || 1}
                  {isRaging && <span className="text-red-400 ml-2">🔥 Em Fúria</span>}
                  {hasAdvantage && <span className="text-green-400 ml-2">✨ Vantagem</span>}
                </div>
              </div>
            </div>
            <Progress value={playerHealthPercent} className="h-3 bg-primary/20" />
            <div className="text-xs text-center mt-1 text-primary">
              {playerHealth} / {maxPlayerHealth} HP
            </div>
          </div>

          {/* Dice Roll Display */}
          {diceRoll !== null && (
            <div className="text-center">
              <div className={cn(
                "inline-flex items-center justify-center w-16 h-16 rounded-lg border-2",
                isRolling ? "animate-spin border-primary" : 
                diceRoll === 20 ? "border-yellow-500 bg-yellow-500/20" :
                diceRoll === 1 ? "border-red-500 bg-red-500/20" :
                "border-muted"
              )}>
                <span className={cn(
                  "text-2xl font-bold pixel-text",
                  diceRoll === 20 && "text-yellow-400",
                  diceRoll === 1 && "text-red-400"
                )}>
                  {diceRoll}
                </span>
              </div>
            </div>
          )}

          {/* Combat Log */}
          <div className="bg-muted/30 rounded-lg p-2 max-h-24 overflow-y-auto">
            {combatLogs.slice(-5).map((log, i) => (
              <div key={i} className={cn(
                "text-xs py-0.5",
                log.type === "player" && "text-primary",
                log.type === "monster" && "text-destructive",
                log.type === "ability" && "text-yellow-400",
                log.type === "system" && "text-muted-foreground"
              )}>
                {log.message}
              </div>
            ))}
          </div>

          {/* Attack Details Panel */}
          {!combatEnded && showAttackDetails && (
            <div className="bg-primary/10 rounded-lg p-3 border border-primary/50">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-primary pixel-text">Detalhes do Ataque</h4>
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
                  <div className="font-bold">
                    1d{attackDetails.diceSize} + {attackDetails.modifier}
                    {(attackDetails.bonusDamage ?? 0) > 0 && <span className="text-red-400"> +{attackDetails.bonusDamage}</span>}
                  </div>
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

          {/* Class Abilities Panel */}
          {!combatEnded && showAbilities && (
            <div className={cn(
              "rounded-lg p-3 border",
              ABILITY_COLORS[playerClass] || "bg-gray-500/20 border-gray-500/50"
            )}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold pixel-text flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  Habilidades de Classe
                </h4>
                <Button variant="ghost" size="sm" onClick={() => setShowAbilities(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {classAbilities.map(ability => {
                  const canUse = ability.usesRemaining > 0 || ability.maxUses === 999;
                  const isActive = ability.isActive;
                  
                  return (
                    <button
                      key={ability.id}
                      onClick={() => canUse && useAbility(ability)}
                      disabled={!canUse || !isPlayerTurn}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors",
                        isActive ? "bg-yellow-500/30 ring-2 ring-yellow-400" :
                        canUse ? "bg-black/20 hover:bg-black/30 cursor-pointer" : 
                        "bg-black/10 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {ability.id === "rage" && <Flame className="w-4 h-4 text-red-400" />}
                          {ability.id === "sneak_attack" && <Skull className="w-4 h-4 text-gray-400" />}
                          {ability.id === "divine_smite" && <Zap className="w-4 h-4 text-yellow-400" />}
                          {ability.id === "lay_on_hands" && <Heart className="w-4 h-4 text-green-400" />}
                          {ability.id === "second_wind" && <Wind className="w-4 h-4 text-blue-400" />}
                          {ability.id === "action_surge" && <Zap className="w-4 h-4 text-orange-400" />}
                          {ability.name}
                          {isActive && <span className="text-xs text-yellow-400">(Ativo)</span>}
                        </div>
                        {ability.maxUses !== 999 && (
                          <span className="text-xs bg-black/30 px-2 py-1 rounded">
                            {ability.usesRemaining}/{ability.maxUses}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{ability.description}</p>
                    </button>
                  );
                })}
                
                {classAbilities.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma habilidade de classe disponível ainda.
                  </p>
                )}
              </div>
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
                          <span className={cn("text-xs px-1.5 py-0.5 rounded", SCHOOL_COLORS[spell.school] || "bg-gray-500/20")}>
                            {spell.level === 0 ? "C" : spell.level}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {typeof spell.damage === 'object' ? `${spell.damage.dice} ${spell.damage.type}` : (spell.healing ? spell.healing.dice + ' cura' : 'Utilidade')}
                        </div>
                      </div>
                      {spell.level > 0 && slots && (
                        <span className="text-xs bg-purple-900/50 px-2 py-1 rounded">
                          {slots.total - slots.used}/{slots.total}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Victory/Defeat */}
          {combatEnded && (
            <div className="text-center py-4">
              {monsterHealth <= 0 ? (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-yellow-400 pixel-text">🎉 Vitória!</h3>
                  <p className="text-muted-foreground">Você derrotou {monster.name}!</p>
                </div>
              ) : playerHealth <= 0 ? (
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-destructive pixel-text">💀 Derrota</h3>
                  <p className="text-muted-foreground">Você foi derrotado por {monster.name}...</p>
                  <Button onClick={onDefeat} className="mt-4">
                    Continuar
                  </Button>
                </div>
              ) : null}
            </div>
          )}

          {/* Action Buttons */}
          {!combatEnded && !showAttackDetails && !showSpells && !showAbilities && (
            <div className="grid grid-cols-4 gap-2">
              <Button
                size="lg"
                className="h-12 pixel-text flex-col gap-0.5"
                onClick={() => setShowAttackDetails(true)}
                disabled={!isPlayerTurn || attackMutation.isPending}
              >
                <Sword className="w-5 h-5" />
                <span className="text-xs">Atacar</span>
              </Button>
              {classAbilities.length > 0 && (
                <Button
                  size="lg"
                  variant="secondary"
                  className={cn("h-12 pixel-text flex-col gap-0.5", ABILITY_COLORS[playerClass]?.split(" ")[0])}
                  onClick={() => setShowAbilities(true)}
                  disabled={!isPlayerTurn}
                >
                  <Star className="w-5 h-5" />
                  <span className="text-xs">Poder</span>
                </Button>
              )}
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
