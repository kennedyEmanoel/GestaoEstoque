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
let productionWindowGeral: BrowserWindow | null = null;

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

const createProductionWindowGeral = () => {
  if (productionWindowGeral && !productionWindowGeral.isDestroyed()) {
    productionWindowGeral.focus();
    return;
  }

  productionWindowGeral = new BrowserWindow({
    width: 1920,
    height: 1080,
    fullscreen: true,
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    productionWindowGeral.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?standalone=producao-dashboard-geral`);
  } else {
    productionWindowGeral.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
      { query: { standalone: 'producao-dashboard-geral' } },
    );
  }

  productionWindowGeral.on('closed', () => {
    productionWindowGeral = null;
  });
};

function iniciarPollingComandoWeb(serverUrl: string) {
  let ultimoTs: number | null = null;

  const poll = () => {
    fetch(`${serverUrl}/api/dashboard/comando`)
      .then(r => r.json())
      .then((res: any) => {
        const cmd = res?.data;
        if (!cmd || cmd.ts === ultimoTs) return;
        ultimoTs = cmd.ts;
        // Retransmite para ambas as janelas de dashboard
        if (productionWindow && !productionWindow.isDestroyed()) {
          productionWindow.webContents.send('dashboard-command', cmd);
        }
        if (productionWindowGeral && !productionWindowGeral.isDestroyed()) {
          productionWindowGeral.webContents.send('dashboard-geral-command', cmd);
        }
      })
      .catch(() => { /* servidor ainda não respondeu — ignora */ });
  };

  setInterval(poll, 3000);
}

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

  ipcMain.on('open-production-window-geral', () => {
    createProductionWindowGeral();
  });

  ipcMain.on('close-production-window-geral', () => {
    if (productionWindowGeral && !productionWindowGeral.isDestroyed()) {
      productionWindowGeral.close();
    }
  });

  // Retransmite comandos do Controle de Produção para a janela do Painel Detalhado
  ipcMain.on('dashboard-command', (_event, payload: unknown) => {
    if (productionWindow && !productionWindow.isDestroyed()) {
      productionWindow.webContents.send('dashboard-command', payload);
    }
  });

  // Retransmite comandos para a janela do Painel Geral
  ipcMain.on('dashboard-geral-command', (_event, payload: unknown) => {
    if (productionWindowGeral && !productionWindowGeral.isDestroyed()) {
      productionWindowGeral.webContents.send('dashboard-geral-command', payload);
    }
  });

  const mainWindow = createWindow();

  let serverUrl: string | null = null;

  startInternalServer()
    .then((url) => {
      serverUrl = url;
      mainWindow.setTitle(`Gestão de Manufatura — Rede: ${url}`);
      const port = Number(new URL(url).port);
      if (port) ensureFirewallRule(port);
      iniciarPollingComandoWeb(url);
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
