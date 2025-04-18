import React from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';
import CompressIcon from '@mui/icons-material/Compress';
import SearchIcon from '@mui/icons-material/Search';
import SettingsIcon from '@mui/icons-material/Settings';
import TwitterIcon from '@mui/icons-material/Twitter'; // ツイートアイコンを追加
import { useGameConfig } from '../../contexts/GameConfigContext';

// 機能カードのプロパティ型定義
interface FeatureCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
}

// 機能カードコンポーネント
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, onClick }) => {
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardActionArea 
        onClick={onClick}
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'flex-start', 
          p: 2 
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 1, color: 'primary.main' }}>{icon}</Box>
          <Typography variant="h6" component="h2">{title}</Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardActionArea>
    </Card>
  );
};

// ホームコンポーネント
const Home: React.FC = () => {
  // MUIテーマを取得
  const theme = useTheme();
  const { gameName } = useGameConfig();
  
  // 機能カードがクリックされたときの処理
  const handleFeatureClick = (feature: string) => {
    console.log(`${feature}機能がクリックされました`);
    // App.tsx で状態を変更するために、イベントをトリガーする
    window.dispatchEvent(new CustomEvent('menu-select', { detail: { menuId: feature } }));
  };

  return (
    <Box>
      {/* ヒーローセクション */}
      <Paper 
        elevation={3} 
        sx={{ 
          p: 4, 
          mb: 4, 
          borderRadius: 2,
          background: theme.palette.mode === 'dark' 
            ? 'linear-gradient(45deg, #303030 30%, #424242 90%)' 
            : 'linear-gradient(45deg, #f5f5f5 30%, #e0e0e0 90%)'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom>
          VRC Snap Archive へようこそ
        </Typography>
        <Typography variant="subtitle1" paragraph>
          {gameName}スクリーンショットを簡単に管理・整理・検索できるツールです。
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleFeatureClick('photos')}
          >
            写真を見る
          </Button>
        </Box>
      </Paper>

      {/* 機能セクション */}
      <Typography variant="h5" component="h2" gutterBottom>
        全機能
      </Typography>
      <Divider sx={{ mb: 3 }} />
      
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="写真" 
            description="全スクリーンショットの閲覧・検索・管理を行います。" 
            icon={<PhotoLibraryIcon fontSize="large" />}
            onClick={() => handleFeatureClick('photos')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="アルバム" 
            description="お気に入りの写真をアルバムとして整理します。" 
            icon={<PhotoAlbumIcon fontSize="large" />}
            onClick={() => handleFeatureClick('albums')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="圧縮" 
            description="スクリーンショットのサイズを圧縮して容量を節約します。" 
            icon={<CompressIcon fontSize="large" />}
            onClick={() => handleFeatureClick('compress')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="ツイート" 
            description="写真からSNS投稿用のテキストを自動生成します。" 
            icon={<TwitterIcon fontSize="large" />}
            onClick={() => handleFeatureClick('tweet')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="高度な検索" 
            description="詳細な条件で写真を検索できます。" 
            icon={<SearchIcon fontSize="large" />}
            onClick={() => handleFeatureClick('advanced-search')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <FeatureCard 
            title="設定" 
            description="アプリケーションの各種設定を行います。" 
            icon={<SettingsIcon fontSize="large" />}
            onClick={() => handleFeatureClick('settings')}
          />
        </Grid>
      </Grid>
      
      {/* 統計情報セクション */}
      <Paper elevation={2} sx={{ mt: 4, p: 3, borderRadius: 2 }}>
        <Typography variant="h6" gutterBottom>
          統計情報
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              総写真数
            </Typography>
            <Typography variant="h5">
              0
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              アルバム数
            </Typography>
            <Typography variant="h5">
              0
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              総容量
            </Typography>
            <Typography variant="h5">
              0 MB
            </Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">
              最終更新
            </Typography>
            <Typography variant="h5">
              -
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Home;

export {};
