import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// ゲーム設定のインターフェース
interface GameConfigContextType {
    gameName: string;
    setGameName: (name: string) => void;
    gameUrlTemplate: string;
    setGameUrlTemplate: (template: string) => void;
}

// デフォルト値を設定
const defaultGameConfig: GameConfigContextType = {
  gameName: 'がめ',
  setGameName: () => {},
  // ゲームのURLテンプレートこれの後ろにワールドIDを付けてURLを生成する
  gameUrlTemplate: 'https://vrchat.com/home/launch?worldId=$worldId',
  setGameUrlTemplate: () => {},
};

// コンテキストの作成
const GameConfigContext = createContext<GameConfigContextType>(defaultGameConfig);

// コンテキストを使用するためのカスタムフック
export const useGameConfig = () => useContext(GameConfigContext);

// プロバイダーコンポーネント
export const GameConfigProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  const [gameName, setGameName] = useState<string>(defaultGameConfig.gameName);
  const [gameUrlTemplate, setGameUrlTemplate] = useState<string>(defaultGameConfig.gameUrlTemplate);

  // アプリケーションの起動時に設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          const settings = await window.electronAPI.callApi('settings', 'GET');
          if (settings && settings.gameName) {
            setGameName(settings.gameName);
          }
          if (settings && settings.gameUrlTemplate) {
            setGameUrlTemplate(settings.gameUrlTemplate);
          }
        } catch (error) {
          console.error('設定の読み込みに失敗しました:', error);
        }
      }
    };
    
    loadSettings();
  }, []);

  // ゲーム名を変更する関数
  const handleSetGameName = (name: string) => {
    setGameName(name);
    // 設定を保存する処理
    if (window.electronAPI) {
      window.electronAPI.callApi('settings', 'SET', { gameName: name })
        .catch(error => console.error('ゲーム名の保存に失敗しました:', error));
    }
  };

  // ゲームのURL生成テンプレートを変更する関数
  const handleSetGameUrlTemplate = (template: string) => {
    setGameUrlTemplate(template);
    // 設定を保存する処理
    if (window.electronAPI) {
      window.electronAPI.callApi('settings', 'SET', { gameUrlTemplate: template })
        .catch(error => console.error('URLテンプレートの保存に失敗しました:', error));
    }
  };

  return (
    <GameConfigContext.Provider value={{
      gameName,
      setGameName: handleSetGameName,
      gameUrlTemplate,
      setGameUrlTemplate: handleSetGameUrlTemplate
    }}>
      {children}
    </GameConfigContext.Provider>
  );
};