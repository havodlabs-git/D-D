import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { 
  InsertUser, users, 
  characters, InsertCharacter, Character,
  inventory, InsertInventory,
  items, InsertItem, Item,
  monsters, InsertMonster,
  npcs, InsertNpc,
  quests, InsertQuest,
  characterQuests, InsertCharacterQuest,
  combatLogs, InsertCombatLog,
  worldLocations, InsertWorldLocation,
  visitedPois, InsertVisitedPoi,
  guilds, InsertGuild,
  guildMembership, InsertGuildMembership,
  castles, InsertCastle,
  characterSpells, InsertCharacterSpell,
  spellSlots, InsertSpellSlot,
  globalChat, InsertGlobalChatMessage,
  onlinePlayers, InsertOnlinePlayer,
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { CHARACTER_CLASSES, LEVEL_XP_REQUIREMENTS, STAT_POINTS_PER_LEVEL } from "../shared/gameConstants";
import { calculateMaxHealth, calculateMaxMana, calculateArmorClass } from "../shared/gameUtils";
import type { CharacterClass } from "../shared/gameConstants";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql.Pool | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      // Parse DATABASE_URL to extract connection options
      const dbUrl = new URL(process.env.DATABASE_URL);
      const socketPath = dbUrl.searchParams.get('socket');
      
      const connectionConfig: mysql.PoolOptions = {
        user: dbUrl.username,
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.slice(1), // Remove leading slash
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      };
      
      // Use socket if provided (Cloud SQL), otherwise use host/port
      if (socketPath) {
        connectionConfig.socketPath = socketPath;
        console.log("[Database] Connecting via socket:", socketPath);
      } else {
        connectionConfig.host = dbUrl.hostname;
        connectionConfig.port = parseInt(dbUrl.port) || 3306;
        console.log("[Database] Connecting via TCP:", dbUrl.hostname, dbUrl.port);
      }
      
      _pool = mysql.createPool(connectionConfig);
      _db = drizzle(_pool);
      console.log("[Database] Connected successfully");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// USER FUNCTIONS
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// CHARACTER FUNCTIONS
// ============================================

export async function createCharacter(userId: number, name: string, characterClass: CharacterClass): Promise<Character | null> {
  const db = await getDb();
  if (!db) return null;

  const classData = CHARACTER_CLASSES[characterClass];
  const baseStats = classData.baseStats;
  
  const maxHealth = calculateMaxHealth(characterClass, 1, baseStats.constitution);
  const maxMana = calculateMaxMana(characterClass, 1, baseStats.intelligence);
  const armorClass = calculateArmorClass(baseStats.dexterity);

  const insertData: InsertCharacter = {
    userId,
    name,
    characterClass,
    level: 1,
    experience: 0,
    experienceToNextLevel: LEVEL_XP_REQUIREMENTS[1],
    strength: baseStats.strength,
    dexterity: baseStats.dexterity,
    constitution: baseStats.constitution,
    intelligence: baseStats.intelligence,
    wisdom: baseStats.wisdom,
    charisma: baseStats.charisma,
    maxHealth,
    currentHealth: maxHealth,
    maxMana,
    currentMana: maxMana,
    armorClass,
    gold: 100,
    availableStatPoints: 0,
  };

  await db.insert(characters).values(insertData);
  
  const result = await db.select().from(characters)
    .where(and(eq(characters.userId, userId), eq(characters.name, name)))
    .limit(1);
  
  return result[0] || null;
}

export async function getCharacterByUserId(userId: number): Promise<Character | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(characters)
    .where(eq(characters.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function updateCharacter(characterId: number, updates: Partial<InsertCharacter>): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set(updates)
    .where(eq(characters.id, characterId));
}

export async function deleteCharacter(characterId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(characters).where(eq(characters.id, characterId));
}

export async function killCharacter(characterId: number, deathCause: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set({
      isDead: true,
      deathTimestamp: new Date(),
      deathCause,
      currentHealth: 0,
    })
    .where(eq(characters.id, characterId));
}

export async function useMovement(characterId: number): Promise<{ canMove: boolean; movesRemaining: number }> {
  const db = await getDb();
  if (!db) return { canMove: false, movesRemaining: 0 };

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character) return { canMove: false, movesRemaining: 0 };

  const now = new Date();
  const lastReset = character.lastMoveResetTime ? new Date(character.lastMoveResetTime) : new Date(0);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  let movesUsed = character.movesUsedThisHour;
  
  // Reset if more than 1 hour has passed
  if (hoursSinceReset >= 1) {
    movesUsed = 0;
    await db.update(characters)
      .set({
        movesUsedThisHour: 0,
        lastMoveResetTime: now,
      })
      .where(eq(characters.id, characterId));
  }

  const MAX_MOVES_PER_HOUR = 20;
  const movesRemaining = MAX_MOVES_PER_HOUR - movesUsed;

  if (movesRemaining <= 0) {
    return { canMove: false, movesRemaining: 0 };
  }

  // Use one movement
  await db.update(characters)
    .set({
      movesUsedThisHour: movesUsed + 1,
    })
    .where(eq(characters.id, characterId));

  return { canMove: true, movesRemaining: movesRemaining - 1 };
}

export async function getMovementStatus(characterId: number): Promise<{ movesRemaining: number; resetTime: Date }> {
  const db = await getDb();
  if (!db) return { movesRemaining: 0, resetTime: new Date() };

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character) return { movesRemaining: 0, resetTime: new Date() };

  const now = new Date();
  const lastReset = character.lastMoveResetTime ? new Date(character.lastMoveResetTime) : new Date(0);
  const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

  let movesUsed = character.movesUsedThisHour;
  
  // Reset if more than 1 hour has passed
  if (hoursSinceReset >= 1) {
    movesUsed = 0;
  }

  const MAX_MOVES_PER_HOUR = 20;
  const movesRemaining = MAX_MOVES_PER_HOUR - movesUsed;
  
  // Calculate next reset time
  const resetTime = new Date(lastReset.getTime() + 60 * 60 * 1000);

  return { movesRemaining, resetTime };
}

