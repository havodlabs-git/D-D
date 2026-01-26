// ============================================
// D&D GAME CONSTANTS
// ============================================

// Character Classes with base stats
export const CHARACTER_CLASSES = {
  warrior: {
    name: "Guerreiro",
    description: "Mestre do combate corpo a corpo, especialista em armas e armaduras pesadas.",
    baseStats: { strength: 14, dexterity: 10, constitution: 14, intelligence: 8, wisdom: 10, charisma: 10 },
    healthPerLevel: 12,
    manaPerLevel: 4,
  },
  mage: {
    name: "Mago",
    description: "Manipulador das artes arcanas, capaz de lançar feitiços devastadores.",
    baseStats: { strength: 8, dexterity: 10, constitution: 10, intelligence: 16, wisdom: 12, charisma: 10 },
    healthPerLevel: 6,
    manaPerLevel: 12,
  },
  rogue: {
    name: "Ladino",
    description: "Especialista furtivo, mestre em ataques surpresa e habilidades.",
    baseStats: { strength: 10, dexterity: 16, constitution: 10, intelligence: 12, wisdom: 10, charisma: 10 },
    healthPerLevel: 8,
    manaPerLevel: 6,
  },
  cleric: {
    name: "Clérigo",
    description: "Servo divino, capaz de curar aliados e banir o mal.",
    baseStats: { strength: 12, dexterity: 8, constitution: 12, intelligence: 10, wisdom: 16, charisma: 10 },
    healthPerLevel: 8,
    manaPerLevel: 10,
  },
  ranger: {
    name: "Patrulheiro",
    description: "Guardião da natureza, especialista em arcos e rastreamento.",
    baseStats: { strength: 12, dexterity: 14, constitution: 12, intelligence: 10, wisdom: 12, charisma: 8 },
    healthPerLevel: 10,
    manaPerLevel: 6,
  },
  paladin: {
    name: "Paladino",
    description: "Cavaleiro sagrado, combinando força marcial com poder divino.",
    baseStats: { strength: 14, dexterity: 8, constitution: 12, intelligence: 10, wisdom: 12, charisma: 14 },
    healthPerLevel: 10,
    manaPerLevel: 8,
  },
  barbarian: {
    name: "Bárbaro",
    description: "Guerreiro selvagem, canaliza fúria primitiva em combate.",
    baseStats: { strength: 16, dexterity: 12, constitution: 16, intelligence: 8, wisdom: 10, charisma: 8 },
    healthPerLevel: 14,
    manaPerLevel: 2,
  },
  bard: {
    name: "Bardo",
    description: "Artista versátil, usa música e magia para inspirar e encantar.",
    baseStats: { strength: 8, dexterity: 12, constitution: 10, intelligence: 12, wisdom: 10, charisma: 16 },
    healthPerLevel: 8,
    manaPerLevel: 8,
  },
} as const;

export type CharacterClass = keyof typeof CHARACTER_CLASSES;

// Attribute names in Portuguese
export const ATTRIBUTES = {
  strength: { name: "Força", abbr: "FOR", description: "Poder físico e capacidade de combate corpo a corpo" },
  dexterity: { name: "Destreza", abbr: "DES", description: "Agilidade, reflexos e precisão" },
  constitution: { name: "Constituição", abbr: "CON", description: "Resistência física e pontos de vida" },
  intelligence: { name: "Inteligência", abbr: "INT", description: "Conhecimento arcano e poder mágico" },
  wisdom: { name: "Sabedoria", abbr: "SAB", description: "Percepção e conexão espiritual" },
  charisma: { name: "Carisma", abbr: "CAR", description: "Influência social e liderança" },
} as const;

export type Attribute = keyof typeof ATTRIBUTES;

// Item Rarities
export const RARITIES = {
  common: { name: "Comum", color: "#9CA3AF", multiplier: 1.0 },
  uncommon: { name: "Incomum", color: "#22C55E", multiplier: 1.25 },
  rare: { name: "Raro", color: "#3B82F6", multiplier: 1.5 },
  epic: { name: "Épico", color: "#A855F7", multiplier: 2.0 },
  legendary: { name: "Lendário", color: "#F59E0B", multiplier: 3.0 },
} as const;

export type Rarity = keyof typeof RARITIES;

// Monster Tiers
export const MONSTER_TIERS = {
  common: { name: "Comum", healthMultiplier: 1.0, damageMultiplier: 1.0, rewardMultiplier: 1.0 },
  elite: { name: "Elite", healthMultiplier: 2.0, damageMultiplier: 1.5, rewardMultiplier: 2.0 },
  boss: { name: "Chefe", healthMultiplier: 5.0, damageMultiplier: 2.0, rewardMultiplier: 5.0 },
  legendary: { name: "Lendário", healthMultiplier: 10.0, damageMultiplier: 3.0, rewardMultiplier: 10.0 },
} as const;

