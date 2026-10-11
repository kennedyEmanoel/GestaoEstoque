PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_producao_ficha_diaria` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`data` text NOT NULL,
	`produto_id` integer NOT NULL,
	`etapa_id` integer NOT NULL,
	`variacao_id` integer,
	`meta_hora_padrao` integer DEFAULT 40 NOT NULL,
	`criado_em` integer NOT NULL,
	FOREIGN KEY (`produto_id`) REFERENCES `produtos`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`etapa_id`) REFERENCES `etapas`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`variacao_id`) REFERENCES `etapa_variacoes`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_producao_ficha_diaria`("id", "data", "produto_id", "etapa_id", "variacao_id", "meta_hora_padrao", "criado_em") SELECT "id", "data", "produto_id", "etapa_id", "variacao_id", "meta_hora_padrao", "criado_em" FROM `producao_ficha_diaria`;--> statement-breakpoint
DROP TABLE `producao_ficha_diaria`;--> statement-breakpoint
ALTER TABLE `__new_producao_ficha_diaria` RENAME TO `producao_ficha_diaria`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `idx_ficha_data_etapa` ON `producao_ficha_diaria` (`data`,`etapa_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_ficha_sem_variacao` ON `producao_ficha_diaria` (`data`,`produto_id`,`etapa_id`) WHERE "producao_ficha_diaria"."variacao_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_ficha_com_variacao` ON `producao_ficha_diaria` (`data`,`produto_id`,`etapa_id`,`variacao_id`) WHERE "producao_ficha_diaria"."variacao_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `__new_producao_operador_diario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`ficha_id` integer NOT NULL,
	`operador_id` integer NOT NULL,
	`ordem` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`ficha_id`) REFERENCES `producao_ficha_diaria`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`operador_id`) REFERENCES `operadores`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
INSERT INTO `__new_producao_operador_diario`("id", "ficha_id", "operador_id", "ordem") SELECT "id", "ficha_id", "operador_id", "ordem" FROM `producao_operador_diario`;--> statement-breakpoint
DROP TABLE `producao_operador_diario`;--> statement-breakpoint
ALTER TABLE `__new_producao_operador_diario` RENAME TO `producao_operador_diario`;--> statement-breakpoint
CREATE INDEX `idx_operador_ficha` ON `producao_operador_diario` (`ficha_id`);--> statement-breakpoint
CREATE INDEX `idx_operador_diario_operador` ON `producao_operador_diario` (`operador_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `producao_operador_diario_ficha_id_operador_id_unique` ON `producao_operador_diario` (`ficha_id`,`operador_id`);--> statement-breakpoint
-- Reconstrói producao_registro_horario (sem alterar colunas) para que bancos antigos e novos
-- terminem com exatamente a mesma estrutura física (a constraint UNIQUE inline legada vira índice nomeado).
CREATE TABLE `__new_producao_registro_horario` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`operador_diario_id` integer NOT NULL,
	`horario_bloco` text NOT NULL,
	`meta` integer DEFAULT 0 NOT NULL,
	`realizado` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`operador_diario_id`) REFERENCES `producao_operador_diario`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_producao_registro_horario`("id", "operador_diario_id", "horario_bloco", "meta", "realizado") SELECT "id", "operador_diario_id", "horario_bloco", "meta", "realizado" FROM `producao_registro_horario`;--> statement-breakpoint
DROP TABLE `producao_registro_horario`;--> statement-breakpoint
ALTER TABLE `__new_producao_registro_horario` RENAME TO `producao_registro_horario`;--> statement-breakpoint
CREATE INDEX `idx_registro_op` ON `producao_registro_horario` (`operador_diario_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `producao_registro_horario_operador_diario_id_horario_bloco_unique` ON `producao_registro_horario` (`operador_diario_id`,`horario_bloco`);
