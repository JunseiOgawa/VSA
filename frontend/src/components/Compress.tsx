import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const Compress: React.FC = () => {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        圧縮
      </Typography>
      <Typography paragraph>
        写真を圧縮して容量を削減します。
      </Typography>
      <Box sx={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="textSecondary">
          圧縮機能は現在開発中です
        </Typography>
      </Box>
    </Paper>
  );
};

export default Compress;

export {};
