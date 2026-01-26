CREATE TABLE `global_chat` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`characterId` int,
	`message` text NOT NULL,
	`messageType` enum('normal','system','announcement','whisper','guild','trade') NOT NULL DEFAULT 'normal',
	`characterName` varchar(100),
	`characterClass` varchar(50),
	`characterLevel` int,
	`targetUserId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `global_chat_id` PRIMARY KEY(`id`)
);
