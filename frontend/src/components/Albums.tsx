import React, { useState } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button, 
  Tabs, 
  Tab, 
  Divider, 
  Card, 
  CardContent,
  Grid,
  IconButton
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CollectionsIcon from '@mui/icons-material/Collections';
import FilterNoneIcon from '@mui/icons-material/FilterNone';
import CreateIcon from '@mui/icons-material/Create';
import AlbumsView from './albums/AlbumsView';

// アルバムモードの種類を定義
type AlbumMode = 'albums' | 'composite';

const Albums: React.FC = () => {
  // 現在のモード（アルバムまたはコンポジット）
  const [mode, setMode] = useState<AlbumMode>('albums');

  // モード変更ハンドラ
  const handleModeChange = (_event: React.SyntheticEvent, newMode: AlbumMode) => {
    setMode(newMode);
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          アルバム
        </Typography>
        <Typography paragraph>
          写真をアルバムとして整理したり、コンポジット画像を作成したりします。
        </Typography>

        {/* モード選択タブ */}
        <Tabs
          value={mode}
          onChange={handleModeChange}
          indicatorColor="primary"
          textColor="primary"
          sx={{ mb: 3 }}
        >
          <Tab 
            value="albums" 
            label="アルバム" 
            icon={<CollectionsIcon />} 
            iconPosition="start"
          />
          <Tab 
            value="composite" 
            label="コンポジット" 
            icon={<FilterNoneIcon />}
            iconPosition="start"
          />
        </Tabs>

        <Divider sx={{ mb: 3 }} />

        {/* モードに応じたコンテンツを表示 */}
        {mode === 'albums' ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              アルバム一覧
            </Typography>
            <Typography paragraph>
              写真をアルバムにまとめて整理できます。
            </Typography>
            <AlbumsView mode="albums" />
          </Box>
        ) : (
          <Box>
            <Typography variant="h6" gutterBottom>
              コンポジット画像作成
            </Typography>
            <Typography paragraph>
              複数の写真を1枚の画像にオシャレに配置できます。
            </Typography>
            <AlbumsView mode="composite" />
          </Box>
        )}
      </Paper>

      {/* 作成済みアルバム表示エリア */}
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          作成済みアルバム
        </Typography>
        <Grid container spacing={3}>
          {/* デモ用のダミーカード */}
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  サンプルアルバム
                </Typography>
                <Box 
                  sx={{ 
                    height: 150, 
                    bgcolor: 'grey.200', 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center' 
                  }}
                >
                  <Typography color="text.secondary">
                    アルバムのサムネイル
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                  <IconButton size="small">
                    <CreateIcon fontSize="small" />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          {/* 新規アルバム作成カード */}
          <Grid item xs={12} sm={6} md={4}>
            <Card 
              variant="outlined" 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                p: 2,
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: 'action.hover'
                }
              }}
            >
              <AddPhotoAlternateIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
              <Typography variant="subtitle1" color="primary">
                新しいアルバムを作成
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Paper>
    </>
  );
};

export default Albums;

export {};
