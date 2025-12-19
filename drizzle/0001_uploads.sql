CREATE TABLE `uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`size` integer NOT NULL,
	`mime_type` text,
	`uploaded_at` text NOT NULL,
	`content` text NOT NULL
);
