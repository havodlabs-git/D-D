import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
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
  worldLocations, InsertWorldLocation
} from "../drizzle/schema";
import { ENV } from './_core/env';
import { CHARACTER_CLASSES, LEVEL_XP_REQUIREMENTS, STAT_POINTS_PER_LEVEL } from "../shared/gameConstants";
import { calculateMaxHealth, calculateMaxMana, calculateArmorClass } from "../shared/gameUtils";
import type { CharacterClass } from "../shared/gameConstants";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
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

export async function createItem(item: InsertItem): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(items).values(item);
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
