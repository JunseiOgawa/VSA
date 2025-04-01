import React, { useState, useEffect } from 'react';
import { 
  Container, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  Typography,
  Box,
  Paper,
  Button,
  CircularProgress
} from '@mui/material';
import PathSection from './components/PathSection';
import './App.css';

// アプリケーションの設定インターフェース
interface AppSettings {
  screenshotPath: string;
  outputPath: string;
  // 他の設定が必要になったら追加
}

// ダークモード/ライトモード対応のテーマ
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#90caf9',
    },
    secondary: {
      main: '#f48fb1',
    },
  },
});

function App() {
  // アプリケーションの状態
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    screenshotPath: '',
    outputPath: ''
  });

  // 設定変更ハンドラー
  const handleSettingsChange = (newSettings: AppSettings) => {
    setSettings(newSettings);
    // 必要に応じて設定を保存するコードをここに追加
  };

  // 初期設定の読み込み
  useEffect(() => {
    // 仮の非同期読み込み処理
    const loadSettings = async () => {
      try {
        // 実際の実装では、保存された設定を読み込む
        // 例: const result = await window.electronAPI.callApi('settings', 'GET');
        setLoading(false);
      } catch (err) {
        setError('設定の読み込みに失敗しました');
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  // 読み込み中の表示
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // エラー表示
  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ pt: 4, pb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          VRC Snap Archive
        </Typography>
        
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            スクリーンショット管理
          </Typography>
          
          {/* パス設定セクション */}
          <PathSection 
            settings={settings} 
            onSettingsChange={handleSettingsChange} 
          />
          
          {/* 実際のアプリケーションではここに他のUIコンポーネントを追加 */}
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="contained" color="primary">
              スキャン開始
            </Button>
          </Box>
        </Paper>
        
        <Typography variant="body2" color="textSecondary" align="center">
          VRC Snap Archive © 2023
        </Typography>
      </Container>
    </ThemeProvider>
  );
}

export default App;
