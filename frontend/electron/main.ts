import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// 開発モードかどうかを判定
const isDev = !app.isPackaged;

// メインウィンドウの型定義
let mainWindow: BrowserWindow | null = null;

// APIレスポンスの型定義
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

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
  // ウィンドウサイズとオプションを設定
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, './preload.js')
    },
  });

  // 開発モードの場合はReact開発サーバーを読み込む
  // 本番モードの場合はビルドされたindex.htmlを読み込む
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    console.log('開発モード: Reactサーバーに接続しています');
    mainWindow.webContents.openDevTools(); // 開発者ツールを自動的に開く
  } else {
    // ビルド済みのindex.htmlを読み込む
    const indexPath = path.join(__dirname, '../build/index.html');
    mainWindow.loadFile(indexPath);
    console.log(`本番モード: ${indexPath} を読み込みました`);
  }

  // ウィンドウのリサイズイベント
  mainWindow.on('resize', () => {
    // ウィンドウサイズが変更されたときの処理（必要に応じて）
  });

  // ウィンドウが閉じられた時の処理
  mainWindow.on('closed', () => {
    mainWindow = null;
    // ランチャー再起動フラグの作成
    const userDataPath = app.getPath('userData');
    fs.writeFileSync(path.join(userDataPath, '.launcher_reactivate'), 'closed');
  });
}

// CSSをリロードするIPC通信（開発モード用）
ipcMain.handle('reload-css', () => {
  if (mainWindow && isDev) {
    mainWindow.webContents.send('reload-styles');
    return { success: true };
  }
  return { success: false };
});

// フォルダ選択ダイアログハンドラー
ipcMain.handle('browseFolder', showFolderDialog);

// アプリケーション起動時の処理
app.on('ready', () => {
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
