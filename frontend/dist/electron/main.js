"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
// 開発モードかどうかを判定
const isDev = !electron_1.app.isPackaged;
// メインウィンドウの型定義
let mainWindow = null;
// フォルダ選択ダイアログを表示する関数
const showFolderDialog = async () => {
    try {
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        return { success: true, data: result };
    }
    catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
};
// APIリクエストを処理する関数
const handleApiCall = async (request) => {
    try {
        console.log('API呼び出し:', request);
        // ここに実際のAPI実装を追加
        // 今はダミーレスポンスを返す
        return {
            success: true,
            data: {
                message: 'API呼び出し成功',
                requestData: request
            }
        };
    }
    catch (error) {
        console.error('API呼び出しエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
// メインウィンドウ作成関数
function createWindow() {
    // ウィンドウサイズとオプションを設定
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 800,
        minHeight: 400,
        minWidth: 600,
        title: 'エーテル製 VRC Snap Archive',
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
    }
    else {
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
        const userDataPath = electron_1.app.getPath('userData');
        fs.writeFileSync(path.join(userDataPath, '.launcher_reactivate'), 'closed');
    });
}
// CSSをリロードするIPC通信（開発モード用）
electron_1.ipcMain.handle('reload-css', () => {
    if (mainWindow && isDev) {
        mainWindow.webContents.send('reload-styles');
        return { success: true };
    }
    return { success: false };
});
// APIハンドラー登録
electron_1.ipcMain.handle('call-api', (_, request) => handleApiCall(request));
// フォルダ選択ダイアログハンドラー
electron_1.ipcMain.handle('browseFolder', showFolderDialog);
// テーマ設定を取得するハンドラー
electron_1.ipcMain.handle('get-theme-preference', async () => {
    try {
        // ユーザーデータディレクトリからテーマ設定を読み込む
        const userDataPath = electron_1.app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.json');
        // 設定ファイルが存在するか確認
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            if (settings.themeMode && (settings.themeMode === 'light' || settings.themeMode === 'dark')) {
                return settings.themeMode;
            }
        }
        // デフォルト設定（ないか不正な値の場合はダークモード）
        return 'dark';
    }
    catch (error) {
        console.error('テーマ設定の読み込みエラー:', error);
        return 'dark'; // エラー時はダークモード
    }
});
// テーマ設定を保存するハンドラー
electron_1.ipcMain.handle('set-theme-preference', async (_, theme) => {
    try {
        // ユーザーデータディレクトリに設定を保存
        const userDataPath = electron_1.app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.json');
        // 既存の設定を読み込むか、新しい設定オブジェクトを作成
        let settings = {};
        if (fs.existsSync(settingsPath)) {
            settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
        // テーマ設定を更新
        settings.themeMode = theme;
        // ファイルに保存
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
        return { success: true };
    }
    catch (error) {
        console.error('テーマ設定の保存エラー:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
// アプリケーション起動時の処理
electron_1.app.on('ready', () => {
    createWindow();
});
// 全ウィンドウが閉じられた時の処理（MacOSを除く）
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
// アプリがアクティブになった時の処理（MacOS)
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
//# sourceMappingURL=main.js.map