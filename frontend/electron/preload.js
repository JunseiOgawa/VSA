// Electron preloadスクリプト - レンダラープロセスとメインプロセスの安全な通信のため

const { contextBridge, ipcRenderer } = require('electron');

// APIをウィンドウオブジェクトに安全に公開
contextBridge.exposeInMainWorld('vrcArchiveAPI', {
  // バックエンドAPIの呼び出し
  callAPI: (endpoint, method, data) => {
    return ipcRenderer.invoke('call-api', { endpoint, method, data });
  },
  
  // アプリ情報の取得
  getAppInfo: () => {
    return {
      version: '1.0.0',
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    };
  },
  
  // アプリケーションイベント
  onStatusUpdate: (callback) => {
    ipcRenderer.on('status-update', (event, data) => callback(data));
  }
});

// 読み込み完了メッセージ
console.log('Preload script loaded successfully');