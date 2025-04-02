import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Photos: React.FC = () => {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        写真
      </Typography>
      <Typography paragraph>
        VRChatのスクリーンショットを表示・管理します。
      </Typography>
      <Box sx={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="textSecondary">
          写真の表示機能は現在開発中です
        </Typography>
      </Box>
    </Paper>
  );
};

export default Photos;

export {};