export async function addExperience(characterId: number, xpAmount: number): Promise<{ leveledUp: boolean; newLevel: number }> {
  const db = await getDb();
  if (!db) return { leveledUp: false, newLevel: 1 };

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character) return { leveledUp: false, newLevel: 1 };

  let newXp = character.experience + xpAmount;
  let newLevel = character.level;
  let leveledUp = false;
  let newStatPoints = character.availableStatPoints;

  // Check for level ups
  while (newLevel < LEVEL_XP_REQUIREMENTS.length && newXp >= LEVEL_XP_REQUIREMENTS[newLevel]) {
    newLevel++;
    leveledUp = true;
    newStatPoints += STAT_POINTS_PER_LEVEL;
  }

  const nextLevelXp = newLevel < LEVEL_XP_REQUIREMENTS.length ? LEVEL_XP_REQUIREMENTS[newLevel] : LEVEL_XP_REQUIREMENTS[LEVEL_XP_REQUIREMENTS.length - 1];

  // Recalculate stats if leveled up
  if (leveledUp) {
    const maxHealth = calculateMaxHealth(character.characterClass as CharacterClass, newLevel, character.constitution);
    const maxMana = calculateMaxMana(character.characterClass as CharacterClass, newLevel, character.intelligence);

    await db.update(characters)
      .set({
        experience: newXp,
        level: newLevel,
        experienceToNextLevel: nextLevelXp,
        availableStatPoints: newStatPoints,
        maxHealth,
        currentHealth: maxHealth, // Full heal on level up
        maxMana,
        currentMana: maxMana, // Full mana on level up
      })
      .where(eq(characters.id, characterId));
  } else {
    await db.update(characters)
      .set({ experience: newXp })
      .where(eq(characters.id, characterId));
  }

  return { leveledUp, newLevel };
}

export async function updateCharacterLocation(characterId: number, latitude: number, longitude: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set({
      lastLatitude: latitude.toFixed(7),
      lastLongitude: longitude.toFixed(7),
    })
    .where(eq(characters.id, characterId));
}

