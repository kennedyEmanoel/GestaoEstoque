process.on('uncaughtException', e => { process.stderr.write(e.stack + '\n'); process.exit(1); });
const electron = process.versions.electron ? require('electron') : null;
if (!electron) { process.stderr.write('Not running in Electron\n'); process.exit(1); }
const { app } = electron;
app.on('ready', () => {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
  process.stdout.write('PATH:' + dbPath + '\n');
  const db = new Database(dbPath);
  db.pragma('wal_checkpoint(TRUNCATE)');
  const fichas = db.prepare('SELECT id, data, produto, etapa FROM producao_ficha_diaria ORDER BY id DESC LIMIT 5').all();
  const ops    = db.prepare('SELECT id, ficha_id, operador_nome FROM producao_operador_diario ORDER BY id DESC LIMIT 10').all();
  const regs   = db.prepare('SELECT * FROM producao_registro_horario ORDER BY id DESC LIMIT 20').all();
  const counts = db.prepare("SELECT (SELECT COUNT(*) FROM producao_ficha_diaria) as fichas, (SELECT COUNT(*) FROM producao_operador_diario) as ops, (SELECT COUNT(*) FROM producao_registro_horario) as regs").get();
  process.stdout.write('COUNTS:' + JSON.stringify(counts) + '\n');
  process.stdout.write('FICHAS:' + JSON.stringify(fichas) + '\n');
  process.stdout.write('OPS:'    + JSON.stringify(ops) + '\n');
  process.stdout.write('REGS:'   + JSON.stringify(regs) + '\n');
  db.close();
  app.quit();
});
