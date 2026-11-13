CREATE TABLE `emergencyContacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(120) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`relationship` varchar(80) NOT NULL,
	`pushToken` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emergencyContacts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emergencyIncidents` (
	`id` varchar(80) NOT NULL,
	`userId` int NOT NULL,
	`triggerType` enum('manual','voice','shake') NOT NULL,
	`riskBand` enum('Low','Medium','High','Critical') NOT NULL,
	`riskScore` int NOT NULL,
	`latitude` varchar(32),
	`longitude` varchar(32),
	`accuracyMeters` int,
	`deliveryStatus` varchar(48) NOT NULL,
	`occurredAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emergencyIncidents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `safetyProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`phone` varchar(32),
	`audioRecordingEnabled` int NOT NULL DEFAULT 0,
	`photoCaptureEnabled` int NOT NULL DEFAULT 0,
	`liveLocationEnabled` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `safetyProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `safetyProfiles_userId_unique` UNIQUE(`userId`)
);
