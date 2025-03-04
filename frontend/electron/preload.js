const { ipcRenderer, contextBridge } = require('electron');

// ReactアプリケーションとElectron間のAPIブリッジ
contextBridge.exposeInMainWorld('electronAPI', {
  // Flask APIを呼び出すメソッド
  callApi: (endpoint, method, data) => {
    return ipcRenderer.invoke('call-api', { endpoint, method, data });
  },
  
  // 設定の読み込み
  loadSettings: () => {
    return ipcRenderer.invoke('load-settings');
  },
  
  // 設定の保存
  saveSettings: (settings) => {
    return ipcRenderer.invoke('save-settings', settings);
  }
});