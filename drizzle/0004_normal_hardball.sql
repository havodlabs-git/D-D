CREATE TABLE `dungeon_progress` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`dungeonId` int NOT NULL,
	`currentFloor` int NOT NULL DEFAULT 1,
	`currentRoom` int NOT NULL DEFAULT 1,
	`status` enum('in_progress','completed','failed','abandoned') NOT NULL DEFAULT 'in_progress',
	`monstersKilled` int NOT NULL DEFAULT 0,
	`treasuresFound` int NOT NULL DEFAULT 0,
	`trapsTriggered` int NOT NULL DEFAULT 0,
	`healthAtStart` int NOT NULL,
	`manaAtStart` int NOT NULL,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	CONSTRAINT `dungeon_progress_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dungeons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`dungeonType` enum('cave','crypt','tower','ruins','castle','temple','mine','sewer') NOT NULL,
	`difficulty` enum('easy','normal','hard','nightmare') NOT NULL DEFAULT 'normal',
	`totalFloors` int NOT NULL DEFAULT 3,
	`levelRequired` int NOT NULL DEFAULT 1,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`bossName` varchar(100),
	`bossType` varchar(50),
	`bossLevel` int NOT NULL DEFAULT 5,
	`rewards` json,
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dungeons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `characters` ADD `subclass` varchar(64);--> statement-breakpoint
ALTER TABLE `characters` ADD `knownSpells` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `preparedSpells` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `usedSpellSlots` text;