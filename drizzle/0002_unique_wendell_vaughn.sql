CREATE TABLE `evidence` (
	`id` varchar(96) NOT NULL,
	`incidentId` varchar(80) NOT NULL,
	`userId` int NOT NULL,
	`type` enum('photo','audio','location_trail','input') NOT NULL,
	`fileRef` text,
	`capturedAt` timestamp NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`downloadCount` int NOT NULL DEFAULT 0,
	CONSTRAINT `evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `retentionSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`retentionDays` int NOT NULL DEFAULT 30,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `retentionSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `retentionSettings_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `emergencyContacts` MODIFY COLUMN `relationship` varchar(80) NOT NULL DEFAULT 'Trusted contact';--> statement-breakpoint
ALTER TABLE `emergencyIncidents` MODIFY COLUMN `deliveryStatus` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `emergencyContacts` ADD `source` enum('device_linked','manual') DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE `emergencyContacts` ADD `confirmed` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `resolvedDistrict` varchar(160);--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `resolvedTaluk` varchar(160);--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `resolvedVillage` varchar(160);--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `resolvedStreet` varchar(255);--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `contactsNotified` text;--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `locationLinkSent` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `emergencyIncidents` ADD `note` text;--> statement-breakpoint
ALTER TABLE `safetyProfiles` ADD `emergencyInputsEnabled` int DEFAULT 1 NOT NULL;