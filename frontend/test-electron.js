const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// メインウィンドウの参照を保持
let mainWindow;

// 起動パラメータを記録
const launchParams = process.argv.slice(2);
console.log('Launch parameters:', launchParams);

// 現在の実行パスなどを記録（デバッグ用）
console.log('App path:', app.getAppPath());
console.log('Current directory:', process.cwd());

function createWindow() {
  // メインウィンドウを作成
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // シンプルなHTMLを表示
  mainWindow.loadURL(`data:text/html,
    <html>
      <head>
        <title>Electron Test</title>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #4285f4; }
          pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <h1>Electronテスト - 起動成功！</h1>
        <p>VRC Snap Archive Kai テスト画面です。</p>
        <p>起動パラメータ: ${JSON.stringify(launchParams)}</p>
        <p>環境情報:</p>
        <pre>
Electronバージョン: ${process.versions.electron}
Chromeバージョン: ${process.versions.chrome}
Nodeバージョン: ${process.versions.node}
プラットフォーム: ${process.platform}
アーキテクチャ: ${process.arch}
実行パス: ${app.getAppPath()}
作業ディレクトリ: ${process.cwd()}
        </pre>
        <button id="close">アプリを閉じる</button>
        <script>
          document.getElementById('close').addEventListener('click', () => {
            window.close();
          });
        </script>
      </body>
    </html>
  `);

  // デバッグツールを開く
  mainWindow.webContents.openDevTools();

  // ウィンドウが閉じられたときの処理
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

// アプリの準備完了時にウィンドウ作成
app.whenReady().then(createWindow);

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', function() {
  if (process.platform !== 'darwin') app.quit();
});

// MacOSでアプリがアクティブになったときの処理
app.on('activate', function() {
  if (mainWindow === null) createWindow();
});

// 起動成功を通知するファイルを作成（ランチャーとの連携用）
app.on('ready', () => {
  try {
    const flagPath = path.join(app.getPath('userData'), 'app-launched.flag');
    fs.writeFileSync(flagPath, new Date().toString());
    console.log('Created launch flag file at:', flagPath);
  } catch (err) {
    console.error('Failed to create flag file:', err);
  }
});