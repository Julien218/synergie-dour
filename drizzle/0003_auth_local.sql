ALTER TABLE `users` ADD COLUMN `passwordHash` varchar(255);
ALTER TABLE `users` ADD COLUMN `emailVerifiedAt` timestamp;
