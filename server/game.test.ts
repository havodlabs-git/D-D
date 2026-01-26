import { describe, expect, it } from "vitest";
import { 
  rollDie,
  rollDice, 
  getAttributeModifier, 
  calculateDamage, 
  getXpForLevel,
  calculateDistance,
  getLocationSeed,
  seededRandom,
  pickRandom
} from "../shared/gameUtils";
import { 
  CHARACTER_CLASSES, 
  ATTRIBUTES, 
  RARITIES,
  BIOMES,
  MONSTER_TIERS
} from "../shared/gameConstants";

describe("Game Utilities", () => {
  describe("rollDie", () => {
    it("should roll a d20 within valid range", () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDie("d20");
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(20);
      }
    });

    it("should roll a d6 within valid range", () => {
      for (let i = 0; i < 100; i++) {
        const roll = rollDie("d6");
        expect(roll).toBeGreaterThanOrEqual(1);
        expect(roll).toBeLessThanOrEqual(6);
      }
    });
  });

  describe("rollDice", () => {
    it("should handle multiple dice rolls", () => {
      const result = rollDice("d6", 3);
      expect(result.total).toBeGreaterThanOrEqual(3);
      expect(result.total).toBeLessThanOrEqual(18);
      expect(result.rolls).toHaveLength(3);
    });

    it("should return individual rolls", () => {
      const result = rollDice("d20", 2);
      expect(result.rolls.every(r => r >= 1 && r <= 20)).toBe(true);
    });
  });

  describe("getAttributeModifier", () => {
    it("should calculate correct modifier for attribute 10", () => {
      expect(getAttributeModifier(10)).toBe(0);
    });

    it("should calculate correct modifier for attribute 18", () => {
      expect(getAttributeModifier(18)).toBe(4);
    });

    it("should calculate correct modifier for attribute 8", () => {
      expect(getAttributeModifier(8)).toBe(-1);
    });

    it("should calculate correct modifier for attribute 1", () => {
      expect(getAttributeModifier(1)).toBe(-5);
    });

    it("should calculate correct modifier for attribute 20", () => {
      expect(getAttributeModifier(20)).toBe(5);
    });
  });

  describe("calculateDamage", () => {
    it("should calculate base damage with modifier", () => {
      const damage = calculateDamage(10, 2, false);
      expect(damage).toBe(12);
    });

    it("should apply critical hit multiplier", () => {
      const damage = calculateDamage(10, 2, true);
      expect(damage).toBe(24); // (10 + 2) * 2
    });

    it("should never return less than 1", () => {
      const damage = calculateDamage(1, -5, false);
      expect(damage).toBeGreaterThanOrEqual(1);
    });
  });

  describe("getXpForLevel", () => {
    it("should return 0 XP for level 1", () => {
      expect(getXpForLevel(1)).toBe(0);
    });

    it("should return correct XP for level 2", () => {
      expect(getXpForLevel(2)).toBe(300);
    });

    it("should return increasing XP for higher levels", () => {
      const xp5 = getXpForLevel(5);
      const xp10 = getXpForLevel(10);
      expect(xp10).toBeGreaterThan(xp5);
    });

    it("should handle invalid levels", () => {
      expect(getXpForLevel(0)).toBe(0);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate distance between two points", () => {
      // Distance from NYC to LA is approximately 3,940 km
      const distance = calculateDistance(40.7128, -74.0060, 34.0522, -118.2437);
      expect(distance).toBeGreaterThan(3900000); // 3900 km in meters
      expect(distance).toBeLessThan(4000000); // 4000 km in meters
    });

    it("should return 0 for same coordinates", () => {
      const distance = calculateDistance(51.5074, -0.1278, 51.5074, -0.1278);
      expect(distance).toBe(0);
    });
  });

  describe("getLocationSeed", () => {
    it("should generate deterministic seed for same coordinates", () => {
      const seed1 = getLocationSeed(40.7128, -74.0060);
      const seed2 = getLocationSeed(40.7128, -74.0060);
      expect(seed1).toBe(seed2);
    });

    it("should generate different seeds for different coordinates", () => {
      const seed1 = getLocationSeed(40.7128, -74.0060);
      const seed2 = getLocationSeed(51.5074, -0.1278);
      expect(seed1).not.toBe(seed2);
    });
  });

  describe("seededRandom", () => {
    it("should generate deterministic sequence", () => {
      const rng1 = seededRandom(12345);
      const rng2 = seededRandom(12345);
      
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
      expect(rng1()).toBe(rng2());
    });

    it("should generate values between 0 and 1", () => {
      const rng = seededRandom(42);
      for (let i = 0; i < 100; i++) {
        const value = rng();
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });
  });

  describe("pickRandom", () => {
    it("should pick item from array", () => {
      const items = ["a", "b", "c", "d"];
      const picked = pickRandom(items);
      expect(items).toContain(picked);
    });

    it("should be deterministic with seed", () => {
      const items = ["a", "b", "c", "d", "e"];
      const picked1 = pickRandom(items, 12345);
      const picked2 = pickRandom(items, 12345);
      expect(picked1).toBe(picked2);
    });
  });
});

