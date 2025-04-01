import { contextBridge, ipcRenderer } from 'electron';

// API通信用の型定義
interface ApiRequest {
  endpoint: string;
  method: string;
  data?: any;
}

interface AppInfo {
  version: string;
  electronVersion: string;
  chromeVersion: string;
  nodeVersion: string;
}

// APIをウィンドウオブジェクトに安全に公開
contextBridge.exposeInMainWorld('electronAPI', {
  // バックエンドAPIの呼び出し
  callApi: (endpoint: string, method: string, data?: any) => {
    return ipcRenderer.invoke('call-api', { endpoint, method, data });
  },
  
  // フォルダ選択ダイアログを表示
  browseFolder: () => {
    return ipcRenderer.invoke('browseFolder');
  },
  
  // アプリ情報の取得
  getAppInfo: (): AppInfo => {
    return {
      version: '1.0.0',
      electronVersion: process.versions.electron,
      chromeVersion: process.versions.chrome,
      nodeVersion: process.versions.node,
    };
  },
    
  // アプリケーションイベント
  onStatusUpdate: (callback: (data: any) => void) => {
    ipcRenderer.on('status-update', (_, data) => callback(data));
    
    // クリーンアップ関数を返す
    return () => {
      ipcRenderer.removeAllListeners('status-update');
    };
  }
});

// 読み込み完了メッセージ
console.log('Preload script loaded successfully');
