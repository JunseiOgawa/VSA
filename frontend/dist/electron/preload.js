"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// APIをウィンドウオブジェクトに安全に公開
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // バックエンドAPIの呼び出し
    callApi: (endpoint, method, data) => {
        return electron_1.ipcRenderer.invoke('call-api', { endpoint, method, data });
    },
    // フォルダ選択ダイアログを表示
    browseFolder: () => {
        return electron_1.ipcRenderer.invoke('browseFolder');
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
        electron_1.ipcRenderer.on('status-update', (_, data) => callback(data));
        // クリーンアップ関数を返す
        return () => {
            electron_1.ipcRenderer.removeAllListeners('status-update');
        };
    },
    // テーマ設定を取得
    getThemePreference: () => {
        return electron_1.ipcRenderer.invoke('get-theme-preference');
    },
    // テーマ設定を保存
    setThemePreference: (theme) => {
        return electron_1.ipcRenderer.invoke('set-theme-preference', theme);
    },
    // ウィンドウコントロール関数
    minimizeWindow: () => {
        return electron_1.ipcRenderer.invoke('window-minimize');
    },
    maximizeWindow: () => {
        return electron_1.ipcRenderer.invoke('window-maximize');
    },
    closeWindow: () => {
        return electron_1.ipcRenderer.invoke('window-close');
    },
    isWindowMaximized: () => {
        return electron_1.ipcRenderer.invoke('window-is-maximized');
    }
});
// 読み込み完了メッセージ
console.log('Preload script loaded successfully');
//# sourceMappingURL=preload.js.map