export async function healCharacter(characterId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set({
      currentHealth: sql`LEAST(${characters.maxHealth}, ${characters.currentHealth} + ${amount})`,
    })
    .where(eq(characters.id, characterId));
}

export async function restoreMana(characterId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set({
      currentMana: sql`LEAST(${characters.maxMana}, ${characters.currentMana} + ${amount})`,
    })
    .where(eq(characters.id, characterId));
}

export async function damageCharacter(characterId: number, amount: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character) return 0;

  const newHealth = Math.max(0, character.currentHealth - amount);
  
  await db.update(characters)
    .set({ currentHealth: newHealth })
    .where(eq(characters.id, characterId));

  return newHealth;
}

export async function addGold(characterId: number, amount: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(characters)
    .set({
      gold: sql`${characters.gold} + ${amount}`,
    })
    .where(eq(characters.id, characterId));
}

export async function spendGold(characterId: number, amount: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character || character.gold < amount) return false;

  await db.update(characters)
    .set({ gold: character.gold - amount })
    .where(eq(characters.id, characterId));

  return true;
}

export async function allocateStatPoint(characterId: number, attribute: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [character] = await db.select().from(characters).where(eq(characters.id, characterId)).limit(1);
  if (!character || character.availableStatPoints <= 0) return false;

  const validAttributes = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
  if (!validAttributes.includes(attribute)) return false;

  const updateData: Record<string, any> = {
    availableStatPoints: character.availableStatPoints - 1,
    [attribute]: (character as any)[attribute] + 1,
  };

  // Recalculate derived stats if constitution or dexterity changed
  if (attribute === 'constitution') {
    updateData.maxHealth = calculateMaxHealth(
      character.characterClass as CharacterClass, 
      character.level, 
      character.constitution + 1
    );
  }
  if (attribute === 'intelligence') {
    updateData.maxMana = calculateMaxMana(
      character.characterClass as CharacterClass,
      character.level,
      character.intelligence + 1
    );
  }
  if (attribute === 'dexterity') {
    updateData.armorClass = calculateArmorClass(character.dexterity + 1);
  }

  await db.update(characters)
    .set(updateData)
    .where(eq(characters.id, characterId));

  return true;
}

// ============================================
// INVENTORY FUNCTIONS
// ============================================

export async function getCharacterInventory(characterId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    inventory: inventory,
    item: items,
  })
    .from(inventory)
    .innerJoin(items, eq(inventory.itemId, items.id))
    .where(eq(inventory.characterId, characterId));

  return result;
}

export async function addItemToInventory(characterId: number, itemId: number, quantity: number = 1): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if item already exists in inventory
  const existing = await db.select().from(inventory)
    .where(and(eq(inventory.characterId, characterId), eq(inventory.itemId, itemId)))
    .limit(1);

  if (existing.length > 0) {
    await db.update(inventory)
      .set({ quantity: existing[0].quantity + quantity })
      .where(eq(inventory.id, existing[0].id));
  } else {
    await db.insert(inventory).values({
      characterId,
      itemId,
      quantity,
      isEquipped: false,
    });
  }
}

export async function removeItemFromInventory(characterId: number, itemId: number, quantity: number = 1): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [existing] = await db.select().from(inventory)
    .where(and(eq(inventory.characterId, characterId), eq(inventory.itemId, itemId)))
    .limit(1);

  if (!existing || existing.quantity < quantity) return false;

  if (existing.quantity === quantity) {
    await db.delete(inventory).where(eq(inventory.id, existing.id));
  } else {
    await db.update(inventory)
      .set({ quantity: existing.quantity - quantity })
      .where(eq(inventory.id, existing.id));
  }

  return true;
}

export async function equipItem(characterId: number, inventoryId: number, slot: string): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Unequip any item in the same slot
  await db.update(inventory)
    .set({ isEquipped: false, equipSlot: null })
    .where(and(eq(inventory.characterId, characterId), eq(inventory.equipSlot, slot as any)));

  // Equip the new item
  await db.update(inventory)
    .set({ isEquipped: true, equipSlot: slot as any })
    .where(eq(inventory.id, inventoryId));

  return true;
}

