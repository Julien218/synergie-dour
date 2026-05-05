CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int,
	`eventType` varchar(100) NOT NULL,
	`payload` text NOT NULL,
	`triggeredBy` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `memberships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`merchantId` int,
	`paymentMode` enum('one_time','subscription') NOT NULL,
	`status` enum('pending_payment','active','expired','cancelled') NOT NULL DEFAULT 'pending_payment',
	`stripeCustomerId` varchar(100),
	`stripeSubscriptionId` varchar(100),
	`stripePaymentIntentId` varchar(100),
	`startsAt` timestamp,
	`expiresAt` timestamp,
	`amountCents` int NOT NULL DEFAULT 5000,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `memberships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`membershipId` int,
	`userId` int,
	`stripeEventId` varchar(100) NOT NULL,
	`stripePaymentIntentId` varchar(100),
	`stripeInvoiceId` varchar(100),
	`amountCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'EUR',
	`feeJsInnovCents` int NOT NULL DEFAULT 150,
	`netToAsblCents` int NOT NULL,
	`status` enum('succeeded','refunded','failed') NOT NULL,
	`paymentMethod` varchar(50),
	`paidAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_stripeEventId_unique` UNIQUE(`stripeEventId`)
);
--> statement-breakpoint
CREATE TABLE `pending_changes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`resourceId` int NOT NULL,
	`kind` enum('minor','major') NOT NULL,
	`proposal` text NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewNote` text,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pending_changes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(200) NOT NULL,
	`title` varchar(255) NOT NULL,
	`summary` varchar(500) NOT NULL,
	`category` enum('starter','gestion','developpement','difficulte') NOT NULL,
	`tags` json NOT NULL,
	`verifiedAt` varchar(10) NOT NULL,
	`content` text NOT NULL,
	`links` json NOT NULL,
	`localContacts` json,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'published',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resources_id` PRIMARY KEY(`id`),
	CONSTRAINT `resources_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_triggeredBy_users_id_fk` FOREIGN KEY (`triggeredBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `memberships` ADD CONSTRAINT `memberships_merchantId_merchants_id_fk` FOREIGN KEY (`merchantId`) REFERENCES `merchants`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_membershipId_memberships_id_fk` FOREIGN KEY (`membershipId`) REFERENCES `memberships`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_changes` ADD CONSTRAINT `pending_changes_resourceId_resources_id_fk` FOREIGN KEY (`resourceId`) REFERENCES `resources`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `pending_changes` ADD CONSTRAINT `pending_changes_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;