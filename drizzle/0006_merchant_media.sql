ALTER TABLE `merchants` ADD COLUMN `photos` json;
--> statement-breakpoint
ALTER TABLE `merchants` ADD COLUMN `videos` json;
--> statement-breakpoint
ALTER TABLE `merchants` MODIFY COLUMN `logo` varchar(500);
