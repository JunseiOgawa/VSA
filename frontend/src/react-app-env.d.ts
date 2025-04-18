/// <reference types="react-scripts" />

// Electronのプリロードで公開されるAPIの型定義
interface ElectronAPI {
  // API通信
  callApi: (endpoint: string, method: string, data?: any) => Promise<any>;
  
  // フォルダ操作
  browseFolder: () => Promise<{
    success: boolean;
    path?: string;
    data?: {
      canceled: boolean;
      filePaths: string[];
    }
  }>;
  
  // アプリ情報
  getAppInfo: () => {
    version: string;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
  };
  getAppVersion: () => Promise<string>;
  getAppPaths: () => Promise<any>;
  checkAppStatus: () => Promise<any>;
  checkPreload: () => Promise<any>;
  
  // 写真・フォルダ管理
  importPhotos: (options?: any) => Promise<any>;
  getInputFolders: () => Promise<any>;
  removeInputFolder: (folderPath: string) => Promise<any>;
  scanPhotos: () => Promise<any>;
  
  // APIサーバー管理
  getApiServerStatus: () => Promise<any>;
  restartApiServer: () => Promise<any>;
  
  // イベントリスナー
  onPhotosScanStatus: (callback: (data: any) => void) => () => void;
  onApiServerStatus: (callback: (data: any) => void) => () => void;
  onStatusUpdate: (callback: (data: any) => void) => () => void;
  
  // テーマ設定
  getThemePreference: () => Promise<'light' | 'dark'>;
  setThemePreference: (theme: 'light' | 'dark') => Promise<void>;
  
  // ウィンドウコントロール
  minimizeWindow: () => Promise<any>;
  maximizeWindow: () => Promise<any>;
  closeWindow: () => Promise<any>;
  isWindowMaximized: () => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
