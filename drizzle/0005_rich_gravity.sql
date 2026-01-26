ALTER TABLE `characters` ADD `isDead` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `deathTimestamp` timestamp;--> statement-breakpoint
ALTER TABLE `characters` ADD `deathCause` varchar(255);--> statement-breakpoint
ALTER TABLE `characters` ADD `movesUsedThisHour` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `characters` ADD `lastMoveResetTime` timestamp DEFAULT (now()) NOT NULL;