describe("Game Constants", () => {
  describe("CHARACTER_CLASSES", () => {
    it("should have 8 character classes", () => {
      expect(Object.keys(CHARACTER_CLASSES)).toHaveLength(8);
    });

    it("should have valid base stats for each class", () => {
      Object.values(CHARACTER_CLASSES).forEach((cls) => {
        expect(cls.baseStats.strength).toBeGreaterThanOrEqual(8);
        expect(cls.baseStats.strength).toBeLessThanOrEqual(18);
        expect(cls.baseStats.dexterity).toBeGreaterThanOrEqual(8);
        expect(cls.baseStats.constitution).toBeGreaterThanOrEqual(8);
        expect(cls.baseStats.intelligence).toBeGreaterThanOrEqual(8);
        expect(cls.baseStats.wisdom).toBeGreaterThanOrEqual(8);
        expect(cls.baseStats.charisma).toBeGreaterThanOrEqual(8);
      });
    });

    it("should have health and mana per level", () => {
      Object.values(CHARACTER_CLASSES).forEach((cls) => {
        expect(cls.healthPerLevel).toBeGreaterThan(0);
        expect(cls.manaPerLevel).toBeGreaterThanOrEqual(0);
      });
    });

    it("should have name and description", () => {
      Object.values(CHARACTER_CLASSES).forEach((cls) => {
        expect(cls.name).toBeDefined();
        expect(cls.name.length).toBeGreaterThan(0);
        expect(cls.description).toBeDefined();
      });
    });
  });

  describe("ATTRIBUTES", () => {
    it("should have 6 attributes", () => {
      expect(Object.keys(ATTRIBUTES)).toHaveLength(6);
    });

    it("should have abbreviations for each attribute", () => {
      Object.values(ATTRIBUTES).forEach((attr) => {
        expect(attr.abbr).toBeDefined();
        expect(attr.abbr.length).toBeLessThanOrEqual(3);
      });
    });

    it("should include all D&D attributes", () => {
      const keys = Object.keys(ATTRIBUTES);
      expect(keys).toContain("strength");
      expect(keys).toContain("dexterity");
      expect(keys).toContain("constitution");
      expect(keys).toContain("intelligence");
      expect(keys).toContain("wisdom");
      expect(keys).toContain("charisma");
    });
  });

  describe("RARITIES", () => {
    it("should have 5 rarity levels", () => {
      expect(Object.keys(RARITIES)).toHaveLength(5);
    });

    it("should have increasing multipliers", () => {
      const rarityOrder = ["common", "uncommon", "rare", "epic", "legendary"];
      for (let i = 1; i < rarityOrder.length; i++) {
        const prev = RARITIES[rarityOrder[i - 1] as keyof typeof RARITIES];
        const curr = RARITIES[rarityOrder[i] as keyof typeof RARITIES];
        expect(curr.multiplier).toBeGreaterThan(prev.multiplier);
      }
    });

    it("should have colors for each rarity", () => {
      Object.values(RARITIES).forEach((rarity) => {
        expect(rarity.color).toBeDefined();
      });
    });
  });

  describe("BIOMES", () => {
    it("should have multiple biomes", () => {
      expect(Object.keys(BIOMES).length).toBeGreaterThan(0);
    });

    it("should have icons for each biome", () => {
      Object.values(BIOMES).forEach((biome) => {
        expect(biome.icon).toBeDefined();
      });
    });

    it("should have names for each biome", () => {
      Object.values(BIOMES).forEach((biome) => {
        expect(biome.name).toBeDefined();
        expect(biome.name.length).toBeGreaterThan(0);
      });
    });
  });

  describe("MONSTER_TIERS", () => {
    it("should have multiple tiers", () => {
      expect(Object.keys(MONSTER_TIERS).length).toBeGreaterThan(0);
    });

    it("should have health multipliers", () => {
      Object.values(MONSTER_TIERS).forEach((tier) => {
        expect(tier.healthMultiplier).toBeDefined();
        expect(tier.healthMultiplier).toBeGreaterThan(0);
      });
    });

    it("should have damage multipliers", () => {
      Object.values(MONSTER_TIERS).forEach((tier) => {
        expect(tier.damageMultiplier).toBeDefined();
        expect(tier.damageMultiplier).toBeGreaterThan(0);
      });
    });

    it("should have reward multipliers", () => {
      Object.values(MONSTER_TIERS).forEach((tier) => {
        expect(tier.rewardMultiplier).toBeDefined();
        expect(tier.rewardMultiplier).toBeGreaterThan(0);
      });
    });
  });
});
