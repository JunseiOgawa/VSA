import React, { useState } from 'react';
import { 
  CssBaseline, 
  ThemeProvider as MuiThemeProvider, 
  createTheme,
  Typography,
  Box,
  CircularProgress,
  AppBar,
  Toolbar,
  Container
} from '@mui/material';
import SideMenu from './components/SideMenu';
import Home from './components/home/Home';
import Photos from './components/Photos';
import Albums from './components/Albums';
import Compress from './components/Compress';
import AdvancedSearch from './components/AdvancedSearch';
import { useTheme } from './contexts/ThemeContext';
import './App.css';

function App() {
  // カスタムテーマコンテキストからテーマモードを取得
  const { mode } = useTheme();
  
  // アプリケーションの状態
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // メニュー関連の状態
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [selectedMenu, setSelectedMenu] = useState<string>('home'); // デフォルトをhomeに変更

  // テーマの色設定
  const lightTheme = {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#666666',
    },
  };

  const darkTheme = {
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
    text: {
      primary: '#ffffff',
      secondary: '#bbbbbb',
    },
  };

  // モードに応じたテーマを作成
  const theme = createTheme({
    palette: {
      mode: mode,
      ...(mode === 'light' ? lightTheme : darkTheme),
    },
  });

  // メニュー選択ハンドラー
  const handleMenuSelect = (menuId: string) => {
    setSelectedMenu(menuId);
  };

  // メニューの開閉を制御
  const handleMenuOpenChange = (isOpen: boolean) => {
    setMenuOpen(isOpen);
  };

  // 読み込み中の表示
  if (loading) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <CircularProgress />
        </Box>
      </MuiThemeProvider>
    );
  }

  // エラー表示
  if (error) {
    return (
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </MuiThemeProvider>
    );
  }

  // 選択されたメニューに応じたコンテンツを表示する関数
  const renderContent = () => {
    switch (selectedMenu) {
      case 'home':
        return <Home />;
      case 'photos':
        return <Photos />;
      case 'albums':
        return <Albums />;
      case 'compress':
        return <Compress />;
      case 'advanced-search':
        return <AdvancedSearch />;
      default:
        return <Home />;
    }
  };

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        {/* 左側メニュー */}
        <SideMenu 
          open={menuOpen} 
          onSelectMenu={handleMenuSelect} 
          selectedMenu={selectedMenu}
          onOpenChange={handleMenuOpenChange}
        />
        
        {/* メインコンテンツ */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${menuOpen ? 240 : 8}px)` },
            ml: { sm: menuOpen ? '240px' : '8px' },
            transition: theme => theme.transitions.create(['margin', 'width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.leavingScreen,
            }),
          }}
        >
          <AppBar 
            position="static" 
            color="transparent" 
            elevation={0}
            sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              backgroundColor: mode === 'light' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.2)'
            }}
          >
            <Toolbar>
              <Typography variant="h4" component="h1">
                VRC Snap Archive
              </Typography>
            </Toolbar>
          </AppBar>
          
          {/* 選択されたメニューに基づくコンテンツ */}
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            {renderContent()}
            
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 4 }}>
              VRC Snap Archive © 2023
            </Typography>
          </Container>
        </Box>
      </Box>
    </MuiThemeProvider>
  );
}

export default App;
