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

// フォルダ一覧を取得する関数
const getFolders = async (folderPath: string): Promise<ApiResponse> => {
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
        } catch (err) {
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
  } catch (error) {
    console.error('フォルダ一覧取得エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// 圧縮処理を実行する関数
const compressFolder = async (request: { sourcePath: string, outputPath: string, monthlyCompress: boolean }): Promise<ApiResponse> => {
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
      } catch (err) {
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
    } else {
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
  } catch (error) {
    console.error('圧縮処理エラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// 月別フォルダー一覧を取得する関数
const getMonthlyFolders = async (request: { basePath: string, includeCurrent?: boolean }): Promise<ApiResponse> => {
  try {
    const { basePath, includeCurrent = false } = request;
    
    // 基準パスが指定されていない場合はエラー
    if (!basePath) {
      return { success: false, error: 'ベースフォルダパスが指定されていません' };
    }
    
    // フォルダの存在確認
    if (!fs.existsSync(basePath)) {
      return { success: false, error: '指定されたフォルダが存在しません' };
    }
    
    // 現在の年月を取得
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // フォルダ一覧を取得
    const folders = [];
    const entries = fs.readdirSync(basePath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const folderName = entry.name;
        
        // YYYY-MM形式のフォルダ名を検出
        if (folderName.length === 7 && folderName[4] === '-' && !isNaN(Number(folderName.slice(0, 4))) && !isNaN(Number(folderName.slice(5)))) {
          // 現在月を除外するオプションがある場合
          if (!includeCurrent && folderName === currentYearMonth) {
            continue;
          }
          
          // フォルダ情報を取得
          const folderPath = path.join(basePath, folderName);
          let fileCount = 0;
          let folderSize = 0;
          
          // フォルダサイズと内容を計算
          // 注: 大規模フォルダの場合は非常に時間がかかる可能性があるため、実際の実装ではより効率的な方法が必要
          try {
            const walkFolder = (dirPath: string) => {
              const items = fs.readdirSync(dirPath, { withFileTypes: true });
              for (const item of items) {
                const itemPath = path.join(dirPath, item.name);
                if (item.isFile()) {
                  fileCount++;
                  folderSize += fs.statSync(itemPath).size;
                } else if (item.isDirectory()) {
                  walkFolder(itemPath);
                }
              }
            };
            
            walkFolder(folderPath);
            
            // フォルダ情報をリストに追加
            folders.push({
              name: folderName,
              path: folderPath,
              fileCount,
              size: folderSize,
              sizeFormatted: formatSize(folderSize),
              lastModified: fs.statSync(folderPath).mtime.toISOString()
            });
          } catch (err) {
            console.error(`フォルダ情報取得エラー ${folderName}:`, err);
          }
        }
      }
    }
    
    // 新しいものから順に並べ替え
    folders.sort((a, b) => b.name.localeCompare(a.name));
    
    return { success: true, data: folders };
  } catch (error) {
    console.error('月別フォルダ取得エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

// ファイルサイズのフォーマット関数
const formatSize = (sizeInBytes: number): string => {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  } else if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  } else if (sizeInBytes < 1024 * 1024 * 1024) {
    return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
};

// APIリクエストを処理する関数
const handleApiCall = async (request: { endpoint: string, method: string, data?: any }): Promise<ApiResponse> => {
  try {
    console.log('API呼び出し:', request);
    
    // フォルダ一覧取得のエンドポイント
    if (request.endpoint === 'folders' && request.method === 'GET') {
      return getFolders(request.data?.path);
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
      const userDataPath = app.getPath('userData');
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
        const templateIndex = settings.main.templates.findIndex((t: any) => t.id === id);
        
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
        settings.main.templates = settings.main.templates.filter((t: any) => t.id !== id);
        
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
        const template = settings.main.templates.find((t: any) => t.id === templateId);
        
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
        
        // 文字列の中に "$count$" が残っていれば、再度置換を試みる
        if (generatedText.includes('$count$')) {
          generatedText = generatedText.replace(/\$count\$/g, imageCountStr);
        }
        
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
    
    // その他のエンドポイントのハンドリング（既存の処理）
    return { 
      success: true, 
      data: { 
        message: 'API呼び出し成功', 
        requestData: request 
      } 
    };
  } catch (error) {
    console.error('API呼び出しエラー:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// メインウィンドウ作成関数
function createWindow(): void {
  // テーマ設定を読み込む
  let darkMode = true;
  try {
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      darkMode = settings.themeMode !== 'light'; // lightでなければdarkモード
    }
  } catch (error) {
    console.error('テーマ設定の読み込みエラー:', error);
  }

  // ウィンドウサイズとオプションを設定
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    minHeight: 400,
    minWidth: 600,
    frame: false, // フレームレスウィンドウに設定
    backgroundColor: darkMode ? '#121212' : '#f5f5f5', // テーマに基づく背景色
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
    // パスの計算を修正：__dirnameは dist/electron になるので、正しく遡る
    const indexPath = path.join(__dirname, '../../build/index.html');
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

// APIハンドラー登録
ipcMain.handle('call-api', async (_, request) => {
  const { endpoint, method, data } = request;
  
  // 設定関連のエンドポイント処理
  if (endpoint === 'settings') {
    try {
      const userDataPath = app.getPath('userData');
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
    } catch (error) {
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
ipcMain.handle('browseFolder', showFolderDialog);

// テーマ設定を取得するハンドラー
ipcMain.handle('get-theme-preference', async () => {
  try {
    // ユーザーデータディレクトリからテーマ設定を読み込む
    const userDataPath = app.getPath('userData');
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
  } catch (error) {
    console.error('テーマ設定の読み込みエラー:', error);
    return 'dark'; // エラー時はダークモード
  }
});

// テーマ設定を保存するハンドラー
ipcMain.handle('set-theme-preference', async (_, theme: 'light' | 'dark') => {
  try {
    // ユーザーデータディレクトリに設定を保存
    const userDataPath = app.getPath('userData');
    const settingsPath = path.join(userDataPath, 'settings.json');
    
    // 既存の設定を読み込むか、新しい設定オブジェクトを作成
    let settings: any = {};
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
  } catch (error) {
    console.error('テーマ設定の保存エラー:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// ウィンドウコントロール用のIPCハンドラーを追加
ipcMain.handle('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
  return { success: true };
});

ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
  return { success: true };
});

ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
  return { success: true };
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow ? mainWindow.isMaximized() : false;
});

// アプリケーション起動時の処理
app.on('ready', () => {
  // アプリケーションデータディレクトリの準備
  const userDataPath = app.getPath('userData');
  
  // アプリケーションデータディレクトリが存在しない場合は作成
  if (!fs.existsSync(userDataPath)) {
    fs.mkdirSync(userDataPath, { recursive: true });
  }
  
  // 起動フラグファイルを作成（ランチャーが起動を検出できるようにするため）
  const flagFilePath = path.join(userDataPath, '.app_running');
  fs.writeFileSync(flagFilePath, new Date().toISOString());
  
  // メインウィンドウを作成
  createWindow();
});

// アプリ終了時にフラグファイルを削除
app.on('will-quit', () => {
  try {
    const userDataPath = app.getPath('userData');
    const flagFilePath = path.join(userDataPath, '.app_running');
    if (fs.existsSync(flagFilePath)) {
      fs.unlinkSync(flagFilePath);
    }
  } catch (error) {
    console.error('フラグファイル削除エラー:', error);
  }
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