export type MonsterTier = keyof typeof MONSTER_TIERS;

// Biome Types
export const BIOMES = {
  urban: { name: "Urbano", description: "Cidades e vilas", icon: "🏰" },
  forest: { name: "Floresta", description: "Áreas arborizadas", icon: "🌲" },
  water: { name: "Água", description: "Rios, lagos e oceanos", icon: "🌊" },
  mountain: { name: "Montanha", description: "Terrenos elevados", icon: "⛰️" },
  desert: { name: "Deserto", description: "Áreas áridas", icon: "🏜️" },
  plains: { name: "Planície", description: "Campos abertos", icon: "🌾" },
} as const;

export type BiomeType = keyof typeof BIOMES;

// Dice Types
export const DICE = {
  d4: { sides: 4, name: "d4" },
  d6: { sides: 6, name: "d6" },
  d8: { sides: 8, name: "d8" },
  d10: { sides: 10, name: "d10" },
  d12: { sides: 12, name: "d12" },
  d20: { sides: 20, name: "d20" },
  d100: { sides: 100, name: "d100" },
} as const;

export type DiceType = keyof typeof DICE;

// Experience required per level (D&D 5e inspired)
export const LEVEL_XP_REQUIREMENTS = [
  0,      // Level 1
  300,    // Level 2
  900,    // Level 3
  2700,   // Level 4
  6500,   // Level 5
  14000,  // Level 6
  23000,  // Level 7
  34000,  // Level 8
  48000,  // Level 9
  64000,  // Level 10
  85000,  // Level 11
  100000, // Level 12
  120000, // Level 13
  140000, // Level 14
  165000, // Level 15
  195000, // Level 16
  225000, // Level 17
  265000, // Level 18
  305000, // Level 19
  355000, // Level 20
] as const;

export const MAX_LEVEL = 20;
export const STAT_POINTS_PER_LEVEL = 2;

// Combat Constants
export const COMBAT = {
  BASE_HIT_CHANCE: 0.65,
  CRITICAL_HIT_MULTIPLIER: 2,
  CRITICAL_HIT_THRESHOLD: 20, // Natural 20
  CRITICAL_MISS_THRESHOLD: 1, // Natural 1
  FLEE_BASE_CHANCE: 0.4,
  FLEE_DEX_BONUS: 0.02, // Per DEX point above 10
} as const;

// Map Constants
export const MAP = {
  DEFAULT_ZOOM: 16,
  MIN_ZOOM: 12,
  MAX_ZOOM: 19,
  POI_SPAWN_RADIUS_METERS: 500,
  MAX_POIS_PER_AREA: 15,
  INTERACTION_RADIUS_METERS: 50,
} as const;

// NPC Types
export const NPC_TYPES = {
  merchant: { name: "Mercador", icon: "🛒", description: "Vende itens gerais" },
  blacksmith: { name: "Ferreiro", icon: "⚒️", description: "Vende armas e armaduras" },
  alchemist: { name: "Alquimista", icon: "⚗️", description: "Vende poções e ingredientes" },
  quest_giver: { name: "Aventureiro", icon: "📜", description: "Oferece missões" },
  trainer: { name: "Treinador", icon: "🎯", description: "Ensina habilidades" },
  innkeeper: { name: "Estalajadeiro", icon: "🏨", description: "Oferece descanso e recuperação" },
} as const;

export type NpcType = keyof typeof NPC_TYPES;

// Quest Types
export const QUEST_TYPES = {
  kill: { name: "Caça", description: "Derrote monstros específicos" },
  collect: { name: "Coleta", description: "Colete itens específicos" },
  explore: { name: "Exploração", description: "Descubra novos locais" },
  escort: { name: "Escolta", description: "Proteja um NPC" },
  deliver: { name: "Entrega", description: "Leve um item a um destino" },
  boss: { name: "Chefe", description: "Derrote um chefe poderoso" },
} as const;

export type QuestType = keyof typeof QUEST_TYPES;

// Item Types
export const ITEM_TYPES = {
  weapon: { name: "Arma", slot: "weapon", icon: "⚔️" },
  armor: { name: "Armadura", slot: "armor", icon: "🛡️" },
  helmet: { name: "Elmo", slot: "helmet", icon: "⛑️" },
  boots: { name: "Botas", slot: "boots", icon: "👢" },
  gloves: { name: "Luvas", slot: "gloves", icon: "🧤" },
  ring: { name: "Anel", slot: "ring1", icon: "💍" },
  amulet: { name: "Amuleto", slot: "amulet", icon: "📿" },
  potion: { name: "Poção", slot: null, icon: "🧪" },
  scroll: { name: "Pergaminho", slot: null, icon: "📜" },
  material: { name: "Material", slot: null, icon: "💎" },
  quest_item: { name: "Item de Missão", slot: null, icon: "🔑" },
} as const;

export type ItemType = keyof typeof ITEM_TYPES;
