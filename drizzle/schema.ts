import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, decimal, boolean } from "drizzle-orm/mysql-core";

// ============================================
// USER TABLE (Core auth - extended for game)
// ============================================
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================
// CHARACTER TABLE (Player's D&D Character)
// ============================================
export const characters = mysqlTable("characters", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  
  // D&D Class
  characterClass: mysqlEnum("characterClass", [
    "warrior", "mage", "rogue", "cleric", "ranger", "paladin", "barbarian", "bard"
  ]).notNull(),
  
  // Level & Experience
  level: int("level").default(1).notNull(),
  experience: int("experience").default(0).notNull(),
  experienceToNextLevel: int("experienceToNextLevel").default(100).notNull(),
  
  // D&D Attributes (Base values)
  strength: int("strength").default(10).notNull(),
  dexterity: int("dexterity").default(10).notNull(),
  constitution: int("constitution").default(10).notNull(),
  intelligence: int("intelligence").default(10).notNull(),
  wisdom: int("wisdom").default(10).notNull(),
  charisma: int("charisma").default(10).notNull(),
  
  // Combat Stats
  maxHealth: int("maxHealth").default(100).notNull(),
  currentHealth: int("currentHealth").default(100).notNull(),
  maxMana: int("maxMana").default(50).notNull(),
  currentMana: int("currentMana").default(50).notNull(),
  armorClass: int("armorClass").default(10).notNull(),
  
  // Economy
  gold: int("gold").default(100).notNull(),
  
  // Location
  lastLatitude: decimal("lastLatitude", { precision: 10, scale: 7 }),
  lastLongitude: decimal("lastLongitude", { precision: 10, scale: 7 }),
  
  // Stat points available for allocation
  availableStatPoints: int("availableStatPoints").default(0).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = typeof characters.$inferInsert;

// ============================================
// ITEMS TABLE (All game items)
// ============================================
export const items = mysqlTable("items", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  itemType: mysqlEnum("itemType", [
    "weapon", "armor", "helmet", "boots", "gloves", "ring", "amulet", 
    "potion", "scroll", "material", "quest_item"
  ]).notNull(),
  
  rarity: mysqlEnum("rarity", [
    "common", "uncommon", "rare", "epic", "legendary"
  ]).default("common").notNull(),
  
  // Stats bonuses (JSON for flexibility)
  statBonuses: json("statBonuses").$type<{
    strength?: number;
    dexterity?: number;
    constitution?: number;
    intelligence?: number;
    wisdom?: number;
    charisma?: number;
    damage?: number;
    armor?: number;
    health?: number;
    mana?: number;
  }>(),
  
  // For weapons
  damageMin: int("damageMin"),
  damageMax: int("damageMax"),
  
  // For armor
  armorValue: int("armorValue"),
  
  // For consumables
  healAmount: int("healAmount"),
  manaAmount: int("manaAmount"),
  
  // Economy
  buyPrice: int("buyPrice").default(10).notNull(),
  sellPrice: int("sellPrice").default(5).notNull(),
  
  // Requirements
  levelRequired: int("levelRequired").default(1).notNull(),
  classRequired: varchar("classRequired", { length: 50 }),
  
  // Icon/Image
  iconUrl: varchar("iconUrl", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Item = typeof items.$inferSelect;
export type InsertItem = typeof items.$inferInsert;

// ============================================
// INVENTORY TABLE (Character's items)
// ============================================
export const inventory = mysqlTable("inventory", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  itemId: int("itemId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  isEquipped: boolean("isEquipped").default(false).notNull(),
  equipSlot: mysqlEnum("equipSlot", [
    "weapon", "armor", "helmet", "boots", "gloves", "ring1", "ring2", "amulet"
  ]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Inventory = typeof inventory.$inferSelect;
export type InsertInventory = typeof inventory.$inferInsert;

// ============================================
// MONSTERS TABLE (Monster templates)
// ============================================
export const monsters = mysqlTable("monsters", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  
  monsterType: mysqlEnum("monsterType", [
    "beast", "undead", "demon", "dragon", "elemental", "humanoid", "construct", "aberration"
  ]).notNull(),
  
  // Difficulty tier
  tier: mysqlEnum("tier", ["common", "elite", "boss", "legendary"]).default("common").notNull(),
  
  // Base level (scales with player)
  baseLevel: int("baseLevel").default(1).notNull(),
  
  // Stats
  health: int("health").default(50).notNull(),
  damage: int("damage").default(10).notNull(),
  armor: int("armor").default(5).notNull(),
  
  // Rewards
  experienceReward: int("experienceReward").default(25).notNull(),
  goldReward: int("goldReward").default(10).notNull(),
  
  // Loot table (JSON array of item IDs with drop chances)
  lootTable: json("lootTable").$type<Array<{ itemId: number; dropChance: number }>>(),
  
  // Spawn conditions
  biomeType: mysqlEnum("biomeType", [
    "urban", "forest", "water", "mountain", "desert", "plains"
  ]),
  
  iconUrl: varchar("iconUrl", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Monster = typeof monsters.$inferSelect;
export type InsertMonster = typeof monsters.$inferInsert;

// ============================================
// NPCS TABLE (NPC templates)
// ============================================
export const npcs = mysqlTable("npcs", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  title: varchar("title", { length: 100 }),
  description: text("description"),
  
  npcType: mysqlEnum("npcType", [
    "merchant", "blacksmith", "alchemist", "quest_giver", "trainer", "innkeeper"
  ]).notNull(),
  
  // Dialogue
  greeting: text("greeting"),
  farewell: text("farewell"),
  
  // For merchants - what they sell (JSON array of item IDs)
  shopInventory: json("shopInventory").$type<Array<{ itemId: number; stock: number }>>(),
  
  // Spawn conditions
  biomeType: mysqlEnum("biomeType", [
    "urban", "forest", "water", "mountain", "desert", "plains"
  ]),
  
  iconUrl: varchar("iconUrl", { length: 500 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Npc = typeof npcs.$inferSelect;
export type InsertNpc = typeof npcs.$inferInsert;

// ============================================
// QUESTS TABLE (Quest templates)
// ============================================
export const quests = mysqlTable("quests", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  
  questType: mysqlEnum("questType", [
    "kill", "collect", "explore", "escort", "deliver", "boss"
  ]).notNull(),
  
  // Objectives (JSON)
  objectives: json("objectives").$type<Array<{
    type: string;
    targetId?: number;
    targetName?: string;
    quantity: number;
    description: string;
  }>>(),
  
  // Requirements
  levelRequired: int("levelRequired").default(1).notNull(),
  
  // Rewards
  experienceReward: int("experienceReward").default(50).notNull(),
  goldReward: int("goldReward").default(25).notNull(),
  itemRewards: json("itemRewards").$type<Array<{ itemId: number; quantity: number }>>(),
  
  // Spawn conditions
  biomeType: mysqlEnum("biomeType", [
    "urban", "forest", "water", "mountain", "desert", "plains"
  ]),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Quest = typeof quests.$inferSelect;
export type InsertQuest = typeof quests.$inferInsert;

// ============================================
// CHARACTER QUESTS TABLE (Active/Completed quests)
// ============================================
export const characterQuests = mysqlTable("character_quests", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  questId: int("questId").notNull(),
  
  status: mysqlEnum("status", ["active", "completed", "failed"]).default("active").notNull(),
  
  // Progress tracking (JSON)
  progress: json("progress").$type<Array<{
    objectiveIndex: number;
    currentAmount: number;
    completed: boolean;
  }>>(),
  
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type CharacterQuest = typeof characterQuests.$inferSelect;
export type InsertCharacterQuest = typeof characterQuests.$inferInsert;

// ============================================
// COMBAT LOG TABLE (Battle history)
// ============================================
export const combatLogs = mysqlTable("combat_logs", {
  id: int("id").autoincrement().primaryKey(),
  characterId: int("characterId").notNull(),
  monsterId: int("monsterId").notNull(),
  
  result: mysqlEnum("result", ["victory", "defeat", "fled"]).notNull(),
  
  // Combat details
  damageDealt: int("damageDealt").default(0).notNull(),
  damageTaken: int("damageTaken").default(0).notNull(),
  turnsCount: int("turnsCount").default(0).notNull(),
  
  // Rewards earned
  experienceEarned: int("experienceEarned").default(0).notNull(),
  goldEarned: int("goldEarned").default(0).notNull(),
  lootEarned: json("lootEarned").$type<Array<{ itemId: number; quantity: number }>>(),
  
  // Location
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CombatLog = typeof combatLogs.$inferSelect;
export type InsertCombatLog = typeof combatLogs.$inferInsert;

// ============================================
// WORLD LOCATIONS TABLE (Discovered POIs)
// ============================================
export const worldLocations = mysqlTable("world_locations", {
  id: int("id").autoincrement().primaryKey(),
  
  locationType: mysqlEnum("locationType", [
    "monster_spawn", "npc_location", "shop", "dungeon", "treasure", "quest_marker"
  ]).notNull(),
  
  // Reference to what's at this location
  referenceId: int("referenceId"),
  referenceType: varchar("referenceType", { length: 50 }),
  
  // Coordinates
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  
  // Generated name based on real location
  name: varchar("name", { length: 200 }),
  
  // Biome determined by location
  biomeType: mysqlEnum("biomeType", [
    "urban", "forest", "water", "mountain", "desert", "plains"
  ]).default("urban").notNull(),
  
  // Active status
  isActive: boolean("isActive").default(true).notNull(),
  
  // Respawn time for monsters
  respawnAt: timestamp("respawnAt"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WorldLocation = typeof worldLocations.$inferSelect;
export type InsertWorldLocation = typeof worldLocations.$inferInsert;
