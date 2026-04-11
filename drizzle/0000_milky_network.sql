CREATE TABLE `box` (
	`id` text PRIMARY KEY NOT NULL,
	`model` text,
	`amount` integer DEFAULT 0 NOT NULL,
	`etapa` text NOT NULL,
	`location` text DEFAULT 'Estoque',
	`weight` real NOT NULL,
	`operator` text,
	`description` text,
	`date` integer
);
