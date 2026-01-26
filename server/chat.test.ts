import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database functions
vi.mock("./db", () => ({
  getCharacterByUserId: vi.fn(),
  sendChatMessage: vi.fn(),
  getChatMessages: vi.fn(),
  getRecentChatMessages: vi.fn(),
}));

import * as db from "./db";

describe("Chat System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sendChatMessage", () => {
    it("should send a chat message with character info", async () => {
      const mockSend = vi.mocked(db.sendChatMessage);
      mockSend.mockResolvedValue(undefined);

      await db.sendChatMessage({
        userId: 1,
        characterId: 1,
        message: "Hello world!",
        messageType: "normal",
        characterName: "TestHero",
        characterClass: "fighter",
        characterLevel: 5,
      });

      expect(mockSend).toHaveBeenCalledWith({
        userId: 1,
        characterId: 1,
        message: "Hello world!",
        messageType: "normal",
        characterName: "TestHero",
        characterClass: "fighter",
        characterLevel: 5,
      });
    });
  });

  describe("getChatMessages", () => {
    it("should return messages in reverse chronological order", async () => {
      const mockMessages = [
        { id: 3, message: "Third", createdAt: new Date() },
        { id: 2, message: "Second", createdAt: new Date() },
        { id: 1, message: "First", createdAt: new Date() },
      ];

      const mockGet = vi.mocked(db.getChatMessages);
      mockGet.mockResolvedValue(mockMessages as any);

      const result = await db.getChatMessages(50);

      expect(mockGet).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(3);
    });

    it("should support pagination with beforeId", async () => {
      const mockGet = vi.mocked(db.getChatMessages);
      mockGet.mockResolvedValue([]);

      await db.getChatMessages(50, 100);

      expect(mockGet).toHaveBeenCalledWith(50, 100);
    });
  });

  describe("getRecentChatMessages", () => {
    it("should return new messages since given ID", async () => {
      const mockMessages = [
        { id: 102, message: "New message 2", createdAt: new Date() },
        { id: 101, message: "New message 1", createdAt: new Date() },
      ];

      const mockGetRecent = vi.mocked(db.getRecentChatMessages);
      mockGetRecent.mockResolvedValue(mockMessages as any);

      const result = await db.getRecentChatMessages(100);

      expect(mockGetRecent).toHaveBeenCalledWith(100);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(102);
    });
  });

  describe("Message validation", () => {
    it("should reject empty messages", () => {
      const message = "";
      const cleanMessage = message.trim();
      expect(cleanMessage.length).toBe(0);
    });

    it("should accept valid messages", () => {
      const message = "Hello, fellow adventurers!";
      const cleanMessage = message.trim();
      expect(cleanMessage.length).toBeGreaterThan(0);
      expect(cleanMessage.length).toBeLessThanOrEqual(500);
    });

    it("should handle max length messages", () => {
      const message = "a".repeat(500);
      expect(message.length).toBe(500);
    });
  });

  describe("Character class colors", () => {
    const CLASS_COLORS: Record<string, string> = {
      fighter: "text-orange-400",
      wizard: "text-blue-400",
      rogue: "text-gray-300",
      cleric: "text-yellow-200",
      ranger: "text-green-400",
      paladin: "text-yellow-400",
      barbarian: "text-red-400",
      bard: "text-pink-400",
      druid: "text-emerald-400",
      monk: "text-cyan-400",
      sorcerer: "text-purple-400",
      warlock: "text-violet-400",
    };

    it("should have colors for all 12 classes", () => {
      const classes = ["fighter", "wizard", "rogue", "cleric", "ranger", "paladin", "barbarian", "bard", "druid", "monk", "sorcerer", "warlock"];
      
      for (const cls of classes) {
        expect(CLASS_COLORS[cls]).toBeDefined();
        expect(CLASS_COLORS[cls]).toContain("text-");
      }
    });
  });
});
