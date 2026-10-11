CREATE TABLE `operadores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_operadores_nome` ON `operadores` (lower("nome"));--> statement-breakpoint
CREATE TABLE `produtos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`versao` text DEFAULT '' NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_produtos_nome_versao` ON `produtos` (lower("nome"),lower("versao"));--> statement-breakpoint
CREATE TABLE `etapas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nome` text NOT NULL,
	`descricao` text,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_etapas_nome` ON `etapas` (lower("nome"));--> statement-breakpoint
CREATE TABLE `etapa_variacoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`etapa_id` integer NOT NULL,
	`nome` text NOT NULL,
	`ativo` integer DEFAULT true NOT NULL,
	`criado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`atualizado_em` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`etapa_id`) REFERENCES `etapas`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_variacoes_etapa` ON `etapa_variacoes` (`etapa_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_variacoes_etapa_nome` ON `etapa_variacoes` (`etapa_id`,lower("nome"));--> statement-breakpoint
ALTER TABLE `producao_ficha_diaria` ADD `produto_id` integer REFERENCES produtos(id);--> statement-breakpoint
ALTER TABLE `producao_ficha_diaria` ADD `etapa_id` integer REFERENCES etapas(id);--> statement-breakpoint
ALTER TABLE `producao_ficha_diaria` ADD `variacao_id` integer REFERENCES etapa_variacoes(id);--> statement-breakpoint
ALTER TABLE `producao_operador_diario` ADD `operador_id` integer REFERENCES operadores(id);--> statement-breakpoint

-- ─── Dados: etapas e variações padrão do processo ────────────────────────────
INSERT INTO `etapas` (`nome`) VALUES ('Montagem'), ('Soldagem'), ('Revisão'), ('Gravação');--> statement-breakpoint
INSERT INTO `etapa_variacoes` (`etapa_id`, `nome`) VALUES
	((SELECT `id` FROM `etapas` WHERE `nome` = 'Soldagem'), 'Cabos'),
	((SELECT `id` FROM `etapas` WHERE `nome` = 'Soldagem'), 'Retrabalho'),
	((SELECT `id` FROM `etapas` WHERE `nome` = 'Gravação'), 'Firmware'),
	((SELECT `id` FROM `etapas` WHERE `nome` = 'Gravação'), 'IMEI'),
	((SELECT `id` FROM `etapas` WHERE `nome` = 'Gravação'), 'Serial');--> statement-breakpoint

-- ─── Dados: converte os textos livres existentes em cadastros ────────────────
-- Grafia antiga corrigida pelo código legado a cada inicialização
UPDATE `producao_ficha_diaria` SET `etapa` = 'Revisão' WHERE `etapa` = 'Revisao';--> statement-breakpoint

-- Etapas fora do padrão que já existam nas fichas (Firmware/IMEI viram variações de Gravação)
INSERT INTO `etapas` (`nome`)
SELECT MIN(TRIM(`f`.`etapa`)) FROM `producao_ficha_diaria` `f`
WHERE TRIM(`f`.`etapa`) <> ''
	AND lower(TRIM(`f`.`etapa`)) NOT IN ('firmware', 'imei')
	AND NOT EXISTS (SELECT 1 FROM `etapas` `e` WHERE lower(`e`.`nome`) = lower(TRIM(`f`.`etapa`)))
GROUP BY lower(TRIM(`f`.`etapa`));--> statement-breakpoint

INSERT INTO `produtos` (`nome`)
SELECT MIN(TRIM(`produto`)) FROM `producao_ficha_diaria`
WHERE TRIM(`produto`) <> ''
GROUP BY lower(TRIM(`produto`));--> statement-breakpoint

INSERT INTO `operadores` (`nome`)
SELECT MIN(TRIM(`operador_nome`)) FROM `producao_operador_diario`
WHERE TRIM(`operador_nome`) <> ''
GROUP BY lower(TRIM(`operador_nome`));--> statement-breakpoint

UPDATE `producao_ficha_diaria` SET
	`produto_id` = (
		SELECT `p`.`id` FROM `produtos` `p`
		WHERE lower(`p`.`nome`) = lower(TRIM(`producao_ficha_diaria`.`produto`)) AND `p`.`versao` = ''
	),
	`etapa_id` = (
		SELECT `e`.`id` FROM `etapas` `e`
		WHERE lower(`e`.`nome`) = lower(
			CASE WHEN lower(TRIM(`producao_ficha_diaria`.`etapa`)) IN ('firmware', 'imei')
				THEN 'Gravação' ELSE TRIM(`producao_ficha_diaria`.`etapa`) END
		)
	),
	`variacao_id` = (
		SELECT `v`.`id` FROM `etapa_variacoes` `v`
		JOIN `etapas` `e` ON `e`.`id` = `v`.`etapa_id`
		WHERE `e`.`nome` = 'Gravação' AND lower(`v`.`nome`) = lower(TRIM(`producao_ficha_diaria`.`etapa`))
	);--> statement-breakpoint

UPDATE `producao_operador_diario` SET `operador_id` = (
	SELECT `o`.`id` FROM `operadores` `o`
	WHERE lower(`o`.`nome`) = lower(TRIM(`producao_operador_diario`.`operador_nome`))
);
