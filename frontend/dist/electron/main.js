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
        // テンプレート関連のエンドポイント処理
        if (request.endpoint === 'templates') {
            const userDataPath = electron_1.app.getPath('userData');
            const mainSettingsPath = path.join(userDataPath, 'appsettings.json');
            // 設定ファイルがなければ作成
            if (!fs.existsSync(mainSettingsPath)) {
                fs.writeFileSync(mainSettingsPath, JSON.stringify({ main: { templates: [] } }, null, 2));
            }
            // 設定を読み込む
            const settings = JSON.parse(fs.readFileSync(mainSettingsPath, 'utf8'));
            // mainセクションがなければ初期化
            if (!settings.main) {
                settings.main = { templates: [] };
            }
            // templatesセクションがなければ初期化
            if (!settings.main.templates) {
                settings.main.templates = [];
            }
            // GET - テンプレート一覧取得
            if (request.method === 'GET') {
                return {
                    success: true,
                    data: settings.main.templates
                };
            }
            // POST - テンプレート追加
            if (request.method === 'POST') {
                const { name, content } = request.data;
                if (!name || !content) {
                    return {
                        success: false,
                        error: 'テンプレート名と内容は必須です'
                    };
                }
                // 新しいテンプレートを作成
                const newTemplate = {
                    id: `template-${Date.now()}`,
                    name,
                    content,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                // テンプレート配列に追加
                settings.main.templates.push(newTemplate);
                // ファイルに保存
                fs.writeFileSync(mainSettingsPath, JSON.stringify(settings, null, 2));
                return {
                    success: true,
                    data: newTemplate
                };
            }
            // PUT - テンプレート更新
            if (request.method === 'PUT') {
                const { id, name, content } = request.data;
                if (!id || !name || !content) {
                    return {
                        success: false,
                        error: 'テンプレートID、名前、内容は必須です'
                    };
                }
                // テンプレートを検索
                const templateIndex = settings.main.templates.findIndex((t) => t.id === id);
                if (templateIndex === -1) {
                    return {
                        success: false,
                        error: '指定されたテンプレートが見つかりません'
                    };
                }
                // テンプレートを更新
                const updatedTemplate = {
                    ...settings.main.templates[templateIndex],
                    name,
                    content,
                    updatedAt: new Date().toISOString()
                };
                settings.main.templates[templateIndex] = updatedTemplate;
                // ファイルに保存
                fs.writeFileSync(mainSettingsPath, JSON.stringify(settings, null, 2));
                return {
                    success: true,
                    data: updatedTemplate
                };
            }
            // DELETE - テンプレート削除
            if (request.method === 'DELETE') {
                const { id } = request.data;
                if (!id) {
                    return {
                        success: false,
                        error: 'テンプレートIDは必須です'
                    };
                }
                // テンプレートを検索
                const originalLength = settings.main.templates.length;
                settings.main.templates = settings.main.templates.filter((t) => t.id !== id);
                if (settings.main.templates.length === originalLength) {
                    return {
                        success: false,
                        error: '指定されたテンプレートが見つかりません'
                    };
                }
                // ファイルに保存
                fs.writeFileSync(mainSettingsPath, JSON.stringify(settings, null, 2));
                return {
                    success: true
                };
            }
            // 投稿文生成
            if (request.method === 'generate-text') {
                const { templateId, imageIds } = request.data;
                if (!templateId || !imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
                    return {
                        success: false,
                        error: 'テンプレートIDと画像IDは必須です'
                    };
                }
                // テンプレートを検索
                const template = settings.main.templates.find((t) => t.id === templateId);
                if (!template) {
                    return {
                        success: false,
                        error: '指定されたテンプレートが見つかりません'
                    };
                }
                // ダミーのメタデータ（実際の実装ではDBから取得）
                const dummyMetadata = {
                    worldName: 'サンプルワールド',
                    worldId: 'wrld_00000000-0000-0000-0000-000000000000',
                    captureTime: new Date().toLocaleString(),
                    friends: '友人A, 友人B',
                    fileName: 'VRChat_Sample'
                };
                // ワールドURLを生成
                const worldUrl = `https://vrchat.com/home/launch?worldId=${dummyMetadata.worldId}`;
                // テンプレートを処理
                let generatedText = template.content
                    .replace(/\$world_name\$/g, dummyMetadata.worldName)
                    .replace(/\$world_id\$/g, dummyMetadata.worldId)
                    .replace(/\$world_url\$/g, worldUrl)
                    .replace(/\$capture_time\$/g, dummyMetadata.captureTime)
                    .replace(/\$friends\$/g, dummyMetadata.friends)
                    .replace(/\$file_name\$/g, dummyMetadata.fileName);
                return {
                    success: true,
                    data: { text: generatedText }
                };
            }
            return {
                success: false,
                error: '不明なメソッドです'
            };
        }
        // その他のエンドポイントのハンドリング（既存の処理）
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
    // テーマ設定を読み込む
    let darkMode = true;
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const settingsPath = path.join(userDataPath, 'settings.json');
        if (fs.existsSync(settingsPath)) {
            const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            darkMode = settings.themeMode !== 'light'; // lightでなければdarkモード
        }
    }
    catch (error) {
        console.error('テーマ設定の読み込みエラー:', error);
    }
    // ウィンドウサイズとオプションを設定
    mainWindow = new electron_1.BrowserWindow({
        width: 1000,
        height: 800,
        minHeight: 400,
        minWidth: 600,
        frame: false,
        backgroundColor: darkMode ? '#121212' : '#f5f5f5',
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
electron_1.ipcMain.handle('call-api', async (_, request) => {
    const { endpoint, method, data } = request;
    // 設定関連のエンドポイント処理
    if (endpoint === 'settings') {
        try {
            const userDataPath = electron_1.app.getPath('userData');
            const settingsPath = path.join(userDataPath, 'settings.json');
            // 設定の取得
            if (method === 'GET') {
                if (fs.existsSync(settingsPath)) {
                    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                    return { success: true, data: settings };
                }
                return { success: true, data: {} };
            }
            // 設定の保存
            if (method === 'SET') {
                // 既存の設定を読み込む（存在しない場合は空オブジェクト）
                let settings = {};
                if (fs.existsSync(settingsPath)) {
                    settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
                }
                // 新しい設定をマージ
                const updatedSettings = { ...settings, ...data };
                // 設定を保存
                fs.writeFileSync(settingsPath, JSON.stringify(updatedSettings, null, 2));
                return { success: true };
            }
            return { success: false, error: '不明なメソッド' };
        }
        catch (error) {
            console.error('設定処理エラー:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : '不明なエラー'
            };
        }
    }
    // その他のAPI呼び出しはhandleApiCallに委譲
    return handleApiCall(request);
});
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
        // ウィンドウの背景色を更新
        if (mainWindow) {
            mainWindow.setBackgroundColor(theme === 'dark' ? '#121212' : '#f5f5f5');
        }
        return { success: true };
    }
    catch (error) {
        console.error('テーマ設定の保存エラー:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
// ウィンドウコントロール用のIPCハンドラーを追加
electron_1.ipcMain.handle('window-minimize', () => {
    if (mainWindow)
        mainWindow.minimize();
    return { success: true };
});
electron_1.ipcMain.handle('window-maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        }
        else {
            mainWindow.maximize();
        }
    }
    return { success: true };
});
electron_1.ipcMain.handle('window-close', () => {
    if (mainWindow)
        mainWindow.close();
    return { success: true };
});
electron_1.ipcMain.handle('window-is-maximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
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