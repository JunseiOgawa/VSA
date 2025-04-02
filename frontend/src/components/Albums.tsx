import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Albums: React.FC = () => {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        アルバム
      </Typography>
      <Typography paragraph>
        写真をアルバムとして整理します。
      </Typography>
      <Box sx={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="textSecondary">
          アルバム機能は現在開発中です
        </Typography>
      </Box>
    </Paper>
  );
};

export default Albums;

export {};
