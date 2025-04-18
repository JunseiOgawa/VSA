import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, 
  Paper, Alert
} from '@mui/material';
import Grid from '@mui/material/Grid';
import FolderIcon from '@mui/icons-material/Folder';

// 型定義
interface PathSectionProps {
  settings: {
    screenshotPath: string;
    outputPath: string;
    [key: string]: any;
  };
  onSettingsChange: (newSettings: any) => void;
}

const PathSection: React.FC<PathSectionProps> = ({ settings, onSettingsChange }) => {
  // ローカル状態
  const [screenshotPath, setScreenshotPath] = useState<string>(settings.screenshotPath || '');
  const [outputPath, setOutputPath] = useState<string>(settings.outputPath || '');
  const [error, setError] = useState<string | null>(null);

  // 設定が変更されたら内部の状態も更新
  useEffect(() => {
    setScreenshotPath(settings.screenshotPath || '');
    setOutputPath(settings.outputPath || '');
  }, [settings]);

  // スクリーンショットパス変更ハンドラ
  const handleScreenshotPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScreenshotPath(e.target.value);
    onSettingsChange({
      ...settings,
      screenshotPath: e.target.value
    });
  };

  // 出力パス変更ハンドラ
  const handleOutputPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOutputPath(e.target.value);
    onSettingsChange({
      ...settings,
      outputPath: e.target.value
    });
  };

  // フォルダ選択ダイアログハンドラ
  const browseFolder = async (pathType: 'screenshot' | 'output') => {
    try {
      setError(null);
      
      // window.electronAPIの存在チェック
      if (!window.electronAPI) {
        console.error('electronAPI is not available');
        setError('Electron APIにアクセスできません');
        return;
      }
      
      // Electron APIを使用してフォルダ選択ダイアログを表示
      const result = await window.electronAPI.browseFolder();
      
      if (result.success && result.data && result.data.filePaths?.length > 0) {
        const selectedPath = result.data.filePaths[0];
        
        if (pathType === 'screenshot') {
          setScreenshotPath(selectedPath);
          onSettingsChange({
            ...settings,
            screenshotPath: selectedPath
          });
        } else {
          setOutputPath(selectedPath);
          onSettingsChange({
            ...settings,
            outputPath: selectedPath
          });
        }
      }
    } catch (error) {
      console.error('フォルダ選択エラー:', error);
      setError('フォルダの選択中にエラーが発生しました');
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        パス設定
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <Grid container spacing={2}>
        <Grid size={12}>
          <Box display="flex" alignItems="center">
            <TextField
              label="スクリーンショットフォルダ"
              variant="outlined"
              fullWidth
              value={screenshotPath}
              onChange={handleScreenshotPathChange}
              margin="normal"
              helperText="VRChatのスクリーンショットが保存されているフォルダを選択してください"
            />
            <Button 
              variant="contained"
              startIcon={<FolderIcon />}
              onClick={() => browseFolder('screenshot')}
              sx={{ ml: 1, mt: 1 }}
            >
              参照
            </Button>
          </Box>
        </Grid>
        
        <Grid size={12}>
          <Box display="flex" alignItems="center">
            <TextField
              label="出力先フォルダ"
              variant="outlined"
              fullWidth
              value={outputPath}
              onChange={handleOutputPathChange}
              margin="normal"
              helperText="整理されたスクリーンショットの保存先フォルダを選択してください"
            />
            <Button 
              variant="contained"
              startIcon={<FolderIcon />}
              onClick={() => browseFolder('output')}
              sx={{ ml: 1, mt: 1 }}
            >
              参照
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default PathSection;
