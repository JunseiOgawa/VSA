import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Button, 
  Divider, 
  Card, 
  CardMedia, 
  CardContent, 
  CardActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  IconButton
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import GridViewIcon from '@mui/icons-material/GridView';
import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';

// AlbumsViewコンポーネントのプロパティ
interface AlbumsViewProps {
  mode: 'albums' | 'composite'; // 表示モード
}

// 写真データの型定義（Photos.tsxと同様）
interface PhotoData {
  id: string;
  path: string;
  thumbnailPath?: string;
  metadata?: {
    worldName?: string;
    worldId?: string;
    captureTime?: string;
    friends?: string[];
    fileName?: string;
  };
}

// アルバムデータの型定義
interface AlbumData {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  photos: PhotoData[];
  coverPhoto?: PhotoData;
}

// コンポジットレイアウトの種類
type CompositeLayout = 'grid2x2' | 'grid3x3' | 'collage' | 'filmstrip';

const AlbumsView: React.FC<AlbumsViewProps> = ({ mode }) => {
  // 状態管理
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoData[]>([]);
  const [albumName, setAlbumName] = useState<string>('');
  const [albumDescription, setAlbumDescription] = useState<string>('');
  const [compositeLayout, setCompositeLayout] = useState<CompositeLayout>('grid2x2');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // アルバム作成用ダミー写真データ（実際はAPIから取得）
  const [availablePhotos, setAvailablePhotos] = useState<PhotoData[]>([]);
  
  // 初期データの読み込み
  useEffect(() => {
    // ダミーデータの生成（実際はAPIから取得）
    const dummyPhotos: PhotoData[] = Array.from({ length: 12 }, (_, index) => ({
      id: `photo${index + 1}`,
      path: `https://via.placeholder.com/300x200?text=Photo+${index + 1}`,
      thumbnailPath: `https://via.placeholder.com/150x100?text=Photo+${index + 1}`,
      metadata: {
        worldName: `サンプルワールド ${index % 3 + 1}`,
        captureTime: new Date(Date.now() - index * 86400000).toISOString(),
        friends: [`フレンド${index % 5 + 1}`, `フレンド${index % 7 + 2}`]
      }
    }));
    
    setAvailablePhotos(dummyPhotos);
  }, []);
  
  // 写真選択の切り替え
  const togglePhotoSelection = (photo: PhotoData) => {
    if (selectedPhotos.some(p => p.id === photo.id)) {
      // 選択解除
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else {
      // 選択追加
      setSelectedPhotos(prev => [...prev, photo]);
    }
  };
  
  // アルバム保存処理
  const handleSaveAlbum = async () => {
    if (selectedPhotos.length === 0) {
      setError('写真を選択してください');
      return;
    }
    
    if (!albumName.trim()) {
      setError('アルバム名を入力してください');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (window.electronAPI) {
        // バックエンドAPIを呼び出してアルバムを保存
        const albumData = {
          name: albumName,
          description: albumDescription,
          photoIds: selectedPhotos.map(photo => photo.id)
        };
        
        const result = await window.electronAPI.callApi('albums', 'POST', albumData);
        
        if (result.success) {
          setSuccess('アルバムが正常に保存されました');
          // フォームをリセット
          setAlbumName('');
          setAlbumDescription('');
          setSelectedPhotos([]);
        } else {
          throw new Error(result.error || 'アルバムの保存に失敗しました');
        }
      } else {
        // 開発モード：ローカルストレージに保存
        const newAlbum: AlbumData = {
          id: `album-${Date.now()}`,
          name: albumName,
          description: albumDescription,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photos: selectedPhotos,
          coverPhoto: selectedPhotos[0]
        };
        
        // ローカルストレージから既存のアルバムを取得して追加
        const storedAlbums = localStorage.getItem('vsa-albums');
        const albums = storedAlbums ? JSON.parse(storedAlbums) : [];
        const updatedAlbums = [...albums, newAlbum];
        
        localStorage.setItem('vsa-albums', JSON.stringify(updatedAlbums));
        
        // 成功メッセージの表示
        setSuccess('アルバムが正常に保存されました');
        
        // フォームをリセット
        setAlbumName('');
        setAlbumDescription('');
        setSelectedPhotos([]);
      }
    } catch (err) {
      console.error('アルバム保存エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };
  
  // コンポジット画像作成処理
  const handleCreateComposite = async () => {
    if (selectedPhotos.length === 0) {
      setError('写真を選択してください');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (window.electronAPI) {
        // バックエンドAPIを呼び出してコンポジット画像を生成
        const compositeData = {
          layout: compositeLayout,
          photoIds: selectedPhotos.map(photo => photo.id),
          outputName: albumName || `Composite-${new Date().toISOString().split('T')[0]}`
        };
        
        const result = await window.electronAPI.callApi('composite', 'CREATE', compositeData);
        
        if (result.success) {
          setSuccess('コンポジット画像が正常に作成されました');
          // フォームをリセット
          setAlbumName('');
          setSelectedPhotos([]);
        } else {
          throw new Error(result.error || 'コンポジット画像の作成に失敗しました');
        }
      } else {
        // 開発モード：処理のシミュレーション
        console.log('コンポジット画像を作成します:', {
          layout: compositeLayout,
          photos: selectedPhotos.length
        });
        
        // 成功をシミュレート（時間がかかるように少し遅延）
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        setSuccess('コンポジット画像が正常に作成されました');
        
        // フォームをリセット
        setAlbumName('');
        setSelectedPhotos([]);
      }
    } catch (err) {
      console.error('コンポジット画像作成エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box>
      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* 成功メッセージ */}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {/* アルバム/コンポジット作成フォーム */}
      <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {mode === 'albums' ? (
            <>
              <PhotoAlbumIcon sx={{ mr: 1 }} />
              <Typography variant="h6">新しいアルバムを作成</Typography>
            </>
          ) : (
            <>
              <GridViewIcon sx={{ mr: 1 }} />
              <Typography variant="h6">コンポジット画像を作成</Typography>
            </>
          )}
        </Box>
        
        <Grid container spacing={2}>
          {/* アルバム/コンポジット名入力 */}
          <Grid item xs={12} sm={mode === 'composite' ? 6 : 12}>
            <TextField
              fullWidth
              label={mode === 'albums' ? "アルバム名" : "コンポジット名 (任意)"}
              value={albumName}
              onChange={(e) => setAlbumName(e.target.value)}
              required={mode === 'albums'}
              size="small"
            />
          </Grid>
          
          {/* コンポジットモードの場合のレイアウト選択 */}
          {mode === 'composite' && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>レイアウト</InputLabel>
                <Select
                  value={compositeLayout}
                  label="レイアウト"
                  onChange={(e) => setCompositeLayout(e.target.value as CompositeLayout)}
                >
                  <MenuItem value="grid2x2">グリッド (2x2)</MenuItem>
                  <MenuItem value="grid3x3">グリッド (3x3)</MenuItem>
                  <MenuItem value="collage">コラージュ</MenuItem>
                  <MenuItem value="filmstrip">フィルムストリップ</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          )}
          
          {/* アルバムの場合の説明入力 */}
          {mode === 'albums' && (
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="アルバムの説明 (任意)"
                value={albumDescription}
                onChange={(e) => setAlbumDescription(e.target.value)}
                multiline
                rows={2}
                size="small"
              />
            </Grid>
          )}
          
          {/* 保存/作成ボタン */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              color="primary"
              startIcon={mode === 'albums' ? <SaveIcon /> : <GridViewIcon />}
              onClick={mode === 'albums' ? handleSaveAlbum : handleCreateComposite}
              disabled={isLoading || selectedPhotos.length === 0}
              fullWidth
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : mode === 'albums' ? (
                'アルバムを保存'
              ) : (
                'コンポジット画像を作成'
              )}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 選択済み写真表示エリア */}
      {selectedPhotos.length > 0 && (
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              選択済み写真: {selectedPhotos.length}枚
            </Typography>
            <Button 
              size="small" 
              variant="outlined" 
              color="error"
              onClick={() => setSelectedPhotos([])}
            >
              選択をクリア
            </Button>
          </Box>
          
          <Grid container spacing={1}>
            {selectedPhotos.map(photo => (
              <Grid item key={photo.id} xs={6} sm={4} md={3} lg={2}>
                <Card 
                  variant="outlined" 
                  sx={{ 
                    position: 'relative',
                    '&:hover .delete-button': {
                      opacity: 1
                    }
                  }}
                >
                  <CardMedia
                    component="img"
                    height="100"
                    image={photo.thumbnailPath || photo.path}
                    alt={photo.metadata?.fileName || 'Photo'}
                  />
                  
                  {/* 削除ボタン */}
                  <IconButton
                    className="delete-button"
                    size="small"
                    color="error"
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(255,255,255,0.7)',
                      opacity: 0,
                      transition: 'opacity 0.2s'
                    }}
                    onClick={() => togglePhotoSelection(photo)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
      
      {/* 写真選択エリア */}
      <Box>
        <Typography variant="h6" gutterBottom>
          写真を選択
        </Typography>
        
        {/* 写真一覧 */}
        <Grid container spacing={2}>
          {availablePhotos.map(photo => (
            <Grid item key={photo.id} xs={6} sm={4} md={3} lg={2}>
              <Card 
                variant={selectedPhotos.some(p => p.id === photo.id) ? 'elevation' : 'outlined'}
                elevation={selectedPhotos.some(p => p.id === photo.id) ? 3 : 0}
                sx={{ 
                  cursor: 'pointer',
                  borderColor: selectedPhotos.some(p => p.id === photo.id) ? 'primary.main' : 'divider',
                  position: 'relative'
                }}
                onClick={() => togglePhotoSelection(photo)}
              >
                <CardMedia
                  component="img"
                  height="120"
                  image={photo.thumbnailPath || photo.path}
                  alt={photo.metadata?.fileName || 'Photo'}
                />
                
                {/* 選択インジケーター */}
                {selectedPhotos.some(p => p.id === photo.id) && (
                  <Box 
                    sx={{ 
                      position: 'absolute', 
                      bottom: 8, 
                      right: 8, 
                      bgcolor: 'primary.main',
                      color: 'white',
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.75rem'
                    }}
                  >
                    {selectedPhotos.findIndex(p => p.id === photo.id) + 1}
                  </Box>
                )}
                
                <CardContent sx={{ p: 1 }}>
                  <Typography variant="caption" component="div" noWrap>
                    {photo.metadata?.worldName || 'Unknown'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
          
          {/* 写真が見つからない場合 */}
          {availablePhotos.length === 0 && (
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  bgcolor: 'background.paper', 
                  borderRadius: 1 
                }}
              >
                <PhotoLibraryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">
                  写真が見つかりません
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  写真を追加するか、検索条件を変更してください
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>
    </Box>
  );
};

export default AlbumsView;
