import React, { useState } from 'react';
import { Typography, Paper, Box, Button, Divider, Grid } from '@mui/material';
import TweetIcon from '@mui/icons-material/Twitter';
import Tweet from './Tweet';
import { useGameConfig } from '../contexts/GameConfigContext';

// 仮の写真データ型
interface PhotoData {
  id: string;
  path: string;
  thumbnailPath?: string;
}

const Photos: React.FC = () => {
  // 選択された写真の状態
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoData[]>([]);
  
  // ツイート生成表示状態
  const [showTweetGenerator, setShowTweetGenerator] = useState<boolean>(false);
  const { gameName } = useGameConfig();
  
  // 写真選択ハンドラ（実際の実装では写真一覧から選択）
  const handleSelectPhoto = (photo: PhotoData) => {
    if (selectedPhotos.some(p => p.id === photo.id)) {
      // 既に選択されている場合は削除
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else {
      // 選択されていない場合は追加
      setSelectedPhotos(prev => [...prev, photo]);
    }
  };
  
  // SNS投稿モードトグル
  const handleToggleTweetGenerator = () => {
    setShowTweetGenerator(prev => !prev);
  };

  return (
    <>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          写真
        </Typography>
        <Typography paragraph>
          {gameName}で撮影したスクリーンショットを閲覧・管理します。
        </Typography>
        
        {/* 操作ボタン */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          {selectedPhotos.length > 0 && (
            <Button
              variant="outlined"
              startIcon={<TweetIcon />}
              onClick={handleToggleTweetGenerator}
            >
              {showTweetGenerator ? 'SNS投稿機能を閉じる' : 'SNS投稿文を作成'}
            </Button>
          )}
        </Box>
        
        {/* ダミー写真表示（実際の実装ではPhotoGridコンポーネントなど） */}
        <Box sx={{ minHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Typography color="textSecondary">
            写真一覧表示機能は開発中です
          </Typography>
        </Box>
        
        {/* 選択された写真用のダミー処理（開発用） */}
        {selectedPhotos.length === 0 && (
          <Box sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                // ダミー写真を選択
                setSelectedPhotos([
                  { id: 'photo1', path: '/path/to/photo1.jpg' },
                  { id: 'photo2', path: '/path/to/photo2.jpg' }
                ]);
              }}
            >
              ダミー写真を選択（開発用）
            </Button>
          </Box>
        )}
        
        {/* 選択された写真の表示 */}
        {selectedPhotos.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              選択された写真: {selectedPhotos.length}枚
            </Typography>
            <Grid container spacing={1}>
              {selectedPhotos.map(photo => (
                <Grid item key={photo.id} xs={6} sm={4} md={3} lg={2}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 1,
                      height: 100,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                  >
                    <Typography variant="body2">
                      {photo.id}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}
      </Paper>
      
      {/* SNS投稿文生成コンポーネント */}
      {showTweetGenerator && selectedPhotos.length > 0 && (
        <Tweet selectedImages={selectedPhotos} />
      )}
    </>
  );
};

export default Photos;

export {};
