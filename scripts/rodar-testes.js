// Executa o vitest dentro do Node embutido no Electron.
// O better-sqlite3 é compilado para a ABI do Electron (postinstall: electron-rebuild),
// então não carrega no Node comum. ELECTRON_RUN_AS_NODE faz o executável do Electron
// se comportar como um Node normal, com a mesma ABI do app.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const electron = require('electron');
const vitest = path.join(__dirname, '..', 'node_modules', 'vitest', 'vitest.mjs');

const resultado = spawnSync(electron, [vitest, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
});

process.exit(resultado.status ?? 1);
