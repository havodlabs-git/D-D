CREATE TABLE `castles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`castleType` enum('fortress','palace','ruins','tower','keep','citadel') NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`faction` varchar(100),
	`isHostile` boolean NOT NULL DEFAULT false,
	`hasDungeon` boolean NOT NULL DEFAULT false,
	`dungeonLevels` int NOT NULL DEFAULT 0,
	`bossId` int,
	`conquestReward` json,
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `castles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `character_spells` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`spellId` varchar(100) NOT NULL,
	`isPrepared` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `character_spells_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guild_membership` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`guildId` int NOT NULL,
	`rank` enum('initiate','member','veteran','officer','master') NOT NULL DEFAULT 'initiate',
	`reputation` int NOT NULL DEFAULT 0,
	`joinedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guild_membership_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guilds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`description` text,
	`guildType` enum('adventurers','mages','warriors','thieves','merchants','crafters') NOT NULL,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`benefits` json,
	`levelRequired` int NOT NULL DEFAULT 1,
	`goldRequired` int NOT NULL DEFAULT 100,
	`iconUrl` varchar(500),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `guilds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spell_slots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`level1Current` int NOT NULL DEFAULT 0,
	`level1Max` int NOT NULL DEFAULT 0,
	`level2Current` int NOT NULL DEFAULT 0,
	`level2Max` int NOT NULL DEFAULT 0,
	`level3Current` int NOT NULL DEFAULT 0,
	`level3Max` int NOT NULL DEFAULT 0,
	`level4Current` int NOT NULL DEFAULT 0,
	`level4Max` int NOT NULL DEFAULT 0,
	`level5Current` int NOT NULL DEFAULT 0,
	`level5Max` int NOT NULL DEFAULT 0,
	`level6Current` int NOT NULL DEFAULT 0,
	`level6Max` int NOT NULL DEFAULT 0,
	`level7Current` int NOT NULL DEFAULT 0,
	`level7Max` int NOT NULL DEFAULT 0,
	`level8Current` int NOT NULL DEFAULT 0,
	`level8Max` int NOT NULL DEFAULT 0,
	`level9Current` int NOT NULL DEFAULT 0,
	`level9Max` int NOT NULL DEFAULT 0,
	`lastRestAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `spell_slots_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `visited_pois` (
	`id` int AUTO_INCREMENT NOT NULL,
	`characterId` int NOT NULL,
	`poiHash` varchar(64) NOT NULL,
	`poiType` varchar(50) NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`interactionType` enum('defeated','collected','visited','completed','purchased') NOT NULL,
	`respawnAt` timestamp,
	`canRespawn` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `visited_pois_id` PRIMARY KEY(`id`)
);