export async function unequipItem(inventoryId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(inventory)
    .set({ isEquipped: false, equipSlot: null })
    .where(eq(inventory.id, inventoryId));
}

export async function getEquippedItems(characterId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    inventory: inventory,
    item: items,
  })
    .from(inventory)
    .innerJoin(items, eq(inventory.itemId, items.id))
    .where(and(eq(inventory.characterId, characterId), eq(inventory.isEquipped, true)));

  return result;
}

// ============================================
// ITEM FUNCTIONS
// ============================================

export async function getItemById(itemId: number): Promise<Item | null> {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  return result || null;
}

export async function getAllItems() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(items);
}

export async function createItem(item: InsertItem): Promise<Item | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(items).values(item);
  const insertId = result[0].insertId;
  
  // Return the created item
  const [newItem] = await db.select().from(items).where(eq(items.id, insertId)).limit(1);
  return newItem || null;
}

// ============================================
// MONSTER FUNCTIONS
// ============================================

export async function getMonsterById(monsterId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select().from(monsters).where(eq(monsters.id, monsterId)).limit(1);
  return result || null;
}

export async function getMonstersByBiome(biomeType: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(monsters).where(eq(monsters.biomeType, biomeType as any));
}

export async function getAllMonsters() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(monsters);
}

export async function createMonster(monster: InsertMonster): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(monsters).values(monster);
}

// ============================================
// NPC FUNCTIONS
// ============================================

export async function getNpcById(npcId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select().from(npcs).where(eq(npcs.id, npcId)).limit(1);
  return result || null;
}

export async function getNpcsByBiome(biomeType: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(npcs).where(eq(npcs.biomeType, biomeType as any));
}

export async function getAllNpcs() {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(npcs);
}

export async function createNpc(npc: InsertNpc): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(npcs).values(npc);
}

// ============================================
// QUEST FUNCTIONS
// ============================================

export async function getQuestById(questId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select().from(quests).where(eq(quests.id, questId)).limit(1);
  return result || null;
}

export async function getQuestsByBiome(biomeType: string) {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(quests).where(eq(quests.biomeType, biomeType as any));
}

export async function getCharacterQuests(characterId: number) {
  const db = await getDb();
  if (!db) return [];

  const result = await db.select({
    characterQuest: characterQuests,
    quest: quests,
  })
    .from(characterQuests)
    .innerJoin(quests, eq(characterQuests.questId, quests.id))
    .where(eq(characterQuests.characterId, characterId));

  return result;
}

export async function startQuest(characterId: number, questId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const quest = await getQuestById(questId);
  if (!quest) return;

  const initialProgress = (quest.objectives || []).map((_, index) => ({
    objectiveIndex: index,
    currentAmount: 0,
    completed: false,
  }));

  await db.insert(characterQuests).values({
    characterId,
    questId,
    status: "active",
    progress: initialProgress,
  });
}

export async function updateQuestProgress(characterQuestId: number, objectiveIndex: number, amount: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const [cq] = await db.select().from(characterQuests).where(eq(characterQuests.id, characterQuestId)).limit(1);
  if (!cq || cq.status !== "active") return false;

  const quest = await getQuestById(cq.questId);
  if (!quest) return false;

  const progress = cq.progress || [];
  const objective = progress[objectiveIndex];
  if (!objective) return false;

  const questObjective = (quest.objectives || [])[objectiveIndex];
  if (!questObjective) return false;

  objective.currentAmount = Math.min(objective.currentAmount + amount, questObjective.quantity);
  objective.completed = objective.currentAmount >= questObjective.quantity;

  // Check if all objectives are complete
  const allComplete = progress.every(p => p.completed);

  await db.update(characterQuests)
    .set({
      progress,
      status: allComplete ? "completed" : "active",
      completedAt: allComplete ? new Date() : null,
    })
    .where(eq(characterQuests.id, characterQuestId));

  return allComplete;
}

