import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { 
  CHARACTER_CLASSES, 
  ATTRIBUTES, 
  RARITIES, 
  BIOMES,
  MONSTER_TIERS,
  NPC_TYPES,
  ITEM_TYPES,
  SPELLS,
  SPELL_SLOTS_BY_LEVEL,
} from "../shared/gameConstants";
import {
  rollDice,
  rollDie,
  performAttackRoll,
  calculateDamage,
  calculateHitChance,
  calculateFleeChance,
  scaleMonsterStats,
  scaleRewards,
  getAttributeModifier,
  getLocationSeed,
  seededRandom,
  pickRandom,
  getRandomPointInRadius,
  calculateDistance,
  calculateMaxHealth,
  calculateMaxMana,
  calculateArmorClass,
} from "../shared/gameUtils";
import type { CharacterClass, BiomeType, MonsterTier } from "../shared/gameConstants";

// Generate random encounter data based on type and player level
function generateEncounterData(type: string, playerLevel: number) {
  const monsterNames = ["Goblin", "Orc", "Esqueleto", "Lobo", "Slime", "Bandido", "Aranha Gigante", "Kobold"];
  const treasureItems = ["Poção de Cura", "Moedas de Ouro", "Gema Preciosa", "Pergaminho Mágico", "Anel Encantado"];
  const events = [
    "Um viajante misterioso oferece uma troca...",
    "Você encontra um altar antigo...",
    "Uma fada aparece e oferece um desejo...",
    "Você encontra rastros de uma criatura rara...",
    "Um espectro aparece com uma mensagem...",
  ];
  const traps = [
    { name: "Armadilha de Espinhos", damage: 5 + playerLevel * 2 },
    { name: "Armadilha de Fogo", damage: 8 + playerLevel * 2 },
    { name: "Armadilha de Veneno", damage: 4 + playerLevel, effect: "poison" },
    { name: "Armadilha de Queda", damage: 10 + playerLevel * 3 },
  ];

  switch (type) {
    case "battle":
      const monsterLevel = Math.max(1, playerLevel + Math.floor(Math.random() * 3) - 1);
      const tierRoll = Math.random();
      let tier = "common";
      if (tierRoll > 0.95) tier = "legendary";
      else if (tierRoll > 0.85) tier = "rare";
      else if (tierRoll > 0.6) tier = "uncommon";
      
      const monsterName = monsterNames[Math.floor(Math.random() * monsterNames.length)];
      return {
        monster: {
          id: Date.now(),
          name: monsterName,
          monsterType: monsterName.toLowerCase().replace(/ /g, "_"),
          level: monsterLevel,
          tier,
          health: 20 + monsterLevel * 10 * (tier === "legendary" ? 2 : tier === "rare" ? 1.5 : tier === "uncommon" ? 1.2 : 1),
          damage: 3 + monsterLevel * 2 * (tier === "legendary" ? 1.8 : tier === "rare" ? 1.4 : tier === "uncommon" ? 1.1 : 1),
          armor: 8 + monsterLevel,
        },
      };
    
    case "treasure":
      return {
        gold: Math.floor(Math.random() * 50 * playerLevel) + 10,
        item: Math.random() > 0.7 ? treasureItems[Math.floor(Math.random() * treasureItems.length)] : null,
        xp: Math.floor(Math.random() * 20 * playerLevel) + 5,
      };
    
    case "trap":
      return traps[Math.floor(Math.random() * traps.length)];
    
    case "merchant":
      return {
        name: "Mercador Viajante",
        discount: Math.floor(Math.random() * 20) + 5,
        specialItem: Math.random() > 0.5,
      };
    
    case "event":
      return {
        description: events[Math.floor(Math.random() * events.length)],
        choices: ["Aceitar", "Recusar", "Investigar"],
      };
    
    default:
      return {};
  }
}

// Helper: get character from DB or demo mode (fallback)
async function getCharacterOrDemo(userId: number): Promise<any | null> {
  // Check demo storage first (fastest)
  const demoKey = `demo_char_${userId}`;
  const demoStored = (global as any)[demoKey];
  if (demoStored) return demoStored;
  // Try DB
  try {
    const character = await db.getCharacterByUserId(userId);
    if (character) return character;
  } catch (e) {
    // DB not available, continue to demo fallback
  }
  return null;
}

// D&D 5e XP Table (global constant)
const XP_TABLE_GLOBAL = [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000];

// Helper: check if character is from demo mode
function isDemoCharacter(userId: number): boolean {
  const demoKey = `demo_char_${userId}`;
  return !!(global as any)[demoKey];
}

// ============================================
// DEMO MODE IN-MEMORY STORAGE
// ============================================

// Demo inventory: Map<userId, Array<{id, itemId, item, quantity, isEquipped, equipSlot}>>
function getDemoInventory(userId: number): any[] {
  const key = `demo_inv_${userId}`;
  if (!(global as any)[key]) {
    // Start with 2 health potions
    (global as any)[key] = [
      { id: 9001, itemId: 9001, quantity: 2, isEquipped: false, equipSlot: null, item: {
        id: 9001, name: "Poção de Cura Menor", description: "Restaura 25 pontos de vida",
        itemType: "potion", rarity: "common", buyPrice: 15, sellPrice: 7,
        levelRequired: 1, damageMin: null, damageMax: null, armorValue: null,
        healAmount: 25, manaAmount: null, statBonuses: null, createdAt: new Date()
      }}
    ];
  }
  return (global as any)[key];
}

function addDemoItem(userId: number, item: any, quantity: number = 1): void {
  const inv = getDemoInventory(userId);
  const existing = inv.find((i: any) => i.item.name === item.name);
  if (existing) {
    existing.quantity += quantity;
  } else {
    const newId = 9000 + inv.length + 1;
    inv.push({
      id: newId, itemId: item.id || newId, quantity, isEquipped: false, equipSlot: null,
      item: { ...item, id: item.id || newId }
    });
  }
}

function removeDemoItem(userId: number, inventoryId: number, quantity: number = 1): boolean {
  const inv = getDemoInventory(userId);
  const idx = inv.findIndex((i: any) => i.id === inventoryId);
  if (idx === -1 || inv[idx].quantity < quantity) return false;
  inv[idx].quantity -= quantity;
  if (inv[idx].quantity <= 0) inv.splice(idx, 1);
  return true;
}

// Demo gold operations
function addDemoGold(userId: number, amount: number): void {
  const char = getCharacterOrDemo(userId);
  // char is a promise, we need sync access - use global directly
  const demoKey = `demo_char_${userId}`;
  const demoChar = (global as any)[demoKey];
  if (demoChar) demoChar.gold = (demoChar.gold || 0) + amount;
}

