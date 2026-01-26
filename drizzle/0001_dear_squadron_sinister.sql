CREATE TABLE `character_quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`questId` int NOT NULL,
	`status` enum('active','completed','failed') NOT NULL DEFAULT 'active',
	`progress` json,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `character_quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`characterClass` enum('warrior','mage','rogue','cleric','ranger','paladin','barbarian','bard') NOT NULL,
	`level` int NOT NULL DEFAULT 1,
	`experience` int NOT NULL DEFAULT 0,
	`experienceToNextLevel` int NOT NULL DEFAULT 100,
	`strength` int NOT NULL DEFAULT 10,
	`dexterity` int NOT NULL DEFAULT 10,
	`constitution` int NOT NULL DEFAULT 10,
	`intelligence` int NOT NULL DEFAULT 10,
	`wisdom` int NOT NULL DEFAULT 10,
	`charisma` int NOT NULL DEFAULT 10,
	`maxHealth` int NOT NULL DEFAULT 100,
	`currentHealth` int NOT NULL DEFAULT 100,
	`maxMana` int NOT NULL DEFAULT 50,
	`currentMana` int NOT NULL DEFAULT 50,
	`armorClass` int NOT NULL DEFAULT 10,
	`gold` int NOT NULL DEFAULT 100,
	`lastLatitude` decimal(10,7),
	`lastLongitude` decimal(10,7),
	`availableStatPoints` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `characters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `combat_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`monsterId` int NOT NULL,
	`result` enum('victory','defeat','fled') NOT NULL,
	`damageDealt` int NOT NULL DEFAULT 0,
	`damageTaken` int NOT NULL DEFAULT 0,
	`turnsCount` int NOT NULL DEFAULT 0,
	`experienceEarned` int NOT NULL DEFAULT 0,
	`goldEarned` int NOT NULL DEFAULT 0,
	`lootEarned` json,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `combat_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`itemId` int NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`isEquipped` boolean NOT NULL DEFAULT false,
	`equipSlot` enum('weapon','armor','helmet','boots','gloves','ring1','ring2','amulet'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`itemType` enum('weapon','armor','helmet','boots','gloves','ring','amulet','potion','scroll','material','quest_item') NOT NULL,
	`rarity` enum('common','uncommon','rare','epic','legendary') NOT NULL DEFAULT 'common',
	`statBonuses` json,
	`damageMin` int,
	`damageMax` int,
	`armorValue` int,
	`healAmount` int,
	`manaAmount` int,
	`buyPrice` int NOT NULL DEFAULT 10,
	`sellPrice` int NOT NULL DEFAULT 5,
	`levelRequired` int NOT NULL DEFAULT 1,
	`classRequired` varchar(50),
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monsters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`monsterType` enum('beast','undead','demon','dragon','elemental','humanoid','construct','aberration') NOT NULL,
	`tier` enum('common','elite','boss','legendary') NOT NULL DEFAULT 'common',
	`baseLevel` int NOT NULL DEFAULT 1,
	`health` int NOT NULL DEFAULT 50,
	`damage` int NOT NULL DEFAULT 10,
	`armor` int NOT NULL DEFAULT 5,
	`experienceReward` int NOT NULL DEFAULT 25,
	`goldReward` int NOT NULL DEFAULT 10,
	`lootTable` json,
	`biomeType` enum('urban','forest','water','mountain','desert','plains'),
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `monsters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `npcs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`title` varchar(100),
	`description` text,
	`npcType` enum('merchant','blacksmith','alchemist','quest_giver','trainer','innkeeper') NOT NULL,
	`greeting` text,
	`farewell` text,
	`shopInventory` json,
	`biomeType` enum('urban','forest','water','mountain','desert','plains'),
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `npcs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`description` text,
	`questType` enum('kill','collect','explore','escort','deliver','boss') NOT NULL,
	`objectives` json,
	`levelRequired` int NOT NULL DEFAULT 1,
	`experienceReward` int NOT NULL DEFAULT 50,
	`goldReward` int NOT NULL DEFAULT 25,
	`itemRewards` json,
	`biomeType` enum('urban','forest','water','mountain','desert','plains'),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `world_locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`locationType` enum('monster_spawn','npc_location','shop','dungeon','treasure','quest_marker') NOT NULL,
	`referenceId` int,
	`referenceType` varchar(50),
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`name` varchar(200),
	`biomeType` enum('urban','forest','water','mountain','desert','plains') NOT NULL DEFAULT 'urban',
	`isActive` boolean NOT NULL DEFAULT true,
	`respawnAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `world_locations_id` PRIMARY KEY(`id`)
);
