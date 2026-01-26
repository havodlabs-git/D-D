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
} from "../shared/gameUtils";
import type { CharacterClass, BiomeType, MonsterTier } from "../shared/gameConstants";

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
      const character = await db.getCharacterByUserId(ctx.user.id);
      return character;
    }),

    // Create new character
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(2).max(50),
        characterClass: z.enum(["warrior", "mage", "rogue", "cleric", "ranger", "paladin", "barbarian", "bard"]),
      }))
      .mutation(async ({ ctx, input }) => {
        // Check if user already has a character
        const existing = await db.getCharacterByUserId(ctx.user.id);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você já possui um personagem" });
        }

        const character = await db.createCharacter(ctx.user.id, input.name, input.characterClass);
        
        // Give starting items
        if (character) {
          // Starting weapon based on class
          const startingWeapons: Record<CharacterClass, number> = {
            warrior: 1, mage: 2, rogue: 3, cleric: 4, ranger: 5, paladin: 6, barbarian: 7, bard: 8
          };
          // Note: These item IDs would need to be seeded in the database
        }

        return character;
      }),

    // Update character location
    updateLocation: protectedProcedure
      .input(z.object({
        latitude: z.number(),
        longitude: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
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
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const success = await db.allocateStatPoint(character.id, input.attribute);
        if (!success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não foi possível alocar o ponto" });
        }

        return await db.getCharacterByUserId(ctx.user.id);
      }),

    // Rest (heal and restore mana)
    rest: protectedProcedure.mutation(async ({ ctx }) => {
      const character = await db.getCharacterByUserId(ctx.user.id);
      if (!character) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
      }

      // Restore 25% of max health and mana
      const healthRestore = Math.floor(character.maxHealth * 0.25);
      const manaRestore = Math.floor(character.maxMana * 0.25);

      await db.healCharacter(character.id, healthRestore);
      await db.restoreMana(character.id, manaRestore);

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
  }),

  // ============================================
  // INVENTORY ROUTER
  // ============================================
  inventory: router({
    // Get inventory
    get: protectedProcedure.query(async ({ ctx }) => {
      const character = await db.getCharacterByUserId(ctx.user.id);
      if (!character) return [];

      return await db.getCharacterInventory(character.id);
    }),

    // Get equipped items
    getEquipped: protectedProcedure.query(async ({ ctx }) => {
      const character = await db.getCharacterByUserId(ctx.user.id);
      if (!character) return [];

      return await db.getEquippedItems(character.id);
    }),

    // Equip item
    equip: protectedProcedure
      .input(z.object({
        inventoryId: z.number(),
        slot: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        await db.equipItem(character.id, input.inventoryId, input.slot);
        return { success: true };
      }),

    // Unequip item
    unequip: protectedProcedure
      .input(z.object({ inventoryId: z.number() }))
      .mutation(async ({ input }) => {
        await db.unequipItem(input.inventoryId);
        return { success: true };
      }),

    // Use consumable
    useItem: protectedProcedure
      .input(z.object({ inventoryId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const inventory = await db.getCharacterInventory(character.id);
        const invItem = inventory.find(i => i.inventory.id === input.inventoryId);
        
        if (!invItem) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        }

        const item = invItem.item;
        
        if (item.itemType !== "potion" && item.itemType !== "scroll") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Este item não pode ser usado" });
        }

        // Apply effects
        if (item.healAmount) {
          await db.healCharacter(character.id, item.healAmount);
        }
        if (item.manaAmount) {
          await db.restoreMana(character.id, item.manaAmount);
        }

        // Remove item from inventory
        await db.removeItemFromInventory(character.id, item.id, 1);

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
        const character = await db.getCharacterByUserId(ctx.user.id);
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
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
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

        if (newMonsterHealth <= 0) {
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

            // Log combat
            await db.createCombatLog({
              characterId: character.id,
              monsterId: input.monsterId,
              result: "victory",
              damageDealt: playerDamage,
              damageTaken: monsterDamage,
              turnsCount: 1,
              experienceEarned: rewards.experience,
              goldEarned: rewards.gold,
            });

            rewards = { ...rewards, leveledUp: levelResult.leveledUp, newLevel: levelResult.newLevel };
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
        const character = await db.getCharacterByUserId(ctx.user.id);
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
        const character = await db.getCharacterByUserId(ctx.user.id);
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
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        await db.addGold(character.id, input.goldAmount);
        
        return {
          goldCollected: input.goldAmount,
          newGold: character.gold + input.goldAmount,
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
        const npc = await db.getNpcById(input.npcId);
        if (!npc) return [];

        const shopItems = npc.shopInventory || [];
        const items = [];

        for (const shopItem of shopItems) {
          const item = await db.getItemById(shopItem.itemId);
          if (item) {
            items.push({
              item,
              stock: shopItem.stock,
            });
          }
        }

        return items;
      }),

    // Buy item
    buy: protectedProcedure
      .input(z.object({
        itemId: z.number(),
        quantity: z.number().min(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const item = await db.getItemById(input.itemId);
        if (!item) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Item não encontrado" });
        }

        const totalCost = item.buyPrice * input.quantity;
        
        if (character.gold < totalCost) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Ouro insuficiente" });
        }

        const success = await db.spendGold(character.id, totalCost);
        if (!success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Falha ao comprar item" });
        }

        await db.addItemToInventory(character.id, input.itemId, input.quantity);

        return {
          itemName: item.name,
          quantity: input.quantity,
          totalCost,
          newGold: character.gold - totalCost,
        };
      }),

    // Sell item
    sell: protectedProcedure
      .input(z.object({
        inventoryId: z.number(),
        quantity: z.number().min(1).default(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
        if (!character) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Personagem não encontrado" });
        }

        const inventory = await db.getCharacterInventory(character.id);
        const invItem = inventory.find(i => i.inventory.id === input.inventoryId);

        if (!invItem || invItem.inventory.quantity < input.quantity) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Quantidade insuficiente" });
        }

        const totalValue = invItem.item.sellPrice * input.quantity;
        
        await db.removeItemFromInventory(character.id, invItem.item.id, input.quantity);
        await db.addGold(character.id, totalValue);

        return {
          itemName: invItem.item.name,
          quantity: input.quantity,
          totalValue,
          newGold: character.gold + totalValue,
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
      const character = await db.getCharacterByUserId(ctx.user.id);
      if (!character) return [];

      return await db.getCharacterQuests(character.id);
    }),

    // Accept quest
    accept: protectedProcedure
      .input(z.object({ questId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const character = await db.getCharacterByUserId(ctx.user.id);
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
});

export type AppRouter = typeof appRouter;