function spendDemoGold(userId: number, amount: number): boolean {
  const demoKey = `demo_char_${userId}`;
  const demoChar = (global as any)[demoKey];
  if (!demoChar || demoChar.gold < amount) return false;
  demoChar.gold -= amount;
  return true;
}

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================
  // CHARACTER ROUTER
  // ============================================
  character: router({
    // Get current character
    get: protectedProcedure.query(async ({ ctx }) => {
      console.log("[Character.get] userId:", ctx.user.id, "openId:", ctx.user.openId);
      // Check demo storage first
      const demoKey = `demo_char_${ctx.user.id}`;
      const demoStored = (global as any)[demoKey];
      if (demoStored) {
        console.log("[Character.get] Found demo character for", demoKey);
        return demoStored;
      }
      // Try DB
      const character = await getCharacterOrDemo(ctx.user.id);
      if (character?.isDead) {
        return { ...character, isDead: true };
      }
      if (character) return character;
      
      // Auto-create a default character when none exists (demo mode)
      console.log("[Character.get] No character found, auto-creating default for userId:", ctx.user.id);
      const defaultChar = {
        id: ctx.user.id,
        userId: ctx.user.id,
        name: ctx.user.name || "Aventureiro",
        characterClass: "fighter" as const,
        level: 1,
        experience: 0,
        experienceToNextLevel: 300, // D&D 5e: 300 XP para nível 2
        strength: 16,
        dexterity: 13,
        constitution: 14,
        intelligence: 10,
        wisdom: 12,
        charisma: 8,
        maxHealth: calculateMaxHealth("fighter", 1, 14), // Fighter, level 1, CON 14
        currentHealth: calculateMaxHealth("fighter", 1, 14),
        maxMana: calculateMaxMana("fighter", 1, 10), // Fighter, level 1, INT 10
        currentMana: calculateMaxMana("fighter", 1, 10),
        armorClass: calculateArmorClass(13), // DEX 13
        gold: 100,
        lastLatitude: null,
        lastLongitude: null,
        availableStatPoints: 0,
        subclass: null,
        knownSpells: null,
        preparedSpells: null,
        usedSpellSlots: null,
        isDead: false,
        deathTimestamp: null,
        deathCause: null,
        movesUsedThisHour: 0,
        lastMoveResetTime: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (global as any)[demoKey] = defaultChar;
      console.log("[Character.get] Auto-created default character for", demoKey);
      return defaultChar;
    }),
    
    // Delete dead character to create new one
    deleteDeadCharacter: protectedProcedure.mutation(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
      }
      if (!character.isDead) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Personagem ainda está vivo" });
      }
      await db.deleteCharacter(character.id);
      return { success: true };
    }),
    
    // Kill character (permadeath)
    kill: protectedProcedure
      .input(z.object({
        deathCause: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }
        if (character.isDead) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Personagem já está morto" });
        }
        await db.killCharacter(character.id, input.deathCause);
        return { success: true };
      }),

    // Create new character
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(50),
        characterClass: z.enum(["fighter", "wizard", "rogue", "cleric", "ranger", "paladin", "barbarian", "bard", "druid", "monk", "sorcerer", "warlock"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if demo character already exists
        const demoKey = `demo_char_${ctx.user.id}`;
        if ((global as any)[demoKey]) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você já possui um personagem" });
        }
        
        // Try DB first
        const existing = await getCharacterOrDemo(ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você já possui um personagem" });
        }
        const character = await db.createCharacter(ctx.user.id, input.name, input.characterClass);
        if (character) return character;
        
        // DB not available - create demo character
        console.log("[Character] Creating demo character for userId:", ctx.user.id);
          const classStats: Record<string, { hp: number; mana: number; str: number; dex: number; con: number; int: number; wis: number; cha: number }> = {
            fighter: { hp: 24, mana: 10, str: 16, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
            wizard: { hp: 14, mana: 30, str: 8, dex: 13, con: 12, int: 16, wis: 14, cha: 10 },
            rogue: { hp: 18, mana: 15, str: 10, dex: 16, con: 12, int: 13, wis: 10, cha: 14 },
            cleric: { hp: 20, mana: 25, str: 14, dex: 10, con: 13, int: 10, wis: 16, cha: 12 },
            ranger: { hp: 22, mana: 15, str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 },
            paladin: { hp: 24, mana: 15, str: 16, dex: 10, con: 14, int: 8, wis: 12, cha: 14 },
            barbarian: { hp: 28, mana: 5, str: 16, dex: 14, con: 16, int: 8, wis: 10, cha: 10 },
            bard: { hp: 18, mana: 20, str: 10, dex: 14, con: 12, int: 12, wis: 10, cha: 16 },
            druid: { hp: 18, mana: 25, str: 10, dex: 12, con: 14, int: 12, wis: 16, cha: 10 },
            monk: { hp: 20, mana: 15, str: 12, dex: 16, con: 14, int: 10, wis: 14, cha: 8 },
            sorcerer: { hp: 14, mana: 30, str: 8, dex: 14, con: 12, int: 10, wis: 12, cha: 16 },
            warlock: { hp: 18, mana: 20, str: 10, dex: 12, con: 14, int: 12, wis: 10, cha: 16 },
          };
          const stats = classStats[input.characterClass] || classStats.fighter;
          const demoChar = {
            id: ctx.user.id,
            userId: ctx.user.id,
            name: input.name,
            characterClass: input.characterClass,
            level: 1,
            experience: 0,
            experienceToNextLevel: 300, // D&D 5e: 300 XP para nível 2
            strength: stats.str,
            dexterity: stats.dex,
            constitution: stats.con,
            intelligence: stats.int,
            wisdom: stats.wis,
            charisma: stats.cha,
            maxHealth: stats.hp,
            currentHealth: stats.hp,
            maxMana: stats.mana,
            currentMana: stats.mana,
            armorClass: 10 + Math.floor((stats.dex - 10) / 2),
            gold: 100,
            lastLatitude: null,
            lastLongitude: null,
            availableStatPoints: 0,
            subclass: null,
            knownSpells: null,
            preparedSpells: null,
            usedSpellSlots: null,
            isDead: false,
            deathTimestamp: null,
            deathCause: null,
            movesUsedThisHour: 0,
            lastMoveResetTime: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        (global as any)[demoKey] = demoChar;
        console.log("[Character] Demo character created and stored as", demoKey);
        return demoChar;
      }),

    // Update character location
    updateLocation: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        await db.updateCharacterLocation(character.id, input.latitude, input.longitude);
        return { success: true };
      }),

    // Allocate stat point
    allocateStat: protectedProcedure
      .input(z.object({
        attribute: z.enum(["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const success = await db.allocateStatPoint(character.id, input.attribute);
        if (!success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível alocar o ponto" });
        }

        return await getCharacterOrDemo(ctx.user.id);
      }),

    // Apply level up choices (attributes, spells, subclass)
    applyLevelUpChoices: protectedProcedure
      .input(z.object({
        attributeIncreases: z.record(z.string(), z.number()).optional(),
        newSpells: z.array(z.string()).optional(),
        subclass: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Try DB first
        const character = await getCharacterOrDemo(ctx.user.id);
        if (character) {
          // Apply attribute increases via DB
          if (input.attributeIncreases) {
            for (const [attr, count] of Object.entries(input.attributeIncreases)) {
              for (let i = 0; i < count; i++) {
                await db.allocateStatPoint(character.id, attr as any);
              }
            }
          }
          // TODO: Apply spells and subclass via DB when schema supports it
          return await getCharacterOrDemo(ctx.user.id);
        }

        // Demo mode
        const demoKey = `demo_char_${ctx.user.id}`;
        const demoChar = (global as any)[demoKey];
        if (demoChar) {
          // Apply attribute increases
          if (input.attributeIncreases) {
            let totalPoints = 0;
            for (const [attr, count] of Object.entries(input.attributeIncreases)) {
              if (count > 0 && (demoChar as any)[attr] !== undefined) {
                (demoChar as any)[attr] += count;
                totalPoints += count;
              }
            }
            demoChar.availableStatPoints = Math.max(0, (demoChar.availableStatPoints || 0) - totalPoints);
            
            // Recalculate derived stats after attribute changes
            demoChar.maxHealth = calculateMaxHealth(
              demoChar.characterClass as CharacterClass,
              demoChar.level,
              demoChar.constitution
            );
            demoChar.currentHealth = demoChar.maxHealth;
            demoChar.maxMana = calculateMaxMana(
              demoChar.characterClass as CharacterClass,
              demoChar.level,
              demoChar.intelligence
            );
            demoChar.currentMana = demoChar.maxMana;
            demoChar.armorClass = calculateArmorClass(demoChar.dexterity);
          }
          
          // Apply new spells
          if (input.newSpells && input.newSpells.length > 0) {
            const currentSpells = demoChar.knownSpells ? JSON.parse(demoChar.knownSpells) : [];
            demoChar.knownSpells = JSON.stringify([...currentSpells, ...input.newSpells]);
          }
          
          // Apply subclass
          if (input.subclass) {
            demoChar.subclass = input.subclass;
          }
          
          console.log(`[ApplyLevelUp] Demo: attrs=${JSON.stringify(input.attributeIncreases)}, spells=${input.newSpells}, subclass=${input.subclass}`);
          return demoChar;
        }

        throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
      }),

    // Rest (heal and restore mana)
    rest: protectedProcedure.mutation(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
      }

      // Restore 25% of max health and mana
      const healthRestore = Math.floor(character.maxHealth * 0.25);
      const manaRestore = Math.floor(character.maxMana * 0.25);

      await db.healCharacter(character.id, healthRestore);
      await db.restoreMana(character.id, manaRestore);
      // Demo mode fallback
      if (isDemoCharacter(ctx.user.id)) {
        character.currentHealth = Math.min(character.maxHealth, character.currentHealth + healthRestore);
        character.currentMana = Math.min(character.maxMana, character.currentMana + manaRestore);
      }

      return {
        healthRestored: healthRestore,
        manaRestored: manaRestore,
      };
    }),

    // Get class info
    getClasses: publicProcedure.query(() => {
      return Object.entries(CHARACTER_CLASSES).map(([key, value]) => ({
        id: key,
        ...value,
      }));
    }),
    
    // Move character (no movement limits)
    move: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        // Update location
        if (isDemoCharacter(ctx.user.id)) {
          character.lastLatitude = input.latitude.toString();
          character.lastLongitude = input.longitude.toString();
        } else {
          try {
            await db.updateCharacterLocation(character.id, input.latitude, input.longitude);
          } catch (e) {
            // Fallback to in-memory
            character.lastLatitude = input.latitude.toString();
            character.lastLongitude = input.longitude.toString();
          }
        }

        // Check for random encounter (15% chance per move)
        const encounterRoll = Math.random();
        let encounter = null;
        
        if (encounterRoll < 0.15) {
          const encounterTypes = [
            { type: "battle", weight: 50 },
            { type: "treasure", weight: 20 },
            { type: "trap", weight: 15 },
            { type: "merchant", weight: 10 },
            { type: "event", weight: 5 },
          ];
          
          const totalWeight = encounterTypes.reduce((sum, e) => sum + e.weight, 0);
          let roll = Math.random() * totalWeight;
          let selectedType = "battle";
          
          for (const enc of encounterTypes) {
            roll -= enc.weight;
            if (roll <= 0) {
              selectedType = enc.type;
              break;
            }
          }
          
          encounter = {
            type: selectedType,
            data: generateEncounterData(selectedType, character.level),
          };
        }

        return {
          success: true,
          movesRemaining: 999999,
          encounter,
        };
      }),
    
    // Get movement status
    getMovementStatus: protectedProcedure.query(async ({ ctx }) => {
      try {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          return { movesRemaining: 999999, maxMoves: 999999, resetTime: new Date() };
        }
        return await db.getMovementStatus(character.id);
      } catch (e) {
        return { movesRemaining: 999999, maxMoves: 999999, resetTime: new Date() };
      }
    }),
  }),

  // ============================================
  // INVENTORY ROUTER
  // ============================================
  inventory: router({
    // Get inventory
    get: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return [];

      const dbInv = await db.getCharacterInventory(character.id);
      if (dbInv.length > 0) return dbInv;
      
      // Fallback to demo inventory
      if (isDemoCharacter(ctx.user.id)) {
        return getDemoInventory(ctx.user.id).map((i: any) => ({
          inventory: { id: i.id, characterId: character.id, itemId: i.item.id, quantity: i.quantity, isEquipped: i.isEquipped, equipSlot: i.equipSlot },
          item: i.item,
        }));
      }
      return [];
    }),

    // Get equipped items
    getEquipped: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return [];

      const dbEquipped = await db.getEquippedItems(character.id);
      if (dbEquipped.length > 0) return dbEquipped;
      
      // Fallback to demo inventory equipped items
      if (isDemoCharacter(ctx.user.id)) {
        return getDemoInventory(ctx.user.id)
          .filter((i: any) => i.isEquipped)
          .map((i: any) => ({
            inventory: { id: i.id, characterId: character.id, itemId: i.item.id, quantity: i.quantity, isEquipped: true, equipSlot: i.equipSlot },
            item: i.item,
          }));
      }
      return [];
    }),

    // Equip item
    equip: protectedProcedure
      .input(z.object({
        inventoryId: z.number(),
        slot: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        await db.equipItem(character.id, input.inventoryId, input.slot);
        // Demo mode equip
        if (isDemoCharacter(ctx.user.id)) {
          const inv = getDemoInventory(ctx.user.id);
          // Unequip any item in the same slot
          inv.forEach((i: any) => { if (i.equipSlot === input.slot) { i.isEquipped = false; i.equipSlot = null; } });
          const item = inv.find((i: any) => i.id === input.inventoryId);
          if (item) { item.isEquipped = true; item.equipSlot = input.slot; }
        }
        return { success: true };
      }),

    // Unequip item
    unequip: protectedProcedure
      .input(z.object({ inventoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.unequipItem(input.inventoryId);
        // Demo mode unequip
        if (isDemoCharacter(ctx.user.id)) {
          const inv = getDemoInventory(ctx.user.id);
          const item = inv.find((i: any) => i.id === input.inventoryId);
          if (item) { item.isEquipped = false; item.equipSlot = null; }
        }
        return { success: true };
      }),

    // Use consumable
    useItem: protectedProcedure
      .input(z.object({ inventoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        let inventory = await db.getCharacterInventory(character.id);
        let invItem: any = inventory.find((i: any) => i.inventory.id === input.inventoryId);
        
        // Fallback to demo inventory
        if (!invItem && isDemoCharacter(ctx.user.id)) {
          const demoInv = getDemoInventory(ctx.user.id);
          const demoItem = demoInv.find((i: any) => i.id === input.inventoryId);
          if (demoItem) {
            invItem = { inventory: { id: demoItem.id, quantity: demoItem.quantity }, item: demoItem.item };
          }
        }
        
        if (!invItem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        }

        const item = invItem.item;
        
        if (item.itemType !== "potion" && item.itemType !== "scroll") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este item não pode ser usado" });
        }

        // Apply effects - DB and demo mode
        if (item.healAmount) {
          await db.healCharacter(character.id, item.healAmount);
          if (isDemoCharacter(ctx.user.id)) {
            character.currentHealth = Math.min(character.maxHealth, character.currentHealth + item.healAmount);
          }
        }
        if (item.manaAmount) {
          await db.restoreMana(character.id, item.manaAmount);
          if (isDemoCharacter(ctx.user.id)) {
            character.currentMana = Math.min(character.maxMana, character.currentMana + item.manaAmount);
          }
        }

        // Remove item from inventory - DB and demo mode
        await db.removeItemFromInventory(character.id, item.id, 1);
        if (isDemoCharacter(ctx.user.id)) {
          removeDemoItem(ctx.user.id, input.inventoryId, 1);
        }

        return {
          healAmount: item.healAmount || 0,
          manaAmount: item.manaAmount || 0,
        };
      }),
  }),

  // ============================================
  // COMBAT ROUTER
  // ============================================
  combat: router({
    // Start combat with a monster
    start: protectedProcedure
      .input(z.object({
        monsterId: z.number(),
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const monster = await db.getMonsterById(input.monsterId);
        if (!monster) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Monstro não encontrado" });
        }

        // Scale monster to player level
        const scaledStats = scaleMonsterStats(
          monster.health,
          monster.damage,
          monster.armor,
          monster.baseLevel,
          character.level,
          monster.tier as MonsterTier
        );

        return {
          monster: {
            ...monster,
            ...scaledStats,
          },
          character: {
            id: character.id,
            name: character.name,
            currentHealth: character.currentHealth,
            maxHealth: character.maxHealth,
            currentMana: character.currentMana,
            maxMana: character.maxMana,
            armorClass: character.armorClass,
          },
        };
      }),

    // Player attacks monster
    attack: protectedProcedure
      .input(z.object({
        monsterId: z.number(),
        monsterCurrentHealth: z.number(),
        monsterArmor: z.number(),
        monsterDamage: z.number(),
        monsterLevel: z.number(),
        forceVictory: z.boolean().optional(), // Client already determined victory
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const equipped = await db.getEquippedItems(character.id);
        const weapon = equipped.find(e => e.inventory.equipSlot === "weapon");
        
        // Calculate player damage
        let baseDamage = 5; // Unarmed
        if (weapon) {
          const min = weapon.item.damageMin || 1;
          const max = weapon.item.damageMax || 5;
          baseDamage = Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // Player attack roll
        const attackRoll = performAttackRoll();
        const strMod = getAttributeModifier(character.strength);
        
        let playerDamage = 0;
        let playerHit = false;
        
        if (!attackRoll.isCriticalMiss) {
          const hitChance = calculateHitChance(character.dexterity, input.monsterArmor);
          playerHit = attackRoll.isCritical || Math.random() < hitChance;
          
          if (playerHit) {
            playerDamage = calculateDamage(baseDamage, strMod, attackRoll.isCritical);
          }
        }

        const newMonsterHealth = Math.max(0, input.monsterCurrentHealth - playerDamage);

        // Monster attacks back if still alive
        let monsterDamage = 0;
        let monsterHit = false;
        let newPlayerHealth = character.currentHealth;

        if (newMonsterHealth > 0) {
          const monsterRoll = performAttackRoll();
          
          if (!monsterRoll.isCriticalMiss) {
            const monsterHitChance = calculateHitChance(10 + input.monsterLevel, character.armorClass);
            monsterHit = monsterRoll.isCritical || Math.random() < monsterHitChance;
            
            if (monsterHit) {
              monsterDamage = calculateDamage(input.monsterDamage, Math.floor(input.monsterLevel / 2), monsterRoll.isCritical);
              newPlayerHealth = await db.damageCharacter(character.id, monsterDamage);
            }
          }
        }

        // Check for victory or defeat
        let result: "ongoing" | "victory" | "defeat" = "ongoing";
        let rewards = null;

        // Victory if monster health reaches 0 OR if client already determined victory
        if (newMonsterHealth <= 0 || input.forceVictory) {
          result = "victory";
          const monster = await db.getMonsterById(input.monsterId);
          if (monster) {
            rewards = scaleRewards(
              monster.experienceReward,
              monster.goldReward,
              input.monsterLevel,
              monster.tier as MonsterTier
            );
            
            const levelResult = await db.addExperience(character.id, rewards.experience);
            await db.addGold(character.id, rewards.gold);
            // Demo mode fallback
            if (isDemoCharacter(ctx.user.id)) {
              character.experience = (character.experience || 0) + rewards.experience;
              addDemoGold(ctx.user.id, rewards.gold);
            }

            // Generate loot from monster's loot table
            const lootEarned: Array<{ itemId: number; quantity: number; itemName?: string }> = [];
            const lootTable = monster.lootTable as Array<{ itemId: number; dropChance: number }> | null;
            
            if (lootTable && lootTable.length > 0) {
              // Tier bonus to drop chance
              const tierBonus = monster.tier === 'legendary' ? 0.3 : monster.tier === 'boss' ? 0.2 : monster.tier === 'elite' ? 0.1 : 0;
              
              for (const lootEntry of lootTable) {
                const roll = Math.random();
                const adjustedChance = Math.min(1, lootEntry.dropChance + tierBonus);
                
                if (roll < adjustedChance) {
                  // Item dropped! Add to inventory
                  await db.addItemToInventory(character.id, lootEntry.itemId, 1);
                  
                  // Get item name for the loot display
                  const item = await db.getItemById(lootEntry.itemId);
                  lootEarned.push({ 
                    itemId: lootEntry.itemId, 
                    quantity: 1,
                    itemName: item?.name || 'Item Desconhecido'
                  });
                }
              }
            }

            // Log combat with actual loot
            await db.createCombatLog({
              characterId: character.id,
              monsterId: input.monsterId,
              result: "victory",
              damageDealt: playerDamage,
              damageTaken: monsterDamage,
              turnsCount: 1,
              experienceEarned: rewards.experience,
              goldEarned: rewards.gold,
              lootEarned: lootEarned.map(l => ({ itemId: l.itemId, quantity: l.quantity })),
            });

            rewards = { 
              ...rewards, 
              leveledUp: levelResult.leveledUp, 
              newLevel: levelResult.newLevel,
              loot: lootEarned
            };
          }
        } else if (newPlayerHealth <= 0) {
          result = "defeat";
          // Log combat
          await db.createCombatLog({
            characterId: character.id,
            monsterId: input.monsterId,
            result: "defeat",
            damageDealt: playerDamage,
            damageTaken: monsterDamage,
            turnsCount: 1,
            experienceEarned: 0,
            goldEarned: 0,
            lootEarned: [],
          });
        }

        return {
          playerAttack: {
            roll: attackRoll.roll,
            hit: playerHit,
            damage: playerDamage,
            isCritical: attackRoll.isCritical,
            isCriticalMiss: attackRoll.isCriticalMiss,
          },
          monsterAttack: {
            hit: monsterHit,
            damage: monsterDamage,
          },
          newMonsterHealth,
          newPlayerHealth,
          result,
          rewards,
        };
      }),

    // Attempt to flee
    flee: protectedProcedure
      .input(z.object({
        monsterLevel: z.number(),
        monsterDamage: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const fleeChance = calculateFleeChance(character.dexterity, input.monsterLevel, character.level);
        const success = Math.random() < fleeChance;

        let damageTaken = 0;
        let newHealth = character.currentHealth;

        if (!success) {
          // Monster gets a free attack
          damageTaken = Math.floor(input.monsterDamage * 0.5);
          newHealth = await db.damageCharacter(character.id, damageTaken);
        }

        return {
          success,
          damageTaken,
          newHealth,
          fleeChance: Math.floor(fleeChance * 100),
        };
      }),

    // Claim victory rewards (persist XP and gold)
    claimVictory: protectedProcedure
      .input(z.object({
        experience: z.number().min(0),
        gold: z.number().min(0),
        monsterName: z.string().optional(),
        monsterLevel: z.number().optional(),
        monsterTier: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        // DB character
        if (!isDemoCharacter(ctx.user.id)) {
          try {
            const levelResult = await db.addExperience(character.id, input.experience);
            await db.addGold(character.id, input.gold);
            return {
              success: true,
              experience: input.experience,
              gold: input.gold,
              leveledUp: levelResult.leveledUp,
              newLevel: levelResult.newLevel,
              totalExperience: character.experience + input.experience,
            };
          } catch (e) {
            // DB failed, fall through to demo mode logic
          }
        }

        // Demo mode - update in-memory character
        character.experience = (character.experience || 0) + input.experience;
        character.gold = (character.gold || 0) + input.gold;
        
        // Check for level up using D&D 5e XP table
        const XP_TABLE = XP_TABLE_GLOBAL;
        let leveledUp = false;
        let oldLevel = character.level || 1;
        let newLevel = oldLevel;
        
        while (newLevel < 20 && character.experience >= XP_TABLE[newLevel]) {
          newLevel++;
          leveledUp = true;
        }
        
        if (leveledUp) {
          character.level = newLevel;
          character.availableStatPoints = (character.availableStatPoints || 0) + (newLevel - oldLevel) * 2;
          character.maxHealth = calculateMaxHealth(
            character.characterClass as CharacterClass,
            newLevel,
            character.constitution || 14
          );
          character.currentHealth = character.maxHealth;
          character.maxMana = calculateMaxMana(
            character.characterClass as CharacterClass,
            newLevel,
            character.intelligence || 10
          );
          character.currentMana = character.maxMana;
        }
        
        character.experienceToNextLevel = newLevel < 20 ? XP_TABLE[newLevel] : XP_TABLE[19];
        
        console.log(`[ClaimVictory] +${input.experience} XP, +${input.gold} gold. Total XP: ${character.experience}, Level: ${character.level}, Next: ${character.experienceToNextLevel}`);
        
        return {
          success: true,
          experience: input.experience,
          gold: input.gold,
          leveledUp,
          newLevel: character.level,
          totalExperience: character.experience,
        };
      }),

    // Roll dice (utility)
    rollDice: publicProcedure
      .input(z.object({
        diceType: z.enum(["d4", "d6", "d8", "d10", "d12", "d20", "d100"]),
        count: z.number().min(1).max(10).default(1),
      }))
      .mutation(({ input }) => {
        return rollDice(input.diceType, input.count);
      }),
  }),

  // ============================================
  // WORLD ROUTER (Map & POIs)
  // ============================================
  world: router({
    // Generate POIs around location
    getPOIs: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().default(500), // meters
      }))
      .query(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) return [];

        // Use location seed for deterministic generation
        const seed = getLocationSeed(input.latitude, input.longitude, 3);
        const rng = seededRandom(seed);

        // Generate POIs based on seed
        const poiCount = Math.floor(rng() * 10) + 5; // 5-15 POIs
        const pois: Array<{
          id: string;
          type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
          name: string;
          latitude: number;
          longitude: number;
          biome: BiomeType;
          data: any;
        }> = [];

        // Get available monsters and NPCs
        const allMonsters = await db.getAllMonsters();
        const allNpcs = await db.getAllNpcs();

        for (let i = 0; i < poiCount; i++) {
          const point = getRandomPointInRadius(input.latitude, input.longitude, input.radius);
          const poiSeed = getLocationSeed(point.latitude, point.longitude, 5);
          const poiRng = seededRandom(poiSeed);

          // Determine POI type
          const typeRoll = poiRng();
          let type: "monster" | "npc" | "shop" | "treasure" | "dungeon";
          
          if (typeRoll < 0.5) type = "monster";
          else if (typeRoll < 0.7) type = "npc";
          else if (typeRoll < 0.85) type = "shop";
          else if (typeRoll < 0.95) type = "treasure";
          else type = "dungeon";

          // Determine biome (simplified - in real app would use map data)
          const biomes: BiomeType[] = ["urban", "forest", "plains", "mountain", "water", "desert"];
          const biome = biomes[Math.floor(poiRng() * biomes.length)];

          let name = "";
          let data: any = {};

          if (type === "monster" && allMonsters.length > 0) {
            const monster = allMonsters[Math.floor(poiRng() * allMonsters.length)];
            name = monster.name;
            data = { monsterId: monster.id, tier: monster.tier };
          } else if ((type === "npc" || type === "shop") && allNpcs.length > 0) {
            const npc = allNpcs[Math.floor(poiRng() * allNpcs.length)];
            name = npc.name;
            data = { npcId: npc.id, npcType: npc.npcType };
            if (npc.npcType === "merchant" || npc.npcType === "blacksmith" || npc.npcType === "alchemist") {
              type = "shop";
            }
          } else if (type === "treasure") {
            name = "Baú do Tesouro";
            data = { goldAmount: Math.floor(poiRng() * 50) + 10 };
          } else if (type === "dungeon") {
            name = "Entrada da Masmorra";
            data = { difficulty: Math.floor(poiRng() * 3) + 1 };
          } else {
            // Fallback
            name = "Ponto Misterioso";
            type = "monster";
          }

          pois.push({
            id: `poi-${poiSeed}`,
            type,
            name,
            latitude: point.latitude,
            longitude: point.longitude,
            biome,
            data,
          });
        }

        return pois;
      }),

    // Get biome info
    getBiomes: publicProcedure.query(() => {
      return Object.entries(BIOMES).map(([key, value]) => ({
        id: key,
        ...value,
      }));
    }),

    // Collect treasure
     collectTreasure: protectedProcedure
      .input(z.object({
        poiId: z.string(),
        goldAmount: z.number(),
        xpAmount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }
        
        // Update gold - DB and demo mode
        await db.addGold(character.id, input.goldAmount);
        if (isDemoCharacter(ctx.user.id)) {
          addDemoGold(ctx.user.id, input.goldAmount);
        }
        
        // Update XP if provided
        const xpAmount = input.xpAmount || 0;
        let leveledUp = false;
        let newLevel = character.level;
        if (xpAmount > 0) {
          await db.addExperience(character.id, xpAmount);
          if (isDemoCharacter(ctx.user.id)) {
            character.experience = (character.experience || 0) + xpAmount;
            // Check level up
            while (character.experience >= character.experienceToNextLevel) {
              character.level += 1;
              leveledUp = true;
              newLevel = character.level;
              const classData = CHARACTER_CLASSES[character.class as keyof typeof CHARACTER_CLASSES];
              character.experienceToNextLevel = XP_TABLE_GLOBAL[character.level] || (character.level * 1000);
              character.maxHealth = calculateMaxHealth(character.level, character.class, character.constitution);
              character.maxMana = calculateMaxMana(character.level, character.class, character.intelligence);
              character.currentHealth = character.maxHealth;
              character.currentMana = character.maxMana;
              character.attributePoints = (character.attributePoints || 0) + 2;
            }
          }
        }
        
        return {
          goldCollected: input.goldAmount,
          xpCollected: xpAmount,
          newGold: character.gold,
          newXp: character.experience,
          leveledUp,
          newLevel,
        };
      }),
  }),

  // ============================================
  // SHOP ROUTER
  // ============================================
  shop: router({
    // Get shop inventory
    getInventory: protectedProcedure
      .input(z.object({ npcId: z.number() }))
      .query(async ({ input }) => {
        // Try to get NPC from database first
        const npc = await db.getNpcById(input.npcId);
        
        if (npc && npc.shopInventory && npc.shopInventory.length > 0) {
          // NPC exists with inventory - use database items
          const items = [];
          for (const shopItem of npc.shopInventory) {
            const item = await db.getItemById(shopItem.itemId);
            if (item) {
              items.push({
                item,
                stock: shopItem.stock,
              });
            }
          }
          return items;
        }
        
        // Generate dynamic shop items based on NPC seed
        const rng = seededRandom(input.npcId);
        const shopType = input.npcId % 3; // 0 = merchant, 1 = blacksmith, 2 = alchemist
        
        const generateItem = (id: number, name: string, desc: string, type: string, rarity: string, price: number, damage?: number[], armor?: number, heal?: number, mana?: number, stats?: Record<string, number>) => ({
          id,
          name,
          description: desc,
          itemType: type,
          rarity,
          buyPrice: price,
          sellPrice: Math.floor(price / 2),
          levelRequired: Math.max(1, Math.floor(price / 100)),
          damageMin: damage ? damage[0] : null,
          damageMax: damage ? damage[1] : null,
          armorValue: armor || null,
          healAmount: heal || null,
          manaAmount: mana || null,
          statBonuses: stats || null,
          createdAt: new Date(),
        });
        
        const items: Array<{ item: any; stock: number }> = [];
        
        if (shopType === 0) {
          // Merchant - sells a bit of everything
          items.push({ item: generateItem(1001, "Espada Curta", "Uma espada simples mas eficaz", "weapon", "common", 50, [4, 8]), stock: 5 });
          items.push({ item: generateItem(1002, "Adaga Afiada", "Perfeita para ataques rápidos", "weapon", "common", 40, [2, 6], undefined, undefined, undefined, { dexterity: 1 }), stock: 5 });
          items.push({ item: generateItem(1003, "Armadura de Couro", "Proteção básica e leve", "armor", "common", 40, undefined, 2), stock: 3 });
          items.push({ item: generateItem(1004, "Poção de Cura Menor", "Restaura 25 pontos de vida", "potion", "common", 15, undefined, undefined, 25), stock: 10 });
          items.push({ item: generateItem(1005, "Poção de Mana Menor", "Restaura 20 pontos de mana", "potion", "common", 20, undefined, undefined, undefined, 20), stock: 10 });
          items.push({ item: generateItem(1006, "Anel de Força", "Aumenta a força do portador", "ring", "uncommon", 100, undefined, undefined, undefined, undefined, { strength: 2 }), stock: 2 });
        } else if (shopType === 1) {
          // Blacksmith - weapons and armor
          items.push({ item: generateItem(2001, "Espada Longa", "Arma versátil e confiável", "weapon", "common", 80, [5, 10]), stock: 3 });
          items.push({ item: generateItem(2002, "Martelo de Guerra", "Arma pesada e devastadora", "weapon", "uncommon", 150, [6, 12], undefined, undefined, undefined, { strength: 2 }), stock: 2 });
          items.push({ item: generateItem(2003, "Arco Longo", "Para ataques à distância", "weapon", "common", 80, [4, 10]), stock: 3 });
          items.push({ item: generateItem(2004, "Lâmina Flamejante", "Uma espada envolta em chamas", "weapon", "rare", 500, [8, 16], undefined, undefined, undefined, { strength: 2, damage: 3 }), stock: 1 });
          items.push({ item: generateItem(2005, "Cota de Malha", "Boa proteção sem sacrificar mobilidade", "armor", "uncommon", 200, undefined, 4), stock: 2 });
          items.push({ item: generateItem(2006, "Armadura de Placas", "Proteção máxima para guerreiros", "armor", "rare", 600, undefined, 6, undefined, undefined, { constitution: 2 }), stock: 1 });
          items.push({ item: generateItem(2007, "Elmo de Ferro", "Proteção para a cabeça", "helmet", "common", 30, undefined, 1), stock: 5 });
          items.push({ item: generateItem(2008, "Escudo de Aço", "Defesa sólida contra ataques", "shield", "common", 60, undefined, 2), stock: 3 });
        } else {
          // Alchemist - potions and magic items
          items.push({ item: generateItem(3001, "Poção de Cura Menor", "Restaura 25 pontos de vida", "potion", "common", 15, undefined, undefined, 25), stock: 15 });
          items.push({ item: generateItem(3002, "Poção de Cura", "Restaura 50 pontos de vida", "potion", "uncommon", 35, undefined, undefined, 50), stock: 10 });
          items.push({ item: generateItem(3003, "Poção de Cura Maior", "Restaura 100 pontos de vida", "potion", "rare", 80, undefined, undefined, 100), stock: 5 });
          items.push({ item: generateItem(3004, "Poção de Mana Menor", "Restaura 20 pontos de mana", "potion", "common", 20, undefined, undefined, undefined, 20), stock: 15 });
          items.push({ item: generateItem(3005, "Poção de Mana", "Restaura 40 pontos de mana", "potion", "uncommon", 45, undefined, undefined, undefined, 40), stock: 10 });
          items.push({ item: generateItem(3006, "Cajado Arcano", "Um cajado imbuído de energia mágica", "weapon", "common", 60, [3, 6], undefined, undefined, undefined, { intelligence: 1 }), stock: 2 });
          items.push({ item: generateItem(3007, "Capuz do Mago", "Aumenta o poder mágico", "helmet", "uncommon", 120, undefined, 0, undefined, undefined, { intelligence: 2, mana: 10 }), stock: 2 });
          items.push({ item: generateItem(3008, "Amuleto de Proteção", "Oferece proteção mágica", "amulet", "uncommon", 120, undefined, undefined, undefined, undefined, { armor: 1, health: 15 }), stock: 2 });
        }
        
        return items;
      }),

    // Buy item
    buy: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        itemData: z.object({
          name: z.string(),
          description: z.string(),
          itemType: z.string(),
          rarity: z.string(),
          buyPrice: z.number(),
          sellPrice: z.number(),
          levelRequired: z.number().optional(),
          damageMin: z.number().nullable().optional(),
          damageMax: z.number().nullable().optional(),
          armorValue: z.number().nullable().optional(),
          healAmount: z.number().nullable().optional(),
          manaAmount: z.number().nullable().optional(),
          statBonuses: z.record(z.string(), z.number()).nullable().optional(),
        }).optional(),
        quantity: z.number().min(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        let item = await db.getItemById(input.itemId);
        
        // If item doesn't exist in DB but we have itemData, create/use it
        if (!item && input.itemData) {
          const newItem = await db.createItem({
            name: input.itemData.name,
            description: input.itemData.description,
            itemType: input.itemData.itemType as any,
            rarity: input.itemData.rarity as any,
            buyPrice: input.itemData.buyPrice,
            sellPrice: input.itemData.sellPrice,
            levelRequired: input.itemData.levelRequired || 1,
            damageMin: input.itemData.damageMin,
            damageMax: input.itemData.damageMax,
            armorValue: input.itemData.armorValue,
            healAmount: input.itemData.healAmount,
            manaAmount: input.itemData.manaAmount,
            statBonuses: input.itemData.statBonuses,
          });
          // In demo mode, db.createItem returns null - use itemData directly
          item = newItem || ({
            id: input.itemId,
            name: input.itemData.name,
            description: input.itemData.description,
            itemType: input.itemData.itemType,
            rarity: input.itemData.rarity,
            buyPrice: input.itemData.buyPrice,
            sellPrice: input.itemData.sellPrice,
            levelRequired: input.itemData.levelRequired || 1,
            damageMin: input.itemData.damageMin || null,
            damageMax: input.itemData.damageMax || null,
            armorValue: input.itemData.armorValue || null,
            healAmount: input.itemData.healAmount || null,
            manaAmount: input.itemData.manaAmount || null,
            statBonuses: input.itemData.statBonuses || null,
            classRequired: null,
            iconUrl: null,
            createdAt: new Date(),
          } as any);
        }
        
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        }

        const totalCost = item.buyPrice * input.quantity;
        
        if (character.gold < totalCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ouro insuficiente" });
        }

        // Spend gold - DB and demo mode
        const dbSuccess = await db.spendGold(character.id, totalCost);
        if (!dbSuccess && isDemoCharacter(ctx.user.id)) {
          const demoSuccess = spendDemoGold(ctx.user.id, totalCost);
          if (!demoSuccess) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Ouro insuficiente" });
          }
        } else if (!dbSuccess) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Falha ao comprar item" });
        }

        // Add item to inventory - DB and demo mode
        await db.addItemToInventory(character.id, item.id, input.quantity);
        if (isDemoCharacter(ctx.user.id)) {
          addDemoItem(ctx.user.id, item, input.quantity);
        }

        return {
          itemName: item.name,
          quantity: input.quantity,
          totalCost,
          newGold: character.gold,
        };
      }),

    // Sell item
    sell: protectedProcedure
      .input(z.object({
        inventoryId: z.number(),
        quantity: z.number().min(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        // Get inventory from DB or demo mode
        let invItems = await db.getCharacterInventory(character.id);
        let invItem: any = invItems.find((i: any) => i.inventory.id === input.inventoryId);
        
        // Fallback to demo inventory
        if (!invItem && isDemoCharacter(ctx.user.id)) {
          const demoInv = getDemoInventory(ctx.user.id);
          const demoItem = demoInv.find((i: any) => i.id === input.inventoryId);
          if (demoItem) {
            invItem = { inventory: { id: demoItem.id, quantity: demoItem.quantity }, item: demoItem.item };
          }
        }

        if (!invItem || invItem.inventory.quantity < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Quantidade insuficiente" });
        }

        const totalValue = invItem.item.sellPrice * input.quantity;
        
        // Remove item and add gold - DB and demo mode
        await db.removeItemFromInventory(character.id, invItem.item.id, input.quantity);
        await db.addGold(character.id, totalValue);
        if (isDemoCharacter(ctx.user.id)) {
          removeDemoItem(ctx.user.id, input.inventoryId, input.quantity);
          addDemoGold(ctx.user.id, totalValue);
        }

        return {
          itemName: invItem.item.name,
          quantity: input.quantity,
          totalValue,
          newGold: character.gold,
        };
      }),
  }),

  // ============================================
  // QUEST ROUTER
  // ============================================
  quest: router({
    // Get available quests
    getAvailable: protectedProcedure
      .input(z.object({ biome: z.string().optional() }))
      .query(async ({ input }) => {
        if (input.biome) {
          return await db.getQuestsByBiome(input.biome);
        }
        // Return all quests for now
        const db2 = await db.getDb();
        if (!db2) return [];
        
        const { quests } = await import("../drizzle/schema");
        return await db2.select().from(quests);
      }),

    // Get character's active quests
    getActive: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return [];

      return await db.getCharacterQuests(character.id);
    }),

    // Accept quest
    accept: protectedProcedure
      .input(z.object({ questId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const quest = await db.getQuestById(input.questId);
        if (!quest) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Missão não encontrada" });
        }

        if (character.level < quest.levelRequired) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Nível ${quest.levelRequired} necessário` });
        }

        await db.startQuest(character.id, input.questId);
        return { success: true };
      }),

    // Update quest progress
    updateProgress: protectedProcedure
      .input(z.object({
        characterQuestId: z.number(),
        objectiveIndex: z.number(),
        amount: z.number(),
      }))
      .mutation(async ({ input }) => {
        const completed = await db.updateQuestProgress(
          input.characterQuestId,
          input.objectiveIndex,
          input.amount
        );

        return { completed };
      }),
  }),

  // ============================================
  // GAME DATA ROUTER (for seeding/admin)
  // ============================================
  gameData: router({
    // Seed initial game data
    seed: protectedProcedure.mutation(async ({ ctx }) => {
      // Only allow admin
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas administradores" });
      }

      // Seed items
      const itemsToSeed = [
        // Weapons
        { name: "Espada Curta", description: "Uma espada simples mas eficaz", itemType: "weapon" as const, rarity: "common" as const, damageMin: 4, damageMax: 8, buyPrice: 50, sellPrice: 25, levelRequired: 1 },
        { name: "Cajado Arcano", description: "Um cajado imbuído de energia mágica", itemType: "weapon" as const, rarity: "common" as const, damageMin: 3, damageMax: 6, buyPrice: 60, sellPrice: 30, levelRequired: 1, statBonuses: { intelligence: 1 } },
        { name: "Adaga Afiada", description: "Perfeita para ataques rápidos", itemType: "weapon" as const, rarity: "common" as const, damageMin: 2, damageMax: 6, buyPrice: 40, sellPrice: 20, levelRequired: 1, statBonuses: { dexterity: 1 } },
        { name: "Martelo de Guerra", description: "Arma pesada e devastadora", itemType: "weapon" as const, rarity: "uncommon" as const, damageMin: 6, damageMax: 12, buyPrice: 150, sellPrice: 75, levelRequired: 3, statBonuses: { strength: 2 } },
        { name: "Arco Longo", description: "Para ataques à distância", itemType: "weapon" as const, rarity: "common" as const, damageMin: 4, damageMax: 10, buyPrice: 80, sellPrice: 40, levelRequired: 1 },
        { name: "Lâmina Flamejante", description: "Uma espada envolta em chamas eternas", itemType: "weapon" as const, rarity: "rare" as const, damageMin: 8, damageMax: 16, buyPrice: 500, sellPrice: 250, levelRequired: 5, statBonuses: { strength: 2, damage: 3 } },
        
        // Armor
        { name: "Armadura de Couro", description: "Proteção básica e leve", itemType: "armor" as const, rarity: "common" as const, armorValue: 2, buyPrice: 40, sellPrice: 20, levelRequired: 1 },
        { name: "Cota de Malha", description: "Boa proteção sem sacrificar mobilidade", itemType: "armor" as const, rarity: "uncommon" as const, armorValue: 4, buyPrice: 200, sellPrice: 100, levelRequired: 3 },
        { name: "Armadura de Placas", description: "Proteção máxima para guerreiros", itemType: "armor" as const, rarity: "rare" as const, armorValue: 6, buyPrice: 600, sellPrice: 300, levelRequired: 5, statBonuses: { constitution: 2 } },
        
        // Helmets
        { name: "Elmo de Ferro", description: "Proteção para a cabeça", itemType: "helmet" as const, rarity: "common" as const, armorValue: 1, buyPrice: 30, sellPrice: 15, levelRequired: 1 },
        { name: "Capuz do Mago", description: "Aumenta o poder mágico", itemType: "helmet" as const, rarity: "uncommon" as const, armorValue: 0, buyPrice: 120, sellPrice: 60, levelRequired: 2, statBonuses: { intelligence: 2, mana: 10 } },
        
        // Potions
        { name: "Poção de Cura Menor", description: "Restaura 25 pontos de vida", itemType: "potion" as const, rarity: "common" as const, healAmount: 25, buyPrice: 15, sellPrice: 5, levelRequired: 1 },
        { name: "Poção de Cura", description: "Restaura 50 pontos de vida", itemType: "potion" as const, rarity: "uncommon" as const, healAmount: 50, buyPrice: 35, sellPrice: 15, levelRequired: 1 },
        { name: "Poção de Cura Maior", description: "Restaura 100 pontos de vida", itemType: "potion" as const, rarity: "rare" as const, healAmount: 100, buyPrice: 80, sellPrice: 40, levelRequired: 1 },
        { name: "Poção de Mana Menor", description: "Restaura 20 pontos de mana", itemType: "potion" as const, rarity: "common" as const, manaAmount: 20, buyPrice: 20, sellPrice: 8, levelRequired: 1 },
        { name: "Poção de Mana", description: "Restaura 40 pontos de mana", itemType: "potion" as const, rarity: "uncommon" as const, manaAmount: 40, buyPrice: 45, sellPrice: 20, levelRequired: 1 },
        
        // Rings & Amulets
        { name: "Anel de Força", description: "Aumenta a força do portador", itemType: "ring" as const, rarity: "uncommon" as const, buyPrice: 100, sellPrice: 50, levelRequired: 2, statBonuses: { strength: 2 } },
        { name: "Amuleto de Proteção", description: "Oferece proteção mágica", itemType: "amulet" as const, rarity: "uncommon" as const, buyPrice: 120, sellPrice: 60, levelRequired: 2, statBonuses: { armor: 1, health: 15 } },
      ];

      for (const item of itemsToSeed) {
        await db.createItem(item);
      }

      // Seed monsters
      const monstersToSeed = [
        { name: "Goblin", description: "Criatura pequena e traiçoeira", monsterType: "humanoid" as const, tier: "common" as const, baseLevel: 1, health: 30, damage: 5, armor: 2, experienceReward: 20, goldReward: 8, biomeType: "forest" as const },
        { name: "Lobo", description: "Predador selvagem", monsterType: "beast" as const, tier: "common" as const, baseLevel: 1, health: 25, damage: 7, armor: 1, experienceReward: 15, goldReward: 5, biomeType: "forest" as const },
        { name: "Esqueleto", description: "Morto-vivo animado por magia negra", monsterType: "undead" as const, tier: "common" as const, baseLevel: 2, health: 35, damage: 6, armor: 3, experienceReward: 25, goldReward: 12, biomeType: "urban" as const },
        { name: "Orc", description: "Guerreiro brutal e forte", monsterType: "humanoid" as const, tier: "common" as const, baseLevel: 3, health: 50, damage: 10, armor: 4, experienceReward: 40, goldReward: 20, biomeType: "mountain" as const },
        { name: "Aranha Gigante", description: "Aracnídeo venenoso", monsterType: "beast" as const, tier: "common" as const, baseLevel: 2, health: 40, damage: 8, armor: 2, experienceReward: 30, goldReward: 15, biomeType: "forest" as const },
        { name: "Elemental de Fogo", description: "Espírito de chamas", monsterType: "elemental" as const, tier: "elite" as const, baseLevel: 5, health: 80, damage: 15, armor: 5, experienceReward: 100, goldReward: 50, biomeType: "desert" as const },
        { name: "Troll", description: "Gigante regenerativo", monsterType: "humanoid" as const, tier: "elite" as const, baseLevel: 6, health: 120, damage: 18, armor: 6, experienceReward: 150, goldReward: 75, biomeType: "mountain" as const },
        { name: "Dragão Jovem", description: "Cria de dragão, ainda assim mortal", monsterType: "dragon" as const, tier: "boss" as const, baseLevel: 10, health: 200, damage: 25, armor: 10, experienceReward: 500, goldReward: 250, biomeType: "mountain" as const },
        { name: "Slime", description: "Criatura gelatinosa", monsterType: "aberration" as const, tier: "common" as const, baseLevel: 1, health: 20, damage: 3, armor: 0, experienceReward: 10, goldReward: 3, biomeType: "plains" as const },
        { name: "Bandido", description: "Ladrão de estradas", monsterType: "humanoid" as const, tier: "common" as const, baseLevel: 2, health: 35, damage: 8, armor: 3, experienceReward: 25, goldReward: 25, biomeType: "urban" as const },
      ];

      for (const monster of monstersToSeed) {
        await db.createMonster(monster);
      }

      // Seed NPCs
      const npcsToSeed = [
        { name: "Thorin", title: "O Ferreiro", description: "Um anão habilidoso que forja as melhores armas", npcType: "blacksmith" as const, greeting: "Bem-vindo à minha forja! Procura algo resistente?", farewell: "Que suas armas nunca falhem!", biomeType: "urban" as const, shopInventory: [{ itemId: 1, stock: 5 }, { itemId: 4, stock: 2 }, { itemId: 7, stock: 3 }] },
        { name: "Elena", title: "A Alquimista", description: "Especialista em poções e elixires", npcType: "alchemist" as const, greeting: "Precisa de algo para curar suas feridas?", farewell: "Cuidado lá fora!", biomeType: "urban" as const, shopInventory: [{ itemId: 12, stock: 10 }, { itemId: 13, stock: 5 }, { itemId: 15, stock: 8 }] },
        { name: "Marcus", title: "O Mercador", description: "Vende de tudo um pouco", npcType: "merchant" as const, greeting: "Tenho os melhores preços da região!", farewell: "Volte sempre!", biomeType: "urban" as const, shopInventory: [{ itemId: 1, stock: 3 }, { itemId: 7, stock: 2 }, { itemId: 12, stock: 5 }] },
        { name: "Greta", title: "A Estalajadeira", description: "Oferece descanso aos viajantes", npcType: "innkeeper" as const, greeting: "Precisa de um lugar para descansar?", farewell: "Bons sonhos!", biomeType: "urban" as const },
        { name: "Aldric", title: "O Aventureiro", description: "Sempre tem uma missão para oferecer", npcType: "quest_giver" as const, greeting: "Procura aventura? Tenho trabalho para você!", farewell: "Boa sorte na sua jornada!", biomeType: "urban" as const },
      ];

      for (const npc of npcsToSeed) {
        await db.createNpc(npc);
      }

      return { success: true, message: "Dados do jogo inicializados!" };
    }),

    // Get all items (for admin/debug)
    getAllItems: protectedProcedure.query(async () => {
      return await db.getAllItems();
    }),

    // Get all monsters
    getAllMonsters: protectedProcedure.query(async () => {
      return await db.getAllMonsters();
    }),

    // Get all NPCs
    getAllNpcs: protectedProcedure.query(async () => {
      return await db.getAllNpcs();
    }),
  }),

  // ============================================
  // VISITED POIs ROUTER (Track interactions)
  // ============================================
  visitedPois: router({
    // Mark POI as visited/interacted
    markVisited: protectedProcedure
      .input(z.object({
        poiHash: z.string(),
        poiType: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        interactionType: z.enum(["defeated", "collected", "visited", "completed", "purchased"]),
        canRespawn: z.boolean().default(true),
        respawnMinutes: z.number().optional(), // Minutes until respawn
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const respawnAt = input.respawnMinutes 
          ? new Date(Date.now() + input.respawnMinutes * 60 * 1000)
          : null;

        await db.markPoiVisited({
          characterId: character.id,
          poiHash: input.poiHash,
          poiType: input.poiType,
          latitude: input.latitude,
          longitude: input.longitude,
          interactionType: input.interactionType,
          canRespawn: input.canRespawn,
          respawnAt,
        });

        return { success: true };
      }),

    // Get visited POIs for current character
    getVisited: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().default(500),
      }))
      .query(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) return [];

        return await db.getVisitedPois(character.id, input.latitude, input.longitude, input.radius);
      }),

    // Check if specific POI is visited and not respawned
    isVisited: protectedProcedure
      .input(z.object({ poiHash: z.string() }))
      .query(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) return { visited: false, canInteract: true };

        const visited = await db.checkPoiVisited(character.id, input.poiHash);
        return visited;
      }),
  }),

  // ============================================
  // SPELLS ROUTER (Magic system)
  // ============================================
  spells: router({
    // Get available spells for character's class
    getAvailable: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return [];

      const classData = CHARACTER_CLASSES[character.characterClass as keyof typeof CHARACTER_CLASSES];
      if (!classData.spellcasting) return [];

      // Filter spells by class
      const availableSpells = Object.entries(SPELLS)
        .filter(([_, spell]) => spell.classes.includes(character.characterClass))
        .filter(([_, spell]) => {
          // Check if character can cast this level
          const slots = SPELL_SLOTS_BY_LEVEL[character.level as keyof typeof SPELL_SLOTS_BY_LEVEL];
          if (!slots) return spell.level === 0; // Only cantrips
          if (spell.level === 0) return true; // Cantrips always available
          const slotCount = slots[spell.level as keyof typeof slots];
          return typeof slotCount === 'number' && slotCount > 0;
        })
        .map(([spellId, spell]) => ({ spellId, ...spell }));

      return availableSpells;
    }),

    // Get character's known/prepared spells
    getKnown: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return [];

      return await db.getCharacterSpells(character.id);
    }),

    // Learn a new spell
    learn: protectedProcedure
      .input(z.object({ spellId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const spell = SPELLS[input.spellId as keyof typeof SPELLS];
        if (!spell) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Magia não encontrada" });
        }

        if (!spell.classes.includes(character.characterClass)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sua classe não pode aprender esta magia" });
        }

        await db.learnSpell(character.id, input.spellId);
        return { success: true };
      }),

    // Get spell slots
    getSlots: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return null;

      return await db.getSpellSlots(character.id);
    }),

    // Use a spell (consume slot)
    cast: protectedProcedure
      .input(z.object({
        spellId: z.string(),
        slotLevel: z.number().min(1).max(9).optional(), // For leveled spells
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const spell = SPELLS[input.spellId as keyof typeof SPELLS];
        if (!spell) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Magia não encontrada" });
        }

        // Cantrips don't consume slots
        if (spell.level === 0) {
          return { success: true, damage: spell.damage, healing: spell.healing };
        }

        const slotLevel = input.slotLevel || spell.level;
        const consumed = await db.consumeSpellSlot(character.id, slotLevel);
        
        if (!consumed) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sem slots de magia disponíveis" });
        }

        return { success: true, damage: spell.damage, healing: spell.healing };
      }),

    // Rest to recover spell slots
    rest: protectedProcedure
      .input(z.object({ restType: z.enum(["short", "long"]) }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        if (input.restType === "long") {
          // Full recovery
          await db.restoreAllSpellSlots(character.id, character.level);
          await db.healCharacter(character.id, character.maxHealth);
          await db.restoreMana(character.id, character.maxMana);
          if (isDemoCharacter(ctx.user.id)) {
            character.currentHealth = character.maxHealth;
            character.currentMana = character.maxMana;
          }
        } else {
          // Short rest - recover some HP and limited slots (warlock style)
          const healAmount = Math.floor(character.maxHealth * 0.25);
          await db.healCharacter(character.id, healAmount);
          if (isDemoCharacter(ctx.user.id)) {
            character.currentHealth = Math.min(character.maxHealth, character.currentHealth + healAmount);
          }
        }

        return { success: true, restType: input.restType };
      }),
  }),

  // ============================================
  // GUILDS ROUTER
  // ============================================
  guilds: router({
    // Get nearby guilds
    getNearby: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().default(1000),
      }))
      .query(async ({ input }) => {
        return await db.getGuildsNearby(input.latitude, input.longitude, input.radius);
      }),

    // Get character's guild membership
    getMembership: protectedProcedure.query(async ({ ctx }) => {
      const character = await getCharacterOrDemo(ctx.user.id);
      if (!character) return null;

      return await db.getGuildMembership(character.id);
    }),

    // Join a guild
    join: protectedProcedure
      .input(z.object({ guildId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const guild = await db.getGuildById(input.guildId);
        if (!guild) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Guilda não encontrada" });
        }

        if (character.level < guild.levelRequired) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Nível ${guild.levelRequired} necessário` });
        }

        if (character.gold < guild.goldRequired) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${guild.goldRequired} de ouro necessário` });
        }

        const guildSpendSuccess = await db.spendGold(character.id, guild.goldRequired);
        if (!guildSpendSuccess && isDemoCharacter(ctx.user.id)) {
          spendDemoGold(ctx.user.id, guild.goldRequired);
        }
        await db.joinGuild(character.id, input.guildId);

        return { success: true, guildName: guild.name };
      }),
  }),

  // ============================================
  // CASTLES ROUTER
  // ============================================
  castles: router({
    // Get nearby castles
    getNearby: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
        radius: z.number().default(2000),
      }))
      .query(async ({ input }) => {
        return await db.getCastlesNearby(input.latitude, input.longitude, input.radius);
      }),

    // Get castle details
    getDetails: protectedProcedure
      .input(z.object({ castleId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCastleById(input.castleId);
      }),

    // Enter castle dungeon
    enterDungeon: protectedProcedure
      .input(z.object({ castleId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const castle = await db.getCastleById(input.castleId);
        if (!castle) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Castelo não encontrado" });
        }

        if (!castle.hasDungeon) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este castelo não possui masmorra" });
        }

        // Return dungeon info for the client to start dungeon exploration
        return {
          castleName: castle.name,
          dungeonLevels: castle.dungeonLevels,
          isHostile: castle.isHostile,
          bossId: castle.bossId,
        };
      }),
  }),

  // ============================================
  // GLOBAL CHAT ROUTER
  // ============================================
  chat: router({
    // Send a message to global chat
    send: protectedProcedure
      .input(z.object({
        message: z.string().min(1).max(500),
        messageType: z.enum(["normal", "trade", "guild"]).default("normal"),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        // Filter profanity and spam (basic)
        const cleanMessage = input.message.trim();
        if (cleanMessage.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Mensagem vazia" });
        }

        await db.sendChatMessage({
          userId: ctx.user.id,
          characterId: character.id,
          message: cleanMessage,
          messageType: input.messageType,
          characterName: character.name,
          characterClass: character.characterClass,
          characterLevel: character.level,
        });

        return { success: true };
      }),

    // Get recent messages
    getMessages: protectedProcedure
      .input(z.object({
        limit: z.number().min(1).max(100).default(50),
        beforeId: z.number().optional(),
      }))
      .query(async ({ input }) => {
        const messages = await db.getChatMessages(input.limit, input.beforeId);
        // Return in chronological order (oldest first)
        return messages.reverse();
      }),

    // Get new messages since last ID (for polling)
    getNewMessages: protectedProcedure
      .input(z.object({ sinceId: z.number() }))
      .query(async ({ input }) => {
        const messages = await db.getRecentChatMessages(input.sinceId);
        // Return in chronological order (oldest first)
        return messages.reverse();
      }),
  }),

  // ============================================
  // MULTIPLAYER ROUTER
  // ============================================
  multiplayer: router({
    // Update player's online status and position (heartbeat)
    heartbeat: protectedProcedure
      .input(z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
        status: z.enum(["exploring", "combat", "dungeon", "shop", "idle"]).default("exploring"),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await getCharacterOrDemo(ctx.user.id);
        if (!character) {
          return { success: false };
        }
        
        await db.updatePlayerOnline({
          userId: ctx.user.id,
          characterId: character.id,
          characterName: character.name,
          characterClass: character.characterClass,
          characterLevel: character.level,
          latitude: input.latitude,
          longitude: input.longitude,
          status: input.status,
        });
        
        return { success: true };
      }),

    // Get nearby online players
    getNearbyPlayers: protectedProcedure
      .input(z.object({
        latitude: z.number().optional(),
        longitude: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        const players = await db.getOnlinePlayers(input.latitude, input.longitude);
        
        // Filter out the current user
        return players.filter(p => p.userId !== ctx.user.id).map(p => ({
          id: p.id,
          characterName: p.characterName,
          characterClass: p.characterClass,
          characterLevel: p.characterLevel,
          latitude: p.latitude ? parseFloat(p.latitude) : null,
          longitude: p.longitude ? parseFloat(p.longitude) : null,
          status: p.status,
        }));
      }),

    // Get total online player count
    getOnlineCount: publicProcedure
      .query(async () => {
        const count = await db.getOnlinePlayerCount();
        return { count };
      }),

    // Disconnect (called when leaving the game)
    disconnect: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.removePlayerOnline(ctx.user.id);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