// ============================================
// COMBAT LOG FUNCTIONS
// ============================================

export async function createCombatLog(log: InsertCombatLog): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(combatLogs).values(log);
}

export async function getCharacterCombatLogs(characterId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(combatLogs)
    .where(eq(combatLogs.characterId, characterId))
    .orderBy(desc(combatLogs.createdAt))
    .limit(limit);
}

// ============================================
// WORLD LOCATION FUNCTIONS
// ============================================

export async function createWorldLocation(location: InsertWorldLocation): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(worldLocations).values(location);
}

export async function getWorldLocationsInArea(latitude: number, longitude: number, radiusKm: number = 1) {
  const db = await getDb();
  if (!db) return [];

  // Simple bounding box query (not perfect circle but good enough)
  const latDelta = radiusKm / 111; // 1 degree ≈ 111 km
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  return await db.select()
    .from(worldLocations)
    .where(
      and(
        sql`${worldLocations.latitude} BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
        sql`${worldLocations.longitude} BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`,
        eq(worldLocations.isActive, true)
      )
    );
}

export async function deactivateWorldLocation(locationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.update(worldLocations)
    .set({ isActive: false })
    .where(eq(worldLocations.id, locationId));
}


// ============================================
// VISITED POIs FUNCTIONS
// ============================================

export async function markPoiVisited(data: {
  characterId: number;
  poiHash: string;
  poiType: string;
  latitude: number;
  longitude: number;
  interactionType: "defeated" | "collected" | "visited" | "completed" | "purchased";
  canRespawn: boolean;
  respawnAt: Date | null;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if already exists
  const [existing] = await db.select()
    .from(visitedPois)
    .where(and(
      eq(visitedPois.characterId, data.characterId),
      eq(visitedPois.poiHash, data.poiHash)
    ))
    .limit(1);

  if (existing) {
    // Update existing
    await db.update(visitedPois)
      .set({
        interactionType: data.interactionType,
        respawnAt: data.respawnAt,
        canRespawn: data.canRespawn,
      })
      .where(eq(visitedPois.id, existing.id));
  } else {
    // Insert new
    await db.insert(visitedPois).values({
      characterId: data.characterId,
      poiHash: data.poiHash,
      poiType: data.poiType,
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      interactionType: data.interactionType,
      canRespawn: data.canRespawn,
      respawnAt: data.respawnAt,
    });
  }
}

export async function getVisitedPois(characterId: number, latitude: number, longitude: number, radiusMeters: number) {
  const db = await getDb();
  if (!db) return [];

  const radiusKm = radiusMeters / 1000;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  return await db.select()
    .from(visitedPois)
    .where(
      and(
        eq(visitedPois.characterId, characterId),
        sql`${visitedPois.latitude} BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
        sql`${visitedPois.longitude} BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`
      )
    );
}

export async function checkPoiVisited(characterId: number, poiHash: string): Promise<{ visited: boolean; canInteract: boolean }> {
  const db = await getDb();
  if (!db) return { visited: false, canInteract: true };

  const [result] = await db.select()
    .from(visitedPois)
    .where(and(
      eq(visitedPois.characterId, characterId),
      eq(visitedPois.poiHash, poiHash)
    ))
    .limit(1);

  if (!result) {
    return { visited: false, canInteract: true };
  }

  // Check if respawned
  if (result.canRespawn && result.respawnAt) {
    const now = new Date();
    if (now >= result.respawnAt) {
      // Has respawned, can interact again
      return { visited: true, canInteract: true };
    }
  }

  // Not respawned yet or can't respawn
  return { visited: true, canInteract: result.canRespawn && !result.respawnAt };
}

// ============================================
// SPELL FUNCTIONS
// ============================================

export async function getCharacterSpells(characterId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(characterSpells)
    .where(eq(characterSpells.characterId, characterId));
}

export async function learnSpell(characterId: number, spellId: string): Promise<void> {
  const db = await getDb();
  if (!db) return;

  // Check if already known
  const [existing] = await db.select()
    .from(characterSpells)
    .where(and(
      eq(characterSpells.characterId, characterId),
      eq(characterSpells.spellId, spellId)
    ))
    .limit(1);

  if (!existing) {
    await db.insert(characterSpells).values({
      characterId,
      spellId,
      isPrepared: true,
    });
  }
}

