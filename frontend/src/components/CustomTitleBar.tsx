import React, { useState, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';

interface CustomTitleBarProps {
  title: string;
}

// エラー回避のための型定義
interface IElectronAPI {
  minimizeWindow: () => Promise<any>;
  maximizeWindow: () => Promise<any>;
  closeWindow: () => Promise<any>;
  isWindowMaximized: () => Promise<boolean>;
}

const CustomTitleBar: React.FC<CustomTitleBarProps> = ({ title }) => {
  const theme = useTheme();
  const [isMaximized, setIsMaximized] = useState(false);
  // windowオブジェクトからelectronAPIを安全に取得
  const electronAPI = (window as any).electronAPI as IElectronAPI | undefined;

  useEffect(() => {
    const checkMaximized = async () => {
      try {
        if (electronAPI && typeof electronAPI.isWindowMaximized === 'function') {
          const maximized = await electronAPI.isWindowMaximized();
          setIsMaximized(maximized);
        }
      } catch (error) {
        console.error('ウィンドウ状態の取得エラー:', error);
      }
    };

    checkMaximized();
    const interval = setInterval(checkMaximized, 1000);
    return () => clearInterval(interval);
  }, [electronAPI]);

  const handleMinimize = async () => {
    try {
      if (electronAPI && typeof electronAPI.minimizeWindow === 'function') {
        await electronAPI.minimizeWindow();
      }
    } catch (error) {
      console.error('ウィンドウ最小化エラー:', error);
    }
  };

  const handleMaximize = async () => {
    try {
      if (electronAPI && typeof electronAPI.maximizeWindow === 'function') {
        await electronAPI.maximizeWindow();
        // 変更後の状態を取得
        if (typeof electronAPI.isWindowMaximized === 'function') {
          const newState = await electronAPI.isWindowMaximized();
          setIsMaximized(newState);
        }
      }
    } catch (error) {
      console.error('ウィンドウ最大化エラー:', error);
    }
  };

  const handleClose = async () => {
    try {
      if (electronAPI && typeof electronAPI.closeWindow === 'function') {
        await electronAPI.closeWindow();
      }
    } catch (error) {
      console.error('ウィンドウ終了エラー:', error);
    }
  };

  const titleBarStyle = {
    backgroundColor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#f0f0f0',
    color: theme.palette.text.primary,
    WebkitAppRegion: 'drag' as 'drag',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0',
    height: '32px',
    borderBottom: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#ddd'}`,
    zIndex: 1300, 
    position: 'relative' as 'relative' 
  };

  const controlButtonStyle = {
    WebkitAppRegion: 'no-drag' as 'no-drag',
    width: '45px',
    height: '32px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    }
  };

  const closeButtonStyle = {
    ...controlButtonStyle,
    '&:hover': {
      backgroundColor: '#e81123',
      color: 'white'
    }
  };

  const iconColor = theme.palette.mode === 'dark' ? '#fff' : '#000';

  return (
    <Box sx={titleBarStyle}>
      <Typography variant="subtitle1" sx={{ ml: 2, fontWeight: 'medium', flexGrow: 1 }}>
        {title}
      </Typography>
      
      <Box sx={{ 
        display: 'flex', 
        WebkitAppRegion: 'no-drag',
        marginRight: 0
      }}>
        <button
          onClick={handleMinimize}
          style={controlButtonStyle as React.CSSProperties}
          aria-label="最小化"
        >
          <svg width="11" height="1" viewBox="0 0 11 1">
            <path fill={iconColor} d="M11,0v1H0V0H11z" />
          </svg>
        </button>
        
        <button
          onClick={handleMaximize}
          style={controlButtonStyle as React.CSSProperties}
          aria-label={isMaximized ? "元に戻す" : "最大化"}
        >
          {isMaximized ? (
            <svg width="11" height="11" viewBox="0 0 11 11">
              <path fill={iconColor} d="M11,8.5v2.5H8.5V11H0V2.5H2.5V0H11V8.5z M10,1H3.5V2.5H1V10H8.5V8.5H10V1z" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10">
              <path fill={iconColor} d="M0,0v10h10V0H0z M9,9H1V1h8V9z" />
            </svg>
          )}
        </button>
        
        <button
          onClick={handleClose}
          style={closeButtonStyle as React.CSSProperties}
          aria-label="閉じる"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill={iconColor} d="M10,1.01L8.99,0L5,3.99L1.01,0L0,1.01L3.99,5L0,8.99L1.01,10L5,6.01L8.99,10L10,8.99L6.01,5L10,1.01z" />
          </svg>
        </button>
      </Box>
    </Box>
  );
};

export default CustomTitleBar;
