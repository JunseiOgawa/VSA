import React from 'react';
import { Typography, Paper, Box } from '@mui/material';

const AdvancedSearch: React.FC = () => {
  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" gutterBottom>
        高度な検索
      </Typography>
      <Typography paragraph>
        様々な条件で写真を検索します。
      </Typography>
      <Box sx={{ minHeight: '400px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography color="textSecondary">
          高度な検索機能は現在開発中です
        </Typography>
      </Box>
    </Paper>
  );
};

export default AdvancedSearch;

export {};