export async function getSpellSlots(characterId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(spellSlots)
    .where(eq(spellSlots.characterId, characterId))
    .limit(1);

  return result || null;
}

export async function consumeSpellSlot(characterId: number, level: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const slots = await getSpellSlots(characterId);
  if (!slots) return false;

  const currentKey = `level${level}Current` as keyof typeof slots;
  const currentValue = slots[currentKey] as number;

  if (currentValue <= 0) return false;

  const updateData: Record<string, number> = {};
  updateData[currentKey] = currentValue - 1;

  await db.update(spellSlots)
    .set(updateData)
    .where(eq(spellSlots.characterId, characterId));

  return true;
}

export async function restoreAllSpellSlots(characterId: number, level: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const { SPELL_SLOTS_BY_LEVEL } = await import("../shared/gameConstants");
  const slotsForLevel = SPELL_SLOTS_BY_LEVEL[level as keyof typeof SPELL_SLOTS_BY_LEVEL];
  
  if (!slotsForLevel) return;

  // Check if spell slots record exists
  const existing = await getSpellSlots(characterId);
  
  const slotData = {
    level1Current: slotsForLevel[1] || 0,
    level1Max: slotsForLevel[1] || 0,
    level2Current: slotsForLevel[2] || 0,
    level2Max: slotsForLevel[2] || 0,
    level3Current: slotsForLevel[3] || 0,
    level3Max: slotsForLevel[3] || 0,
    level4Current: slotsForLevel[4] || 0,
    level4Max: slotsForLevel[4] || 0,
    level5Current: slotsForLevel[5] || 0,
    level5Max: slotsForLevel[5] || 0,
    level6Current: slotsForLevel[6] || 0,
    level6Max: slotsForLevel[6] || 0,
    level7Current: slotsForLevel[7] || 0,
    level7Max: slotsForLevel[7] || 0,
    level8Current: slotsForLevel[8] || 0,
    level8Max: slotsForLevel[8] || 0,
    level9Current: slotsForLevel[9] || 0,
    level9Max: slotsForLevel[9] || 0,
    lastRestAt: new Date(),
  };

  if (existing) {
    await db.update(spellSlots)
      .set(slotData)
      .where(eq(spellSlots.characterId, characterId));
  } else {
    await db.insert(spellSlots).values({
      characterId,
      ...slotData,
    });
  }
}

// ============================================
// GUILD FUNCTIONS
// ============================================

