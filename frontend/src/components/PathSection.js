import React, { useState } from 'react';
import { 
  Box, Typography, TextField, Button, 
  Paper
} 
from '@mui/material';
import Grid from '@mui/material/Unstable_Grid2';
import FolderIcon from '@mui/icons-material/Folder';

const PathSection = ({ settings, onSettingsChange }) => {
  const [screenshotPath, setScreenshotPath] = useState(settings.screenshotPath || '');
  const [outputPath, setOutputPath] = useState(settings.outputPath || '');

  const handleScreenshotPathChange = (e) => {//スクリーンショット先変更のハンドラ
    setScreenshotPath(e.target.value);
    onSettingsChange({
      ...settings,
      screenshotPath: e.target.value
    });
  };

  const handleOutputPathChange = (e) => {
    setOutputPath(e.target.value);
    onSettingsChange({
      ...settings,
      outputPath: e.target.value
    });
  };

  const browseFolder = async (pathType) => {
    try {
      // Electronのダイアログを呼び出す
      const result = await window.electronAPI.callApi('browseFolder', 'GET');
      if (result.success && result.data.filePaths?.length > 0) {
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
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        パス設定
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <TextField
              label="スクリーンショットフォルダ"
              variant="outlined"
              fullWidth
              value={screenshotPath}
              onChange={handleScreenshotPathChange}
              margin="normal"
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
        
        <Grid item xs={12}>
          <Box display="flex" alignItems="center">
            <TextField
              label="出力先フォルダ"
              variant="outlined"
              fullWidth
              value={outputPath}
              onChange={handleOutputPathChange}
              margin="normal"
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