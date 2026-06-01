import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import { updateElectronApp } from 'update-electron-app';
import { setupBoxControllers } from './main/controllers/boxController';
import { setupDashboardControllers } from './main/controllers/dashboardController';
import { setupProducaoControllers } from './main/controllers/producaoController';

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

  ipcMain.on('close-production-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    win?.close();
  });

  createWindow();
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
