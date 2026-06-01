import { execSync } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';

const script = `
const { app } = require('electron');
app.on('ready', () => {
  const Database = require('better-sqlite3');
  const path = require('path');
  const dbPath = path.join(app.getPath('userData'), 'bd_estoque.sqlite');
  console.log('DB:', dbPath);
  const db = new Database(dbPath, { readonly: true });
  try { db.pragma('wal_checkpoint(PASSIVE)'); } catch(e) {}
  const fichas = db.prepare('SELECT * FROM producao_ficha_diaria ORDER BY id DESC LIMIT 10').all();
  const ops = db.prepare('SELECT * FROM producao_operador_diario ORDER BY id DESC LIMIT 20').all();
  const regs = db.prepare('SELECT * FROM producao_registro_horario ORDER BY id DESC LIMIT 30').all();
  console.log('FICHAS=' + JSON.stringify(fichas));
  console.log('OPS=' + JSON.stringify(ops));
  console.log('REGS=' + JSON.stringify(regs));
  db.close();
  app.quit();
});
`;
writeFileSync('./db_query_main.js', script);
