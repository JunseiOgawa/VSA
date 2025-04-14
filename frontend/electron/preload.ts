import { contextBridge, ipcRenderer } from 'electron';

// デバッグフラグ - 必要に応じて有効化
const DEBUG = true;

// デバッグログ関数
function debugLog(...args: any[]) {
  if (DEBUG) {
    console.log('[Preload]', ...args);
  }
}

// 初期化ログ
debugLog('プリロードスクリプト初期化開始');

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

try {
  // APIをウィンドウオブジェクトに安全に公開
  debugLog('ElectronAPIの公開処理開始');
  
  contextBridge.exposeInMainWorld('electronAPI', {
    // バックエンドAPIの呼び出し
    callApi: (endpoint: string, method: string, data?: any) => {
      debugLog(`API呼び出し: ${endpoint}.${method}`, data);
      return ipcRenderer.invoke('call-api', { endpoint, method, data });
    },
    
    // フォルダ選択ダイアログを表示
    browseFolder: () => {
      debugLog('フォルダブラウズダイアログ呼び出し');
      return ipcRenderer.invoke('browseFolder');
    },
    
    // アプリ情報の取得
    getAppInfo: (): AppInfo => {
      debugLog('アプリ情報取得');
      return {
        version: '1.0.0',
        electronVersion: process.versions.electron,
        chromeVersion: process.versions.chrome,
        nodeVersion: process.versions.node,
      };
    },
      
    // アプリケーションイベント
    onStatusUpdate: (callback: (data: any) => void) => {
      debugLog('ステータス更新リスナー設定');
      ipcRenderer.on('status-update', (_, data) => {
        debugLog('ステータス更新受信:', data);
        callback(data);
      });
      
      // クリーンアップ関数を返す
      return () => {
        debugLog('ステータス更新リスナー削除');
        ipcRenderer.removeAllListeners('status-update');
      };
    },
    
    // テーマ設定を取得
    getThemePreference: () => {
      debugLog('テーマ設定取得');
      return ipcRenderer.invoke('get-theme-preference');
    },
    
    // テーマ設定を保存
    setThemePreference: (theme: 'light' | 'dark') => {
      debugLog('テーマ設定保存:', theme);
      return ipcRenderer.invoke('set-theme-preference', theme);
    },
    
    // ウィンドウコントロール関数
    minimizeWindow: () => {
      debugLog('ウィンドウ最小化');
      return ipcRenderer.invoke('window-minimize');
    },
    
    maximizeWindow: () => {
      debugLog('ウィンドウ最大化/復元');
      return ipcRenderer.invoke('window-maximize');
    },
    
    closeWindow: () => {
      debugLog('ウィンドウ閉じる');
      return ipcRenderer.invoke('window-close');
    },
    
    isWindowMaximized: () => {
      // 頻繁に呼ばれる可能性があるため、ログは出力しない
      return ipcRenderer.invoke('window-is-maximized');
    },
    
    // アプリケーション状態の確認
    checkAppStatus: () => {
      debugLog('アプリ状態確認');
      return ipcRenderer.invoke('check-app-status');
    },
    
    // プリロードスクリプトの確認
    checkPreload: () => {
      debugLog('プリロードスクリプト確認');
      return ipcRenderer.invoke('check-preload');
    },
    
    // アプリのバージョン情報
    getAppVersion: () => {
      debugLog('アプリバージョン取得');
      return ipcRenderer.invoke('get-app-version');
    },
    
    // アプリのパス情報
    getAppPaths: () => {
      debugLog('アプリパス情報取得');
      return ipcRenderer.invoke('get-app-paths');
    }
  });
  
  debugLog('electronAPI公開完了');
  
  // テスト用のグローバル変数設定
  (window as any)._testPreloadIsWorking = true;
  debugLog('テスト用グローバル変数設定完了');
} catch (error) {
  console.error('[Preload Error]', error);
}

// 読み込み完了メッセージ
console.log('Preload script loaded successfully');

// DOMコンテンツの読み込み完了を検知
window.addEventListener('DOMContentLoaded', () => {
  debugLog('DOMContentLoaded イベント発生');
  
  // body要素の内容をログ出力
  const bodyContent = document.body.innerHTML;
  debugLog('body内容 (簡易表示):', bodyContent.substring(0, 300) + (bodyContent.length > 300 ? '...' : ''));
  
  // root要素のチェック
  const rootElement = document.getElementById('root');
  debugLog('root要素確認:', rootElement ? 'あり' : 'なし');
});
