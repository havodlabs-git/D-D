import { describe, it, expect } from "vitest";
import { MONSTER_ABILITIES, getMonsterAbilities, rollDiceString, MonsterAbility } from "../shared/gameConstants";

describe("Monster AI System", () => {
  describe("MONSTER_ABILITIES", () => {
    it("should have abilities defined for common monsters", () => {
      const commonMonsters = ["goblin", "skeleton", "wolf", "rat", "zombie", "spider"];
      
      for (const monster of commonMonsters) {
        const abilities = MONSTER_ABILITIES[monster];
        expect(abilities).toBeDefined();
        expect(abilities.length).toBeGreaterThan(0);
      }
    });

    it("should have valid ability structure", () => {
      for (const [monsterType, abilities] of Object.entries(MONSTER_ABILITIES)) {
        for (const ability of abilities) {
          expect(ability.id).toBeDefined();
          expect(ability.name).toBeDefined();
          expect(ability.description).toBeDefined();
          expect(ability.type).toMatch(/^(attack|spell|buff|debuff|heal|special)$/);
          expect(ability.cooldown).toBeGreaterThanOrEqual(0);
          expect(ability.useChance).toBeGreaterThan(0);
          expect(ability.useChance).toBeLessThanOrEqual(1);
        }
      }
    });

    it("should have damage dice for attack abilities", () => {
      for (const [monsterType, abilities] of Object.entries(MONSTER_ABILITIES)) {
        const attackAbilities = abilities.filter(a => a.type === "attack" || a.type === "spell");
        for (const ability of attackAbilities) {
          if (ability.damage) {
            expect(ability.damage.dice).toMatch(/^\d+d\d+([+-]\d+)?$/);
            expect(ability.damage.type).toBeDefined();
          }
        }
      }
    });

    it("should have healing dice for heal abilities", () => {
      for (const [monsterType, abilities] of Object.entries(MONSTER_ABILITIES)) {
        const healAbilities = abilities.filter(a => a.type === "heal");
        for (const ability of healAbilities) {
          expect(ability.healing).toBeDefined();
          expect(ability.healing?.dice).toMatch(/^\d+d\d+([+-]\d+)?$/);
        }
      }
    });
  });

  describe("getMonsterAbilities", () => {
    it("should return abilities for exact match", () => {
      const abilities = getMonsterAbilities("goblin");
      expect(abilities.length).toBeGreaterThan(0);
      expect(abilities.some(a => a.id === "sneaky_stab")).toBe(true);
    });

    it("should return abilities for partial match", () => {
      const abilities = getMonsterAbilities("Goblin Archer");
      expect(abilities.length).toBeGreaterThan(0);
    });

    it("should handle Portuguese characters", () => {
      const abilities = getMonsterAbilities("Esqueleto");
      expect(abilities.length).toBeGreaterThan(0);
    });

    it("should return default ability for unknown monsters", () => {
      const abilities = getMonsterAbilities("Unknown Monster XYZ");
      expect(abilities.length).toBe(1);
      expect(abilities[0].id).toBe("basic_attack");
    });
  });

  describe("rollDiceString", () => {
    it("should roll dice correctly", () => {
      // Roll 1d6 multiple times and check range
      for (let i = 0; i < 100; i++) {
        const result = rollDiceString("1d6");
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(6);
      }
    });

    it("should handle multiple dice", () => {
      // Roll 2d6 multiple times and check range
      for (let i = 0; i < 100; i++) {
        const result = rollDiceString("2d6");
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(12);
      }
    });

    it("should handle modifiers", () => {
      // Roll 1d6+2 multiple times and check range
      for (let i = 0; i < 100; i++) {
        const result = rollDiceString("1d6+2");
        expect(result).toBeGreaterThanOrEqual(3);
        expect(result).toBeLessThanOrEqual(8);
      }
    });

    it("should handle negative modifiers", () => {
      // Roll 1d6-1 multiple times and check range
      for (let i = 0; i < 100; i++) {
        const result = rollDiceString("1d6-1");
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(5);
      }
    });

    it("should return 0 for invalid dice string", () => {
      expect(rollDiceString("invalid")).toBe(0);
      expect(rollDiceString("")).toBe(0);
    });
  });

  describe("Monster AI Logic", () => {
    it("should prioritize healing when HP is low", () => {
      const abilities = MONSTER_ABILITIES.troll;
      const healAbility = abilities.find(a => a.type === "heal");
      
      expect(healAbility).toBeDefined();
      // Troll regeneration should be usable frequently
      expect(healAbility?.cooldown).toBeLessThanOrEqual(3);
    });

    it("should have HP conditions for defensive abilities", () => {
      const goblinAbilities = MONSTER_ABILITIES.goblin;
      const retreatAbility = goblinAbilities.find(a => a.id === "goblin_retreat");
      
      expect(retreatAbility).toBeDefined();
      expect(retreatAbility?.maxHealth).toBeDefined();
      expect(retreatAbility?.maxHealth).toBeLessThanOrEqual(50);
    });

    it("should have varied cooldowns for abilities", () => {
      const dragonAbilities = MONSTER_ABILITIES.dragon_young;
      const cooldowns = dragonAbilities.map(a => a.cooldown);
      
      // Should have mix of short and long cooldowns
      expect(cooldowns.some(c => c <= 2)).toBe(true);
      expect(cooldowns.some(c => c >= 3)).toBe(true);
    });
  });

  describe("Ability Effects", () => {
    it("should have valid effect structure for debuffs", () => {
      for (const [monsterType, abilities] of Object.entries(MONSTER_ABILITIES)) {
        const debuffAbilities = abilities.filter(a => a.type === "debuff" || a.effect);
        for (const ability of debuffAbilities) {
          if (ability.effect) {
            expect(ability.effect.type).toBeDefined();
            // Duration can be 0 for instant effects like "split"
            expect(ability.effect.duration).toBeGreaterThanOrEqual(0);
            expect(typeof ability.effect.value).toBe("number");
          }
        }
      }
    });

    it("should have poison effects for venomous creatures", () => {
      const spiderAbilities = MONSTER_ABILITIES.spider_giant;
      const poisonAbility = spiderAbilities.find(a => 
        a.effect?.type === "poison" || a.damage?.type === "poison"
      );
      
      expect(poisonAbility).toBeDefined();
    });
  });
});
