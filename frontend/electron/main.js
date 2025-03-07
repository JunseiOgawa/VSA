const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// 代わりに以下のコードを使用
const isDev = !app.isPackaged;
// または
// const isDev = process.env.NODE_ENV === 'development';

// Flaskサーバープロセス
let flaskProcess = null;
let mainWindow = null;

// Flask APIへのリクエスト用ラッパー
const requestFlaskAPI = (endpoint, method, data) => {
  // Flaskサーバーへのリクエスト処理
  // 実際の実装ではfetch/axiosなどを使用
};

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      preload: path.join(__dirname, 'preload.js')
    },
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    // Flaskサーバーの終了処理
    if (flaskProcess) {
      flaskProcess.kill();
      flaskProcess = null;
    }
    // ランチャー再起動フラグの作成
    fs.writeFileSync(path.join(app.getPath('userData'), '.launcher_reactivate'), 'closed');
  });
}

function startFlaskServer() {
  // 開発環境: pythonコマンドでFlaskサーバーを起動
  // 本番環境: 同梱されたPython環境でスクリプトを実行
  const scriptPath = isDev
    ? '../backend/app.py'
    : path.join(process.resourcesPath, 'backend/app.py');
  
  const pythonPath = isDev
    ? 'python'  // 開発環境ではシステムのPythonを使用
    : path.join(process.resourcesPath, 'python/python.exe');  // 本番環境では同梱のPythonを使用

  flaskProcess = spawn(pythonPath, [scriptPath]);
  
  flaskProcess.stdout.on('data', (data) => {
    console.log(`Flask stdout: ${data}`);
  });
  
  flaskProcess.stderr.on('data', (data) => {
    console.error(`Flask stderr: ${data}`);
  });
  
  flaskProcess.on('close', (code) => {
    console.log(`Flask server process exited with code ${code}`);
  });
}

// IPCハンドラー - バックエンドAPI呼び出し
ipcMain.handle('call-api', async (event, { endpoint, method, data }) => {
  try {
    const response = await requestFlaskAPI(endpoint, method, data);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

app.on('ready', () => {
  startFlaskServer();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});