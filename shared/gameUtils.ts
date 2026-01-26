import { DICE, LEVEL_XP_REQUIREMENTS, COMBAT, CHARACTER_CLASSES, ATTRIBUTES, MONSTER_TIERS } from "./gameConstants";
import type { DiceType, CharacterClass, Attribute, MonsterTier } from "./gameConstants";

// ============================================
// DICE ROLLING SYSTEM
// ============================================

/**
 * Roll a single die
 */
export function rollDie(diceType: DiceType): number {
  const sides = DICE[diceType].sides;
  return Math.floor(Math.random() * sides) + 1;
}

/**
 * Roll multiple dice and return sum
 */
export function rollDice(diceType: DiceType, count: number = 1): { total: number; rolls: number[] } {
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(rollDie(diceType));
  }
  return {
    total: rolls.reduce((a, b) => a + b, 0),
    rolls,
  };
}

/**
 * Roll with advantage (roll twice, take higher)
 */
export function rollWithAdvantage(diceType: DiceType): { result: number; rolls: [number, number] } {
  const roll1 = rollDie(diceType);
  const roll2 = rollDie(diceType);
  return {
    result: Math.max(roll1, roll2),
    rolls: [roll1, roll2],
  };
}

/**
 * Roll with disadvantage (roll twice, take lower)
 */
export function rollWithDisadvantage(diceType: DiceType): { result: number; rolls: [number, number] } {
  const roll1 = rollDie(diceType);
  const roll2 = rollDie(diceType);
  return {
    result: Math.min(roll1, roll2),
    rolls: [roll1, roll2],
  };
}

// ============================================
// ATTRIBUTE CALCULATIONS
// ============================================

/**
 * Calculate attribute modifier (D&D style: (stat - 10) / 2)
 */
export function getAttributeModifier(value: number): number {
  return Math.floor((value - 10) / 2);
}

/**
 * Calculate total attribute with equipment bonuses
 */
export function getTotalAttribute(baseValue: number, bonuses: number = 0): number {
  return baseValue + bonuses;
}

// ============================================
// LEVEL & EXPERIENCE
// ============================================

/**
 * Get XP required for a specific level
 */
export function getXpForLevel(level: number): number {
  if (level < 1) return 0;
  if (level > LEVEL_XP_REQUIREMENTS.length) return LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];
  return LEVEL_XP_REQUIREMENTS[level - 1];
}

/**
 * Calculate level from total XP
 */
export function getLevelFromXp(totalXp: number): number {
  for (let i = LEVEL_XP_REQUIREMENTS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_XP_REQUIREMENTS[i]) {
      return i + 1;
    }
  }
  return 1;
}

/**
 * Calculate XP progress to next level
 */
export function getXpProgress(currentXp: number, currentLevel: number): { current: number; required: number; percentage: number } {
  const currentLevelXp = getXpForLevel(currentLevel);
  const nextLevelXp = getXpForLevel(currentLevel + 1);
  const xpIntoLevel = currentXp - currentLevelXp;
  const xpRequired = nextLevelXp - currentLevelXp;
  
  return {
    current: xpIntoLevel,
    required: xpRequired,
    percentage: Math.min(100, (xpIntoLevel / xpRequired) * 100),
  };
}

// ============================================
// COMBAT CALCULATIONS
// ============================================

/**
 * Calculate hit chance based on attacker's attributes
 */
export function calculateHitChance(attackerDex: number, defenderAC: number): number {
  const dexMod = getAttributeModifier(attackerDex);
  const baseChance = COMBAT.BASE_HIT_CHANCE + (dexMod * 0.02);
  const acPenalty = (defenderAC - 10) * 0.02;
  return Math.max(0.05, Math.min(0.95, baseChance - acPenalty));
}

/**
 * Calculate damage for an attack
 */
export function calculateDamage(
  baseDamage: number,
  strengthMod: number,
  isCritical: boolean = false
): number {
  let damage = baseDamage + strengthMod;
  if (isCritical) {
    damage *= COMBAT.CRITICAL_HIT_MULTIPLIER;
  }
  return Math.max(1, Math.floor(damage));
}

/**
 * Calculate flee chance
 */
export function calculateFleeChance(playerDex: number, monsterLevel: number, playerLevel: number): number {
  const dexBonus = Math.max(0, playerDex - 10) * COMBAT.FLEE_DEX_BONUS;
  const levelPenalty = Math.max(0, monsterLevel - playerLevel) * 0.05;
  return Math.max(0.1, Math.min(0.8, COMBAT.FLEE_BASE_CHANCE + dexBonus - levelPenalty));
}

