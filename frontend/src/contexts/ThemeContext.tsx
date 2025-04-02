import React, { createContext, useState, useContext, useEffect } from 'react';

// テーマモードの型定義
type ThemeMode = 'light' | 'dark';

// テーマコンテキストの型定義
interface ThemeContextType {
  mode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

// デフォルト値を持つコンテキストの作成
const ThemeContext = createContext<ThemeContextType>({
  mode: 'dark',
  toggleTheme: () => {},
  setThemeMode: () => {},
});

// カスタムフックの作成
export const useTheme = () => useContext(ThemeContext);

// テーマプロバイダーのpropsの型定義
interface ThemeProviderProps {
  children: React.ReactNode;
}

// テーマプロバイダーコンポーネントの作成
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // ローカルストレージから初期テーマを取得（存在しない場合はダークモード）
  const getInitialTheme = (): ThemeMode => {
    // ブラウザ環境でなければダークモードをデフォルトにする
    if (typeof window === 'undefined') return 'dark';
    
    // ローカルストレージから設定を取得
    const savedTheme = localStorage.getItem('theme-mode');
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      return savedTheme;
    }
    
    // Electron APIが存在する場合はそこから設定を取得
    if (window.electronAPI) {
      try {
        // 将来実装予定のElectron APIを呼び出す（今は未実装なので失敗する可能性がある）
        window.electronAPI.callApi('settings', 'GET', { key: 'themeMode' })
          .then((result) => {
            if (result.success && (result.data === 'light' || result.data === 'dark')) {
              return result.data;
            }
            return 'dark';
          })
          .catch(() => 'dark');
      } catch (e) {
        console.error('テーマ設定の取得に失敗しました', e);
      }
    }
    
    // システムの設定に基づいてデフォルトテーマを決定
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
    
    // デフォルトはダークモード
    return 'dark';
  };
  
  // テーマの状態を管理
  const [mode, setMode] = useState<ThemeMode>(getInitialTheme());
  
  // テーマを切り替える関数
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
  };
  
  // 指定されたテーマモードに設定する関数
  const setThemeMode = (newMode: ThemeMode) => {
    setMode(newMode);
  };
  
  // テーマが変更された時の副作用
  useEffect(() => {
    // ローカルストレージに保存
    localStorage.setItem('theme-mode', mode);
    
    // Electron APIが存在する場合はそこにも設定を保存
    if (window.electronAPI) {
      try {
        window.electronAPI.callApi('settings', 'SET', { 
          key: 'themeMode', 
          value: mode 
        }).catch((err) => {
          console.error('テーマ設定の保存に失敗しました', err);
        });
      } catch (e) {
        console.error('テーマ設定の保存に失敗しました', e);
      }
    }
    
    // body要素にテーマ属性を設定
    document.body.setAttribute('data-theme', mode);
  }, [mode]);
  
  // テーマコンテキストの値
  const value = {
    mode,
    toggleTheme,
    setThemeMode,
  };
  
  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
