CREATE TABLE `online_players` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`characterId` int NOT NULL,
	`characterName` varchar(100) NOT NULL,
	`characterClass` varchar(50) NOT NULL,
	`characterLevel` int NOT NULL DEFAULT 1,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`status` enum('exploring','combat','dungeon','shop','idle') NOT NULL DEFAULT 'exploring',
	`lastHeartbeat` timestamp NOT NULL DEFAULT (now()),
	`connectedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `online_players_id` PRIMARY KEY(`id`),
	CONSTRAINT `online_players_userId_unique` UNIQUE(`userId`)
);
