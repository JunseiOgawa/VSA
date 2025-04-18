import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { TemplateProvider } from './contexts/TemplateContext';
import { GameConfigProvider } from './contexts/GameConfigContext';
import { BrowserRouter } from 'react-router-dom';

// Electron APIの型拡張
declare global {
  interface Window {
    electronAPI: {
      callApi: (endpoint: string, method: string, data?: any) => Promise<any>;
      browseFolder: () => Promise<any>;
      getAppInfo: () => any;
      onStatusUpdate: (callback: (data: any) => void) => void;
      isWindowMaximized: () => Promise<boolean>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
    }
  }
}

// ルート要素の取得
const rootElement = document.getElementById('root');

// 要素が存在するか確認
if (!rootElement) {
  throw new Error('Root element not found');
}

// Reactルートの作成
const root = ReactDOM.createRoot(rootElement);

// アプリケーションのレンダリング
root.render(
  <React.StrictMode>
    <HashRouter>
      <ThemeProvider>
        <GameConfigProvider>
          <TemplateProvider>
            <App />
          </TemplateProvider>
        </GameConfigProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>
);
