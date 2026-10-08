/**
 * Electron main process for PrintCore.
 *
 * The app is a full-stack project: `server/index.ts` (Express + SQLite) serves
 * both the API and the built frontend in `dist/`. In the desktop shell that
 * server runs inside this process, so the executable is self-contained.
 *
 * Two paths must line up with server/index.ts:
 *   - dist/ is resolved from process.cwd(), so the cwd is switched to
 *     process.resourcesPath in a packaged build (see extraResources in
 *     package.json).
 *   - the SQLite file honours PRINTCORE_DB_PATH, so it lives in the user's
 *     app data folder instead of inside Program Files (read-only).
 */

const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron');
const path = require('node:path');
const net = require('node:net');

const APP_ID = 'cl.printcore.app';
const PORT = 3742;
const HOST = '127.0.0.1';
const URL = `http://${HOST}:${PORT}`;

let mainWindow = null;

app.setAppUserModelId(APP_ID);

function resolveServerBundle() {
  // Packaged: the bundle is unpacked next to main.cjs in app.asar.
  // Development: the repo layout, two levels up from electron/.
  const candidates = [
    path.join(__dirname, '..', 'dist-electron', 'server.cjs'),
    path.join(process.resourcesPath, 'app.asar', 'dist-electron', 'server.cjs')
  ];
  return candidates.find((candidate) => require('node:fs').existsSync(candidate));
}

function waitForServer(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect(PORT, HOST);
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error('El servidor interno no respondió a tiempo.'));
        } else {
          setTimeout(attempt, 150);
        }
      });
    };
    attempt();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 640,
    show: false,
    frame: false,
    backgroundColor: '#020617',
    title: 'PrintCore 3D Chile',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  // No File/Edit/View menu: this is a single-window app, not a browser.
  Menu.setApplicationMenu(null);

  // Keep navigation inside the app; open real links in the default browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  // Same-origin navigation only (internal SPA links never reload anyway).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(URL)) event.preventDefault();
  });

  const broadcastMaximized = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('win:maximized', mainWindow.isMaximized());
    }
  };
  mainWindow.on('maximize', broadcastMaximized);
  mainWindow.on('unmaximize', broadcastMaximized);
  // Sync the state once the renderer can receive IPC (fresh reloads included).
  mainWindow.webContents.on('did-finish-load', () => setTimeout(broadcastMaximized, 50));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.loadURL(URL);
}

function registerWindowControls() {
  ipcMain.on('win:minimize', (event) => BrowserWindow.fromWebContents(event.sender)?.minimize());
  ipcMain.on('win:maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win) (win.isMaximized() ? win.unmaximize() : win.maximize());
  });
  ipcMain.on('win:close', (event) => BrowserWindow.fromWebContents(event.sender)?.close());
  ipcMain.handle('win:is-maximized', (event) =>
    Boolean(BrowserWindow.fromWebContents(event.sender)?.isMaximized())
  );
}

// Only one instance may own the SQLite file and the local port.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    registerWindowControls();

    if (app.isPackaged) {
      // Installed app: keep the DB in app data (the project folder is absent
      // and Program Files is read-only). app.getPath('userData') honours the
      // productName from package.json.
      process.env.PRINTCORE_DB_PATH = path.join(app.getPath('userData'), 'printcore.db');
    }
    // Development: no override → same data/printcore.db as the web app, so the
    // desktop shell and every browser share one database (single source of truth).
    process.env.PORT = String(PORT);

    // server/index.ts looks for dist/ relative to the current directory.
    if (app.isPackaged) process.chdir(process.resourcesPath);

    const bundle = resolveServerBundle();
    if (!bundle) {
      dialog.showErrorBox(
        'PrintCore',
        'No se encontró el servidor interno (dist-electron/server.cjs).\n\n' +
          'Genera el bundle con "npm run build:server" y vuelve a abrir la aplicación.'
      );
      app.quit();
      return;
    }

    try {
      require(bundle);
      await waitForServer();
      createWindow();
    } catch (error) {
      dialog.showErrorBox('PrintCore', `No se pudo iniciar PrintCore:\n${error.message}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => app.quit());

  // Nothing external may relaunch the shell.
  app.on('web-contents-created', (_event, contents) => {
    contents.setWindowOpenHandler(() => ({ action: 'deny' }));
  });
}
