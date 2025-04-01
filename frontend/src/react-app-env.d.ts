/// <reference types="react-scripts" />

// Electronのプリロードで公開されるAPIの型定義
interface ElectronAPI {
  callApi: (endpoint: string, method: string, data?: any) => Promise<any>;
  browseFolder: () => Promise<any>;
  getAppInfo: () => {
    version: string;
    electronVersion: string;
    chromeVersion: string;
    nodeVersion: string;
  };
  onStatusUpdate: (callback: (data: any) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
