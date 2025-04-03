import React, { useState, useEffect } from 'react';
import {
  Typography,
  Paper,
  Box,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  TextField,
  Button,
  FormControl,
  Select,
  MenuItem,
  Grid,
  Alert,
  Snackbar
} from '@mui/material';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LanguageIcon from '@mui/icons-material/Language';
import StorageIcon from '@mui/icons-material/Storage';
import { useTheme } from '../contexts/ThemeContext';

/**
 * 設定画面コンポーネント
 * アプリケーションの各種設定を管理する画面を提供します
 */
const Settings: React.FC = () => {
  // テーマコンテキストを使用
  const { mode, toggleTheme } = useTheme();
  
  // 設定状態
  const [settings, setSettings] = useState({
    screenshotPath: '',
    outputPath: '',
    language: 'ja',
    autoCompress: false,
  });
  
  // 通知状態
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'warning' | 'info'
  });

  // 初期設定の読み込み
  useEffect(() => {
    const loadSettings = async () => {
      if (window.electronAPI) {
        try {
          // Electron APIから設定を読み込む
          const result = await window.electronAPI.callApi('settings', 'GET', {});
          if (result.success && result.data) {
            // 取得した設定をステートに反映
            setSettings(prevSettings => ({
              ...prevSettings,
              ...result.data
            }));
          }
        } catch (error) {
          console.error('設定の読み込みに失敗しました:', error);
          setNotification({
            open: true,
            message: '設定の読み込みに失敗しました',
            severity: 'error'
          });
        }
      }
    };

    loadSettings();
  }, []);
  
  // フォルダ選択ハンドラ
  const handleBrowseFolder = async (setting: 'screenshotPath' | 'outputPath') => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.browseFolder();
        if (result.success && result.data.filePaths && result.data.filePaths.length > 0) {
          setSettings({
            ...settings,
            [setting]: result.data.filePaths[0]
          });
        }
      } catch (error) {
        console.error('フォルダ選択エラー:', error);
        setNotification({
          open: true,
          message: 'フォルダの選択中にエラーが発生しました',
          severity: 'error'
        });
      }
    } else {
      // Electron API がない場合（ブラウザで実行時など）
      setNotification({
        open: true,
        message: 'この機能はデスクトップアプリでのみ使用できます',
        severity: 'warning'
      });
    }
  };
  
  // 入力フィールド変更ハンドラ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSettings({
      ...settings,
      [name]: value
    });
  };
  
  // スイッチ変更ハンドラ
  const handleSwitchChange = (name: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({
      ...settings,
      [name]: e.target.checked
    });
  };
  
  // 設定保存ハンドラ
  const handleSaveSettings = async () => {
    try {
      // Electron APIを使って設定を保存する
      if (window.electronAPI) {
        const result = await window.electronAPI.callApi('settings', 'SET', settings);
        if (result.success) {
          // 保存成功の通知
          setNotification({
            open: true,
            message: '設定を保存しました',
            severity: 'success'
          });
        } else {
          throw new Error(result.error || '保存に失敗しました');
        }
      } else {
        // Electron APIがない場合はローカルストレージに保存（開発モード用）
        localStorage.setItem('app-settings', JSON.stringify(settings));
        setNotification({
          open: true,
          message: '設定を保存しました（ブラウザモード）',
          severity: 'success'
        });
      }
    } catch (error) {
      console.error('設定保存エラー:', error);
      setNotification({
        open: true,
        message: '設定の保存中にエラーが発生しました',
        severity: 'error'
      });
    }
  };
  
  // 通知を閉じるハンドラ
  const handleCloseNotification = () => {
    setNotification({
      ...notification,
      open: false
    });
  };
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <SettingsIcon sx={{ mr: 1 }} />
          <Typography variant="h5" component="h2">
            設定
          </Typography>
        </Box>
        
        <Divider sx={{ mb: 3 }} />
        
        {/* テーマ設定セクション */}
        <Typography variant="h6" gutterBottom>
          外観
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <DarkModeIcon />
            </ListItemIcon>
            <ListItemText 
              primary="ダークモード" 
              secondary="アプリケーションの表示テーマを切り替えます" 
            />
            <Switch
              edge="end"
              checked={mode === 'dark'}
              onChange={toggleTheme}
              inputProps={{ 'aria-label': 'ダークモード切替' }}
            />
          </ListItem>
          
          <ListItem>
            <ListItemIcon>
              <LanguageIcon />
            </ListItemIcon>
            <ListItemText 
              primary="言語" 
              secondary="アプリケーションの表示言語を選択します" 
            />
            <FormControl variant="outlined" size="small" sx={{ minWidth: 120 }}>
              <Select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value as string})}
              >
                <MenuItem value="ja">日本語</MenuItem>
                <MenuItem value="en">English</MenuItem>
              </Select>
            </FormControl>
          </ListItem>
        </List>
        
        <Divider sx={{ my: 3 }} />
        
        {/* フォルダ設定セクション */}
        <Typography variant="h6" gutterBottom>
          フォルダ設定
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <TextField
                fullWidth
                label="スクリーンショットフォルダ"
                variant="outlined"
                name="screenshotPath"
                value={settings.screenshotPath}
                onChange={handleInputChange}
                placeholder="VRChatのスクリーンショットが保存されているフォルダを選択"
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mr: 1 }}
              />
              <Button 
                variant="contained" 
                startIcon={<FolderIcon />}
                onClick={() => handleBrowseFolder('screenshotPath')}
              >
                参照
              </Button>
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
              <TextField
                fullWidth
                label="出力フォルダ"
                variant="outlined"
                name="outputPath"
                value={settings.outputPath}
                onChange={handleInputChange}
                placeholder="処理したファイルの保存先フォルダを選択"
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mr: 1 }}
              />
              <Button 
                variant="contained" 
                startIcon={<FolderIcon />}
                onClick={() => handleBrowseFolder('outputPath')}
              >
                参照
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 3 }} />
        
        {/* パフォーマンス設定セクション */}
        <Typography variant="h6" gutterBottom>
          パフォーマンス
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText 
              primary="自動圧縮" 
              secondary="新しいスクリーンショットを自動的に圧縮します" 
            />
            <Switch
              edge="end"
              checked={settings.autoCompress}
              onChange={handleSwitchChange('autoCompress')}
              inputProps={{ 'aria-label': '自動圧縮切替' }}
            />
          </ListItem>
        </List>
        
        {/* 保存ボタン */}
        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            設定を保存
          </Button>
        </Box>
      </Paper>
      
      {/* 通知コンポーネント */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={6000} 
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Settings;

export {};
