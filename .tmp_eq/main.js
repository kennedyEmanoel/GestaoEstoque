setTimeout(() => {
  const Database = require('../node_modules/better-sqlite3');
  const os = require('os');
  const path = require('path');
  
  const dbOld = path.join(os.homedir(), 'AppData', 'Roaming', 'gestaoestoque', 'bd_estoque.sqlite');
  try {
    const db = new Database(dbOld, { readonly: true });
    const ops = db.prepare('SELECT * FROM producao_operador_diario ORDER BY id DESC LIMIT 20').all();
    process.stdout.write('OPS_OLD:' + JSON.stringify(ops) + '\n');
    db.close();
  } catch(e) {
    process.stdout.write('ERR:' + e.message + '\n');
  }
  process.exit(0);
}, 100);
