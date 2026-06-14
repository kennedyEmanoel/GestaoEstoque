import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'node:path';
import { execFile } from 'node:child_process';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import { setupBoxControllers } from './main/controllers/boxController';
import { setupDashboardControllers } from './main/controllers/dashboardController';
import { setupProducaoControllers } from './main/controllers/producaoController';
import { startInternalServer } from './main/server/internalServer';

function ensureFirewallRule(port: number) {
  if (process.platform !== 'win32') return;
  const ruleName = `GestaoEstoque-Web-${port}`;
  // Verifica se já existe
  execFile('netsh', ['advfirewall', 'firewall', 'show', 'rule', `name=${ruleName}`], (err) => {
    if (!err) return; // regra já existe
    // Cria silenciosamente (sem prompt UAC — funciona se o processo já tem privilégios)
    execFile('netsh', [
      'advfirewall', 'firewall', 'add', 'rule',
      `name=${ruleName}`,
      'dir=in',
      'action=allow',
      'protocol=TCP',
      `localport=${port}`,
      'profile=any',
    ], () => { /* ignora erros silenciosamente se não tiver privilégios */ });
  });
}

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

if (started) {
  app.quit();
}

let productionWindow: BrowserWindow | null = null;

const createWindow = () => {
  Menu.setApplicationMenu(null);

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  return mainWindow;
};

const createProductionWindow = () => {
  if (productionWindow && !productionWindow.isDestroyed()) {
    productionWindow.focus();
    return;
  }

  productionWindow = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    productionWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?standalone=producao-dashboard`);
  } else {
    productionWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { standalone: 'producao-dashboard' } },
    );
  }

  productionWindow.on('closed', () => {
    productionWindow = null;
  });
};

app.on('ready', () => {
  if (app.isPackaged) {
    updateElectronApp({ repo: 'kennedyEmanoel/GestaoEstoque' });
  }

  setupBoxControllers();
  setupDashboardControllers();
  setupProducaoControllers();

  ipcMain.on('open-production-window', () => {
    createProductionWindow();
  });

  ipcMain.on('close-production-window', (_event) => {
    if (productionWindow && !productionWindow.isDestroyed()) {
      productionWindow.close();
    }
  });

  // Retransmite comandos do Controle de Produção para a janela do Painel
  ipcMain.on('dashboard-command', (_event, payload: unknown) => {
    if (productionWindow && !productionWindow.isDestroyed()) {
      productionWindow.webContents.send('dashboard-command', payload);
    }
  });

  const mainWindow = createWindow();

  let serverUrl: string | null = null;

  startInternalServer()
    .then((url) => {
      serverUrl = url;
      mainWindow.setTitle(`Gestão de Manufatura — Rede: ${url}`);
      // Tenta liberar a porta no Firewall do Windows automaticamente
      const port = Number(new URL(url).port);
      if (port) ensureFirewallRule(port);
    })
    .catch((err) => {
      console.error('Falha ao iniciar servidor interno:', err);
    });

  ipcMain.handle('get-server-url', () => serverUrl);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