/**
 * Perform an attack roll
 */
export function performAttackRoll(): { roll: number; isCritical: boolean; isCriticalMiss: boolean } {
  const roll = rollDie("d20");
  return {
    roll,
    isCritical: roll >= COMBAT.CRITICAL_HIT_THRESHOLD,
    isCriticalMiss: roll <= COMBAT.CRITICAL_MISS_THRESHOLD,
  };
}

// ============================================
// CHARACTER CALCULATIONS
// ============================================

/**
 * Calculate max health for a character
 */
export function calculateMaxHealth(characterClass: CharacterClass, level: number, constitution: number): number {
  const classData = CHARACTER_CLASSES[characterClass];
  const conMod = getAttributeModifier(constitution);
  const baseHealth = classData.healthPerLevel * 2; // Starting health
  const levelHealth = (classData.healthPerLevel + conMod) * (level - 1);
  return Math.max(1, baseHealth + levelHealth);
}

/**
 * Calculate max mana for a character
 */
export function calculateMaxMana(characterClass: CharacterClass, level: number, intelligence: number): number {
  const classData = CHARACTER_CLASSES[characterClass];
  const intMod = getAttributeModifier(intelligence);
  const baseMana = classData.manaPerLevel * 2;
  const levelMana = (classData.manaPerLevel + intMod) * (level - 1);
  return Math.max(0, baseMana + levelMana);
}

/**
 * Calculate armor class
 */
export function calculateArmorClass(dexterity: number, baseArmor: number = 10): number {
  const dexMod = getAttributeModifier(dexterity);
  return baseArmor + dexMod;
}

// ============================================
// MONSTER SCALING
// ============================================

/**
 * Scale monster stats based on player level
 */
export function scaleMonsterStats(
  baseHealth: number,
  baseDamage: number,
  baseArmor: number,
  monsterBaseLevel: number,
  playerLevel: number,
  tier: MonsterTier
): { health: number; damage: number; armor: number; level: number } {
  const tierData = MONSTER_TIERS[tier];
  const levelDiff = Math.max(0, playerLevel - monsterBaseLevel);
  const scaleFactor = 1 + (levelDiff * 0.1);
  
  return {
    health: Math.floor(baseHealth * scaleFactor * tierData.healthMultiplier),
    damage: Math.floor(baseDamage * scaleFactor * tierData.damageMultiplier),
    armor: Math.floor(baseArmor + (levelDiff * 0.5)),
    level: monsterBaseLevel + levelDiff,
  };
}

/**
 * Scale rewards based on monster tier and level
 */
export function scaleRewards(
  baseXp: number,
  baseGold: number,
  monsterLevel: number,
  tier: MonsterTier
): { experience: number; gold: number } {
  const tierData = MONSTER_TIERS[tier];
  const levelMultiplier = 1 + (monsterLevel * 0.1);
  
  return {
    experience: Math.floor(baseXp * levelMultiplier * tierData.rewardMultiplier),
    gold: Math.floor(baseGold * levelMultiplier * tierData.rewardMultiplier),
  };
}

// ============================================
// LOCATION & BIOME
// ============================================

/**
 * Calculate distance between two coordinates in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Generate random point within radius of center
 */
export function getRandomPointInRadius(
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): { latitude: number; longitude: number } {
  const radiusInDegrees = radiusMeters / 111320; // Approximate meters to degrees
  const u = Math.random();
  const v = Math.random();
  const w = radiusInDegrees * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);
  
  // Adjust for latitude
  const newLat = centerLat + y;
  const newLon = centerLon + x / Math.cos((centerLat * Math.PI) / 180);
  
  return {
    latitude: newLat,
    longitude: newLon,
  };
}

/**
 * Generate a seed from coordinates for deterministic generation
 */
export function getLocationSeed(latitude: number, longitude: number, precision: number = 4): number {
  const latStr = latitude.toFixed(precision).replace(".", "");
  const lonStr = longitude.toFixed(precision).replace(".", "");
  const combined = parseInt(latStr + lonStr, 10);
  return combined;
}

// ============================================
// RANDOM GENERATION HELPERS
// ============================================

/**
 * Seeded random number generator
 */
export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.sin(s) * 10000;
    return s - Math.floor(s);
  };
}

/**
 * Pick random item from array with optional seed
 */
export function pickRandom<T>(array: T[], seed?: number): T {
  if (seed !== undefined) {
    const rng = seededRandom(seed);
    return array[Math.floor(rng() * array.length)];
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Weighted random selection
 */
export function weightedRandom<T>(items: Array<{ item: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const { item, weight } of items) {
    random -= weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1].item;
}
