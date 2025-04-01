import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

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
    <App />
  </React.StrictMode>
);
