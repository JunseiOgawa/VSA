import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';

// 開発モードかどうかを判定
const isDev = !app.isPackaged;

// プロセスとウィンドウの型定義
let flaskProcess: ChildProcess | null = null;
let mainWindow: BrowserWindow | null = null;

// APIレスポンスの型定義
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Flask APIへのリクエスト用ラッパー
const requestFlaskAPI = (endpoint: string, method: string, data?: any): Promise<any> => {
  // 実際のAPI呼び出し実装（現在はスタブ）
  return Promise.resolve({ message: 'API stub response' });
};

// フォルダ選択ダイアログを表示する関数
const showFolderDialog = async (): Promise<ApiResponse> => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    });
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// メインウィンドウ作成関数
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, './preload.js')  // ./preload.jsに変更
    },
  });

  // 開発環境ではローカルサーバー、本番環境ではビルドされたファイルを読み込む
  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  // 開発環境では開発者ツールを開く
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
    // Flaskサーバーの終了処理
    if (flaskProcess) {
      flaskProcess.kill();
      flaskProcess = null;
    }
    // ランチャー再起動フラグの作成
    const userDataPath = app.getPath('userData');
    fs.writeFileSync(path.join(userDataPath, '.launcher_reactivate'), 'closed');
  });
}

// Flaskサーバー起動関数
function startFlaskServer(): void {
  // 開発環境と本番環境でパスを切り替え
  const scriptPath = isDev
    ? '../backend/app.py'
    : path.join(process.resourcesPath, 'backend/app.py');
  
  const pythonPath = isDev
    ? 'python'  // 開発環境ではシステムのPythonを使用
    : path.join(process.resourcesPath, 'python/python.exe');  // 本番環境では同梱のPythonを使用

  // Flaskサーバープロセスを起動
  flaskProcess = spawn(pythonPath, [scriptPath]);
  
  // 標準出力と標準エラー出力のハンドリング
  flaskProcess.stdout?.on('data', (data) => {
    console.log(`Flask stdout: ${data}`);
  });
  
  flaskProcess.stderr?.on('data', (data) => {
    console.error(`Flask stderr: ${data}`);
  });
  
  flaskProcess.on('close', (code) => {
    console.log(`Flask server process exited with code ${code}`);
  });
}

// IPCハンドラー登録
ipcMain.handle('call-api', async (_, { endpoint, method, data }): Promise<ApiResponse> => {
  try {
    const response = await requestFlaskAPI(endpoint, method, data);
    return { success: true, data: response };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// フォルダ選択ダイアログハンドラー
ipcMain.handle('browseFolder', showFolderDialog);

// アプリケーション起動時の処理
app.on('ready', () => {
  startFlaskServer();
  createWindow();
});

// 全ウィンドウが閉じられた時の処理（MacOSを除く）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリがアクティブになった時の処理（MacOS)
app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
