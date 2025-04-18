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
const childProcess = __importStar(require("child_process"));
const http = __importStar(require("http"));
const net = __importStar(require("net"));
// 開発モードかどうかを判定
const isDev = process.env.NODE_ENV !== 'production' || !electron_1.app.isPackaged;
// Python APIサーバープロセス
let pythonProcess = null;
// APIサーバーのポート
const API_PORT = 5000;
// パスセパレータを取得（OSに依存）
const PATH_SEPARATOR = path.sep;
// アプリケーション状態管理
const appState = {
    isQuitting: false,
    apiServerRunning: false,
    apiServerPort: 5000
};
// 明示的に開発サーバーが起動しているかチェックする関数
const isDevServerRunning = async () => {
    try {
        const socket = new net.Socket();
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                socket.destroy();
                resolve(false);
            }, 1000);
            socket.connect(3000, '127.0.0.1', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                clearTimeout(timeout);
                socket.destroy();
                resolve(false);
            });
        });
    }
    catch (err) {
        console.error('開発サーバー接続確認エラー:', err);
        return false;
    }
};
// Pythonバックエンドサーバーを起動する関数
const startPythonApiServer = async () => {
    var _a, _b;
    try {
        // すでに起動している場合は何もしない
        if (appState.apiServerRunning) {
            console.log('APIサーバーはすでに起動しています');
            return true;
        }
        console.log('Pythonバックエンドサーバーを起動します...');
        // バックエンドのパスを設定
        let pythonScriptPath;
        let pythonExePath;
        if (isDev) {
            // 開発環境ではプロジェクトフォルダ内のPythonスクリプトを使用し、システムのPythonを呼び出す
            pythonScriptPath = path.join(__dirname, '..', '..', 'backend', 'main.py');
            // 環境変数のPATHに登録されているpythonを使用
            pythonExePath = 'python';
        }
        else {
            // 本番環境では同梱されたPythonとスクリプトを使用
            pythonScriptPath = path.join(process.resourcesPath, 'backend', 'main.py');
            pythonExePath = path.join(process.resourcesPath, 'python', 'python.exe');
            // Windowsでない場合はpython3を使用
            if (process.platform !== 'win32') {
                pythonExePath = path.join(process.resourcesPath, 'python', 'bin', 'python3');
            }
        }
        // アプリケーション設定ファイルのパス
        const userDataPath = electron_1.app.getPath('userData');
        const appSettingsPath = path.join(userDataPath, 'appsettings.json');
        // 設定ファイルが存在するか確認し、存在しない場合は初期化
        if (!fs.existsSync(appSettingsPath)) {
            const initialSettings = {
                inputPictureFolders: [],
                outputFolder: "",
                sortMethod: "monthly",
                renameFormat: "yyyy-MM-dd-HH-mm-ss"
            };
            fs.writeFileSync(appSettingsPath, JSON.stringify(initialSettings, null, 2));
        }
        // コマンドライン引数を構築
        const args = [
            pythonScriptPath,
            '--port', appState.apiServerPort.toString(),
            '--appdata', userDataPath
        ];
        console.log(`バックエンドサーバー起動コマンド: ${pythonExePath} ${args.join(' ')}`);
        // Pythonプロセスを起動
        pythonProcess = childProcess.spawn(pythonExePath, args, {
            stdio: ['pipe', 'pipe', 'pipe'],
            detached: false
        });
        // 標準出力のリスナー
        (_a = pythonProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
            const output = data.toString().trim();
            console.log(`[Python] ${output}`);
            // サーバー起動完了メッセージをチェック
            if (output.includes('Running on http://') && output.includes(`${appState.apiServerPort}`)) {
                appState.apiServerRunning = true;
                console.log(`APIサーバーが起動しました: ポート ${appState.apiServerPort}`);
                // メインウィンドウにサーバー起動通知を送信
                if (mainWindow) {
                    mainWindow.webContents.send('api-server-status', {
                        running: true,
                        port: appState.apiServerPort
                    });
                }
            }
        });
        // 標準エラー出力のリスナー
        (_b = pythonProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
            console.error(`[Python Error] ${data.toString().trim()}`);
        });
        // プロセス終了時のリスナー
        pythonProcess.on('close', (code) => {
            console.log(`Pythonプロセスが終了しました: コード ${code}`);
            appState.apiServerRunning = false;
            pythonProcess = null;
            // メインウィンドウにサーバー停止通知を送信
            if (mainWindow) {
                mainWindow.webContents.send('api-server-status', { running: false });
            }
            // 予期しない終了の場合は再起動を試みる
            if (code !== 0 && !appState.isQuitting) {
                console.log('APIサーバーが予期せず終了しました。再起動を試みます...');
                setTimeout(() => {
                    startPythonApiServer();
                }, 3000); // 3秒後に再起動
            }
        });
        // プロセスエラー時のリスナー
        pythonProcess.on('error', (err) => {
            console.error('Pythonプロセス起動エラー:', err);
            appState.apiServerRunning = false;
            // メインウィンドウにエラー通知を送信
            if (mainWindow) {
                mainWindow.webContents.send('api-server-status', {
                    running: false,
                    error: err.message
                });
            }
        });
        // 起動を待機（最大10秒）
        let attempts = 0;
        const maxAttempts = 20; // 10秒 (500ms x 20)
        return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
                if (appState.apiServerRunning) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
                else if (attempts >= maxAttempts) {
                    clearInterval(checkInterval);
                    console.error('APIサーバーの起動がタイムアウトしました');
                    resolve(false);
                }
                attempts++;
            }, 500);
        });
    }
    catch (error) {
        console.error('APIサーバー起動エラー:', error);
        return false;
    }
};
// Pythonサーバーを停止する関数
const stopPythonApiServer = () => {
    if (pythonProcess) {
        console.log('Pythonサーバーを停止します...');
        // Windowsの場合はツリーキルが必要
        if (process.platform === 'win32') {
            try {
                childProcess.exec(`taskkill /pid ${pythonProcess.pid} /T /F`);
            }
            catch (error) {
                console.error('プロセスツリーキルエラー:', error);
            }
        }
        else {
            // UNIX系OSの場合は親プロセスだけでなくプロセスグループ全体を終了させる
            try {
                if (pythonProcess.pid !== undefined) {
                    process.kill(-pythonProcess.pid, 'SIGTERM');
                }
                else {
                    console.warn('プロセスPIDが未定義のため終了できません');
                }
            }
            catch (error) {
                console.error('プロセスグループ終了エラー:', error);
            }
        }
        pythonProcess = null;
        appState.apiServerRunning = false;
    }
};
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
// フォルダ一覧を取得する関数
const getFolders = async (folderPath) => {
    try {
        // フォルダパスが指定されていない場合はエラー
        if (!folderPath) {
            return { success: false, error: 'フォルダパスが指定されていません' };
        }
        // フォルダの存在確認
        if (!fs.existsSync(folderPath)) {
            return { success: false, error: 'フォルダが存在しません' };
        }
        // フォルダ内容を読み取り
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        // ディレクトリのみをフィルタリング
        const folders = entries
            .filter(entry => entry.isDirectory())
            .map(dir => {
            const dirPath = path.join(folderPath, dir.name);
            let stats;
            try {
                stats = fs.statSync(dirPath);
            }
            catch (err) {
                console.error(`Failed to get stats for ${dirPath}:`, err);
                stats = null;
            }
            // フォルダ情報を返す
            return {
                name: dir.name,
                path: dirPath,
                lastModified: stats ? stats.mtime.toLocaleDateString() : 'Unknown',
            };
        })
            .sort((a, b) => b.name.localeCompare(a.name)); // 日付でソート（新しい順）
        return { success: true, data: folders };
    }
    catch (error) {
        console.error('フォルダ一覧取得エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
// 圧縮処理を実行する関数
const compressFolder = async (request) => {
    try {
        const { sourcePath, outputPath, monthlyCompress } = request;
        // 必要なパラメータが揃っているか確認
        if (!sourcePath || !outputPath) {
            return { success: false, error: '入力元と出力先のパスは必須です' };
        }
        // フォルダの存在確認
        if (!fs.existsSync(sourcePath)) {
            return { success: false, error: '入力元フォルダが存在しません' };
        }
        if (!fs.existsSync(outputPath)) {
            // 出力先が存在しない場合は作成
            try {
                fs.mkdirSync(outputPath, { recursive: true });
            }
            catch (err) {
                return { success: false, error: '出力先フォルダの作成に失敗しました' };
            }
        }
        console.log(`圧縮処理を開始: ${sourcePath} -> ${outputPath}`);
        // Pythonスクリプトのパスを指定
        // 開発時とアプリ実行時のパスを考慮
        let pythonScriptPath = '';
        if (isDev) {
            // 開発時は実際のPythonスクリプトを直接実行
            pythonScriptPath = path.join(__dirname, '../../backend/compress_script.py');
        }
        else {
            // 本番環境ではPyInstallerでパッケージ化したexeを実行
            pythonScriptPath = path.join(process.resourcesPath, 'backend', 'compress_script.exe');
        }
        // 実行時オプションを設定
        const options = {
            sourcePath,
            outputPath,
            monthlyCompress: monthlyCompress ? 'true' : 'false'
        };
        // ここでPython処理を実行するコードを追加予定
        // 注：実装は後で行います (要追加実装)
        // 開発段階のモックレスポンス
        return {
            success: true,
            data: {
                message: '圧縮が完了しました',
                source: sourcePath,
                output: outputPath,
                stats: {
                    originalSize: '500 MB',
                    compressedSize: '150 MB',
                    compressionRatio: '70%',
                    fileCount: 125,
                    imageCount: 120
                }
            }
        };
    }
    catch (error) {
        console.error('圧縮処理エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
// APIサーバーステータスを取得するハンドラー
electron_1.ipcMain.handle('get-api-server-status', () => {
    return {
        running: appState.apiServerRunning,
        port: appState.apiServerPort
    };
});
// APIサーバーの再起動を要求するハンドラー
electron_1.ipcMain.handle('restart-api-server', async () => {
    if (appState.apiServerRunning) {
        stopPythonApiServer();
        // 少し待機してから再起動
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    const success = await startPythonApiServer();
    return { success };
});
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
        isDevServerRunning().then((isRunning) => {
            if (isRunning && mainWindow) {
                mainWindow.loadURL('http://localhost:3000');
                console.log('開発モード: Reactサーバーに接続しています');
                mainWindow.webContents.openDevTools(); // 開発者ツールを自動的に開く
            }
            else {
                console.log('開発サーバーが起動していません。ビルド済みファイルを使用します。');
                // 開発サーバーが起動していない場合はビルド済みファイルを使用
                loadProductionBuild();
            }
        });
    }
    else {
        loadProductionBuild();
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
// ビルド済みのReactアプリを読み込む関数
function loadProductionBuild() {
    if (!mainWindow)
        return;
    // ビルド済みのindex.htmlを検索する順番に複数のパスを試す
    const possiblePaths = [
        path.join(__dirname, '../../build/index.html'),
        path.join(__dirname, '../build/index.html'),
        path.join(__dirname, '../../frontend/build/index.html'),
        path.join(electron_1.app.getAppPath(), 'build/index.html'),
        path.join(process.cwd(), 'build/index.html')
    ];
    console.log('ビルド済みファイルを探しています...');
    console.log('現在の__dirname:', __dirname);
    console.log('appPath:', electron_1.app.getAppPath());
    console.log('cwd:', process.cwd());
    // 存在するパスを見つける
    let indexPath = '';
    for (const testPath of possiblePaths) {
        console.log('パスをチェック中:', testPath);
        if (fs.existsSync(testPath)) {
            indexPath = testPath;
            console.log('見つかりました:', indexPath);
            break;
        }
    }
    if (indexPath) {
        // ファイルが見つかったらロード
        console.log(`本番モード: ${indexPath} を読み込みました`);
        mainWindow.loadFile(indexPath);
        // 常に開発者ツールを表示（デバッグモード）
        mainWindow.webContents.openDevTools();
        // webContentsのイベントをリッスン
        mainWindow.webContents.on('did-finish-load', () => {
            console.log('ページ読み込み完了');
        });
        mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('ページ読み込み失敗:', errorCode, errorDescription);
        });
        mainWindow.webContents.on('dom-ready', () => {
            console.log('DOM準備完了');
            // ページ内でのコンソールログをリッスン
            if (mainWindow) {
                mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
                    const levels = ['log', 'warn', 'error', 'info'];
                    console.log(`[ブラウザコンソール][${levels[level] || level}] ${message}`);
                });
                // Reactアプリが正しく初期化されているか確認するスクリプトを実行
                mainWindow.webContents.executeJavaScript(`
          console.log('Reactルート要素チェック: ', document.getElementById('root'));
          console.log('body内容: ', document.body.innerHTML);
          if (window.electronAPI) {
            console.log('electronAPI利用可能');
          } else {
            console.error('electronAPI未定義!');
          }
        `);
            }
        });
        // クラッシュやハングを検出
        mainWindow.webContents.on('crashed', () => {
            console.error('レンダラープロセスがクラッシュしました');
        });
        mainWindow.on('unresponsive', () => {
            console.error('アプリケーションが応答しなくなりました');
        });
    }
    else {
        // ファイルが見つからなかった場合はエラーメッセージを表示
        console.error('ビルド済みindex.htmlが見つかりません！');
        mainWindow.loadURL(`data:text/html,
    <html>
      <head>
        <title>エラー</title>
        <style>
          body { font-family: sans-serif; padding: 2em; color: #333; background: #f5f5f5; }
          h2 { color: #d32f2f; }
          pre { background: #eee; padding: 1em; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h2>アプリケーションの読み込みに失敗しました</h2>
        <p>index.htmlファイルが見つかりませんでした。</p>
        <p>ビルドディレクトリが正しく生成されているか確認してください。</p>
        <p>試行したパス:</p>
        <pre>${possiblePaths.join('\n')}</pre>
      </body>
    </html>`);
    }
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
// プリロードスクリプトの存在確認と内容ログ出力
electron_1.ipcMain.handle('check-preload', () => {
    try {
        const preloadPath = path.join(__dirname, './preload.js');
        console.log('プリロードパス確認:', preloadPath);
        console.log('プリロードファイル存在:', fs.existsSync(preloadPath));
        if (fs.existsSync(preloadPath)) {
            const stats = fs.statSync(preloadPath);
            console.log('プリロードファイルサイズ:', stats.size, 'バイト');
            console.log('最終更新日時:', stats.mtime);
            // ファイルの内容をコンソールに出力（デバッグ用）
            const content = fs.readFileSync(preloadPath, 'utf8');
            console.log('プリロードファイル内容の一部:', content.substring(0, 500) + '...');
        }
        return { success: true };
    }
    catch (error) {
        console.error('プリロードファイル確認エラー:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
// 写真取り込み関連のAPIハンドラー追加
electron_1.ipcMain.handle('import-photos', async (_, request) => {
    try {
        console.log('写真取り込みリクエスト:', request);
        // フォルダダイアログを表示して写真フォルダを選択
        const result = await electron_1.dialog.showOpenDialog({
            properties: ['openDirectory', 'multiSelections'],
            title: '取り込む写真フォルダを選択'
        });
        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, message: '操作がキャンセルされました' };
        }
        // 選択されたフォルダパスを取得
        const selectedPaths = result.filePaths;
        console.log('選択されたフォルダ:', selectedPaths);
        // 設定ファイルを読み込む
        const userDataPath = electron_1.app.getPath('userData');
        const appSettingsPath = path.join(userDataPath, 'appsettings.json');
        let settings = { inputPictureFolders: [] };
        if (fs.existsSync(appSettingsPath)) {
            settings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
        }
        // 既存の入力フォルダ配列を取得または初期化
        if (!settings.inputPictureFolders) {
            settings.inputPictureFolders = [];
        }
        // 選択されたパスを設定に追加（重複を除去）
        const updatedFolders = [...new Set([...settings.inputPictureFolders, ...selectedPaths])];
        settings.inputPictureFolders = updatedFolders;
        // 設定を保存
        fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2));
        return {
            success: true,
            data: {
                selectedPaths,
                inputPictureFolders: updatedFolders
            }
        };
    }
    catch (error) {
        console.error('写真取り込みエラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// 入力フォルダ一覧を取得するハンドラー
electron_1.ipcMain.handle('get-input-folders', async () => {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const appSettingsPath = path.join(userDataPath, 'appsettings.json');
        if (fs.existsSync(appSettingsPath)) {
            const settings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
            return {
                success: true,
                data: settings.inputPictureFolders || []
            };
        }
        return { success: true, data: [] };
    }
    catch (error) {
        console.error('入力フォルダ取得エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// 入力フォルダから削除するハンドラー
electron_1.ipcMain.handle('remove-input-folder', async (_, folderPath) => {
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const appSettingsPath = path.join(userDataPath, 'appsettings.json');
        if (fs.existsSync(appSettingsPath)) {
            const settings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
            if (settings.inputPictureFolders) {
                // 指定されたフォルダを配列から削除
                settings.inputPictureFolders = settings.inputPictureFolders.filter((path) => path !== folderPath);
                // 設定を保存
                fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2));
            }
            return {
                success: true,
                data: settings.inputPictureFolders
            };
        }
        return { success: false, error: '設定ファイルが見つかりません' };
    }
    catch (error) {
        console.error('フォルダ削除エラー:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// 写真スキャン処理を実行するハンドラー
electron_1.ipcMain.handle('scan-photos', async () => {
    try {
        // APIサーバーが起動しているか確認
        if (!appState.apiServerRunning) {
            console.log('APIサーバーが起動していないため、起動を試みます');
            const started = await startPythonApiServer();
            if (!started) {
                return { success: false, error: 'APIサーバーの起動に失敗しました' };
            }
        }
        // 設定から入力フォルダを取得
        const userDataPath = electron_1.app.getPath('userData');
        const appSettingsPath = path.join(userDataPath, 'appsettings.json');
        if (!fs.existsSync(appSettingsPath)) {
            return { success: false, error: '設定ファイルが見つかりません' };
        }
        const settings = JSON.parse(fs.readFileSync(appSettingsPath, 'utf8'));
        const inputFolders = settings.inputPictureFolders || [];
        if (inputFolders.length === 0) {
            return { success: false, error: '写真フォルダが設定されていません' };
        }
        // スキャン開始メッセージをレンダラープロセスに送信
        if (mainWindow) {
            mainWindow.webContents.send('photos-scan-status', {
                status: 'scanning',
                message: 'スキャンを開始しています...'
            });
        }
        // API呼び出し関数
        const callApi = (endpoint, method, data) => {
            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'localhost',
                    port: appState.apiServerPort,
                    path: endpoint,
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };
                const req = http.request(options, (res) => {
                    let responseData = '';
                    res.on('data', (chunk) => {
                        responseData += chunk;
                    });
                    res.on('end', () => {
                        try {
                            const data = JSON.parse(responseData);
                            resolve(data);
                        }
                        catch (error) {
                            reject(new Error('レスポンスの解析に失敗しました: ' + responseData));
                        }
                    });
                });
                req.on('error', (error) => {
                    reject(error);
                });
                if (data) {
                    req.write(JSON.stringify(data));
                }
                req.end();
            });
        };
        // 写真スキャンAPIを呼び出し
        const scanResult = await callApi('/api/photos/scan', 'POST', { folders: inputFolders });
        // スキャン完了メッセージをレンダラープロセスに送信
        if (mainWindow) {
            mainWindow.webContents.send('photos-scan-status', {
                status: 'completed',
                message: 'スキャンが完了しました',
                result: scanResult
            });
        }
        return {
            success: true,
            data: scanResult
        };
    }
    catch (error) {
        console.error('写真スキャンエラー:', error);
        // エラーメッセージをレンダラープロセスに送信
        if (mainWindow) {
            mainWindow.webContents.send('photos-scan-status', {
                status: 'error',
                message: error instanceof Error ? error.message : '不明なエラーが発生しました'
            });
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
});
// ファイルサイズのフォーマット関数
const formatSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} B`;
    }
    else if (sizeInBytes < 1024 * 1024) {
        return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    }
    else if (sizeInBytes < 1024 * 1024 * 1024) {
        return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    else {
        return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
};
// APIリクエストを処理する関数
const handleApiCall = async (request) => {
    var _a;
    try {
        console.log('API呼び出し:', request);
        // フォルダ一覧取得のエンドポイント
        if (request.endpoint === 'folders' && request.method === 'GET') {
            return getFolders((_a = request.data) === null || _a === void 0 ? void 0 : _a.path);
        }
        // 月別フォルダ一覧取得のエンドポイント
        if (request.endpoint === 'monthlyFolders' && request.method === 'GET') {
            return getMonthlyFolders(request.data);
        }
        // 圧縮処理のエンドポイント
        if (request.endpoint === 'compress' && request.method === 'RUN') {
            return compressFolder(request.data);
        }
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
                // 選択された画像の枚数
                const imageCount = imageIds.length;
                const imageCountStr = imageCount.toString();
                // ワールドURLを生成
                const worldUrl = `https://vrchat.com/home/launch?worldId=${dummyMetadata.worldId}`;
                // テンプレートを処理 - $count$ を確実に置換
                let generatedText = template.content
                    .replace(/\$world_name\$/g, dummyMetadata.worldName)
                    .replace(/\$world_id\$/g, dummyMetadata.worldId)
                    .replace(/\$world_url\$/g, worldUrl)
                    .replace(/\$capture_time\$/g, dummyMetadata.captureTime)
                    .replace(/\$friends\$/g, dummyMetadata.friends)
                    .replace(/\$file_name\$/g, dummyMetadata.fileName)
                    .replace(/\$count\$/g, imageCountStr); // 画像の枚数で$count$を置き換え
                console.log('生成されたテキスト:', generatedText); // デバッグ用ログ
                console.log('画像枚数:', imageCount); // デバッグ用ログ
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
        // 拡張機能の検索・インストール（開発用）
        if (request.endpoint === 'extensions') {
            if (request.method === 'SEARCH') {
                const dummyExtensions = [
                    { id: 'ext1', name: 'サンプル拡張機能1', description: '説明テキスト1', version: '1.0.0' },
                    { id: 'ext2', name: 'サンプル拡張機能2', description: '説明テキスト2', version: '1.2.0' }
                ];
                return {
                    success: true,
                    data: dummyExtensions
                };
            }
            if (request.method === 'INSTALL') {
                const { id } = request.data;
                if (!id) {
                    return { success: false, error: '拡張機能IDは必須です' };
                }
                // 拡張機能のインストールをシミュレート
                return {
                    success: true,
                    data: {
                        id,
                        status: 'installed',
                        message: `拡張機能 ${id} がインストールされました。`
                    }
                };
            }
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
// アプリケーション起動時の処理
electron_1.app.on('ready', async () => {
    console.log('===== Electron アプリ起動開始 =====');
    // アプリケーションデータディレクトリの準備
    const userDataPath = electron_1.app.getPath('userData');
    console.log('ユーザーデータパス:', userDataPath);
    // アプリケーションデータディレクトリが存在しない場合は作成
    if (!fs.existsSync(userDataPath)) {
        console.log('ユーザーデータディレクトリが存在しないため作成します');
        fs.mkdirSync(userDataPath, { recursive: true });
    }
    // 起動フラグファイルを作成（ランチャーが起動を検出できるようにするため）
    const flagFilePath = path.join(userDataPath, '.app_running');
    fs.writeFileSync(flagFilePath, new Date().toISOString());
    console.log('起動フラグファイル作成:', flagFilePath);
    // Pythonバックエンドサーバーを起動
    console.log('バックエンドAPIサーバーの起動を開始します');
    await startPythonApiServer();
    // メインウィンドウを作成
    console.log('メインウィンドウ作成開始');
    createWindow();
    console.log('メインウィンドウ作成完了');
});
// アプリ終了時にフラグファイルを削除
electron_1.app.on('will-quit', () => {
    // 終了フラグを設定
    appState.isQuitting = true;
    // Pythonバックエンドサーバーを停止
    stopPythonApiServer();
    try {
        const userDataPath = electron_1.app.getPath('userData');
        const flagFilePath = path.join(userDataPath, '.app_running');
        if (fs.existsSync(flagFilePath)) {
            fs.unlinkSync(flagFilePath);
        }
    }
    catch (error) {
        console.error('フラグファイル削除エラー:', error);
    }
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
function getMonthlyFolders(data) {
    throw new Error('Function not implemented.');
}
//# sourceMappingURL=main.js.map