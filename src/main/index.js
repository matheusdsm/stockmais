const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const log = require('electron-log');
const Database = require('./database');

log.initialize();
log.info('Iniciando STOCKMAIS...');

let mainWindow;
let db;

process.on('uncaughtException', (error) => {
  log.error('Erro não tratado:', error);
  app.exit(1);
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'STOCKMAIS'
  });

  const isDev = !app.isPackaged;
  
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist-renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIPC() {
  ipcMain.handle('db:usuarios:create', async (event, data) => {
    return db.criarUsuario(data);
  });
  
  ipcMain.handle('db:usuarios:login', async (event, username, password) => {
    return db.login(username, password);
  });
  
  ipcMain.handle('db:usuarios:list', async (event, ativo) => {
    return db.listarUsuarios(ativo);
  });
  
  ipcMain.handle('db:usuarios:update', async (event, id, data) => {
    return db.atualizarUsuario(id, data);
  });
  
  ipcMain.handle('db:usuarios:delete', async (event, id) => {
    return db.desativarUsuario(id);
  });

  ipcMain.handle('db:produtos:create', async (event, data) => {
    return db.criarProduto(data);
  });
  
  ipcMain.handle('db:produtos:list', async (event, search) => {
    return db.listarProdutos(search);
  });
  
  ipcMain.handle('db:produtos:get', async (event, id) => {
    return db.getProduto(id);
  });
  
  ipcMain.handle('db:produtos:update', async (event, id, data) => {
    return db.atualizarProduto(id, data);
  });
  
  ipcMain.handle('db:produtos:delete', async (event, id) => {
    return db.excluirProduto(id);
  });

  ipcMain.handle('db:movimentacoes:create', async (event, data) => {
    return db.criarMovimentacao(data);
  });
  
  ipcMain.handle('db:movimentacoes:list', async (event, filters) => {
    return db.listarMovimentacoes(filters);
  });

  ipcMain.handle('db:logs:list', async (event, filters) => {
    return db.listarLogs(filters);
  });
  
  ipcMain.handle('db:logs:export', async (event, filters) => {
    return db.exportarLogs(filters);
  });

  ipcMain.handle('db:dashboard', async () => {
    return db.getDashboard();
  });
}

app.whenReady().then(() => {
  db = new Database();
  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (db) db.close();
    app.quit();
  }
});