export async function getGuildsNearby(latitude: number, longitude: number, radiusMeters: number) {
  const db = await getDb();
  if (!db) return [];

  const radiusKm = radiusMeters / 1000;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  return await db.select()
    .from(guilds)
    .where(
      and(
        sql`${guilds.latitude} BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
        sql`${guilds.longitude} BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`
      )
    );
}

export async function getGuildById(guildId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(guilds)
    .where(eq(guilds.id, guildId))
    .limit(1);

  return result || null;
}

export async function getGuildMembership(characterId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select({
    membership: guildMembership,
    guild: guilds,
  })
    .from(guildMembership)
    .innerJoin(guilds, eq(guildMembership.guildId, guilds.id))
    .where(eq(guildMembership.characterId, characterId));

  return result.length > 0 ? result : null;
}

export async function joinGuild(characterId: number, guildId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(guildMembership).values({
    characterId,
    guildId,
    rank: "initiate",
    reputation: 0,
  });
}

// ============================================
// CASTLE FUNCTIONS
// ============================================

export async function getCastlesNearby(latitude: number, longitude: number, radiusMeters: number) {
  const db = await getDb();
  if (!db) return [];

  const radiusKm = radiusMeters / 1000;
  const latDelta = radiusKm / 111;
  const lonDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

  return await db.select()
    .from(castles)
    .where(
      and(
        sql`${castles.latitude} BETWEEN ${latitude - latDelta} AND ${latitude + latDelta}`,
        sql`${castles.longitude} BETWEEN ${longitude - lonDelta} AND ${longitude + lonDelta}`
      )
    );
}

export async function getCastleById(castleId: number) {
  const db = await getDb();
  if (!db) return null;

  const [result] = await db.select()
    .from(castles)
    .where(eq(castles.id, castleId))
    .limit(1);

  return result || null;
}

export async function createGuild(guild: InsertGuild): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(guilds).values(guild);
}

export async function createCastle(castle: InsertCastle): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(castles).values(castle);
}


// ============================================
// GLOBAL CHAT FUNCTIONS
// ============================================

export async function sendChatMessage(data: {
  userId: number;
  characterId?: number;
  message: string;
  messageType?: "normal" | "system" | "announcement" | "whisper" | "guild" | "trade";
  characterName?: string;
  characterClass?: string;
  characterLevel?: number;
  targetUserId?: number;
}): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(globalChat).values({
    userId: data.userId,
    characterId: data.characterId,
    message: data.message,
    messageType: data.messageType || "normal",
    characterName: data.characterName,
    characterClass: data.characterClass,
    characterLevel: data.characterLevel,
    targetUserId: data.targetUserId,
  });
}

export async function getChatMessages(limit: number = 50, beforeId?: number): Promise<typeof globalChat.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  if (beforeId) {
    return await db.select()
      .from(globalChat)
      .where(and(
        eq(globalChat.messageType, "normal"),
        sql`${globalChat.id} < ${beforeId}`
      ))
      .orderBy(desc(globalChat.createdAt))
      .limit(limit);
  }

  return await db.select()
    .from(globalChat)
    .where(eq(globalChat.messageType, "normal"))
    .orderBy(desc(globalChat.createdAt))
    .limit(limit);
}

export async function getRecentChatMessages(sinceId: number): Promise<typeof globalChat.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select()
    .from(globalChat)
    .where(and(
      eq(globalChat.messageType, "normal"),
      sql`${globalChat.id} > ${sinceId}`
    ))
    .orderBy(desc(globalChat.createdAt))
    .limit(100);
}


// ============================================
// ONLINE PLAYERS FUNCTIONS
// ============================================

export async function updatePlayerOnline(data: {
  userId: number;
  characterId: number;
  characterName: string;
  characterClass: string;
  characterLevel: number;
  latitude?: number;
  longitude?: number;
  status?: "exploring" | "combat" | "dungeon" | "shop" | "idle";
}): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  // Upsert - update if exists, insert if not
  await db.insert(onlinePlayers).values({
    userId: data.userId,
    characterId: data.characterId,
    characterName: data.characterName,
    characterClass: data.characterClass,
    characterLevel: data.characterLevel,
    latitude: data.latitude?.toString(),
    longitude: data.longitude?.toString(),
    status: data.status || "exploring",
    lastHeartbeat: new Date(),
  }).onDuplicateKeyUpdate({
    set: {
      characterName: data.characterName,
      characterClass: data.characterClass,
      characterLevel: data.characterLevel,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
      status: data.status || "exploring",
      lastHeartbeat: new Date(),
    },
  });
}

export async function removePlayerOnline(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(onlinePlayers).where(eq(onlinePlayers.userId, userId));
}

export async function getOnlinePlayers(nearLat?: number, nearLng?: number, radius?: number): Promise<typeof onlinePlayers.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Remove players that haven't sent heartbeat in 5 minutes
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await db.delete(onlinePlayers).where(sql`${onlinePlayers.lastHeartbeat} < ${fiveMinutesAgo}`);
  
  // Get all online players
  const players = await db.select()
    .from(onlinePlayers)
    .orderBy(desc(onlinePlayers.lastHeartbeat))
    .limit(100);
  
  return players;
}

export async function getOnlinePlayerCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  // Remove stale players first
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  await db.delete(onlinePlayers).where(sql`${onlinePlayers.lastHeartbeat} < ${fiveMinutesAgo}`);
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(onlinePlayers);
  
  return result[0]?.count || 0;
}
