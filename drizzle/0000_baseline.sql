CREATE TABLE IF NOT EXISTS `producao_ficha_diaria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`produto` text NOT NULL,
	`etapa` text NOT NULL,
	`meta_hora_padrao` integer DEFAULT 40 NOT NULL,
	`criado_em` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_ficha_data_etapa` ON `producao_ficha_diaria` (`data`,`etapa`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `producao_ficha_diaria_data_etapa_produto_unique` ON `producao_ficha_diaria` (`data`,`etapa`,`produto`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `producao_operador_diario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ficha_id` integer NOT NULL,
	`operador_nome` text NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`ficha_id`) REFERENCES `producao_ficha_diaria`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_operador_ficha` ON `producao_operador_diario` (`ficha_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `producao_operador_diario_ficha_id_operador_nome_unique` ON `producao_operador_diario` (`ficha_id`,`operador_nome`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `producao_registro_horario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operador_diario_id` integer NOT NULL,
	`horario_bloco` text NOT NULL,
	`meta` integer DEFAULT 0 NOT NULL,
	`realizado` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`operador_diario_id`) REFERENCES `producao_operador_diario`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_registro_op` ON `producao_registro_horario` (`operador_diario_id`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `producao_registro_horario_operador_diario_id_horario_bloco_unique` ON `producao_registro_horario` (`operador_diario_id`,`horario_bloco`);