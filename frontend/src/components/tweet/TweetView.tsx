import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  Alert,
  Snackbar,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import { TemplateProvider, useTemplates, Template } from '../../contexts/TemplateContext';
import TweetTemplateModal from './TweetTemplateModal';
import { SelectChangeEvent } from '@mui/material/Select';

// ダミー写真データ（開発用）
const DUMMY_PHOTOS = [
  { id: 'photo1', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+1', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+1' },
  { id: 'photo2', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+2', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+2' },
  { id: 'photo3', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+3', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+3' },
  { id: 'photo4', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+4', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+4' },
  { id: 'photo5', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+5', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+5' },
  { id: 'photo6', path: 'https://via.placeholder.com/300x200?text=VRChat+Photo+6', thumbnailPath: 'https://via.placeholder.com/150x100?text=Thumbnail+6' },
];

// 写真データの型定義
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

const TweetView: React.FC = () => {
  // テンプレート管理コンテキストを使用
  const { 
    templates, 
    selectedTemplate, 
    setSelectedTemplate, 
    loadTemplates, 
    isLoading 
  } = useTemplates();
  
  // 状態管理
  const [photos, setPhotos] = useState<PhotoData[]>(DUMMY_PHOTOS);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoData[]>([]);
  const [templateModalOpen, setTemplateModalOpen] = useState<boolean>(false);
  const [currentEditTemplate, setCurrentEditTemplate] = useState<Template | null>(null);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error' | 'info'
  });
  const [photoBrowserOpen, setPhotoBrowserOpen] = useState<boolean>(false);
  
  // 文字数制限（Twitter標準の140文字）
  const CHARACTER_LIMIT = 140;
  
  // 文字数超過判定
  const isOverCharacterLimit = generatedText.length > CHARACTER_LIMIT;
  
  // 選択された写真が変更されたらテキストをクリア
  useEffect(() => {
    setGeneratedText('');
  }, [selectedPhotos]);
  
  // 写真選択ハンドラ
  const handleSelectPhoto = (photo: PhotoData) => {
    if (selectedPhotos.some(p => p.id === photo.id)) {
      // 選択解除
      setSelectedPhotos(prev => prev.filter(p => p.id !== photo.id));
    } else {
      // 選択追加
      setSelectedPhotos(prev => [...prev, photo]);
    }
  };
  
  // テンプレート変更ハンドラ
  const handleTemplateChange = (event: SelectChangeEvent<string>) => {
    const templateId = event.target.value;
    const template = templates.find(t => t.id === templateId) || null;
    setSelectedTemplate(template);
  };
  
  // 新規テンプレート作成ハンドラ
  const handleCreateTemplate = () => {
    setCurrentEditTemplate(null);
    setTemplateModalOpen(true);
  };
  
  // テンプレート編集ハンドラ
  const handleEditTemplate = () => {
    if (selectedTemplate) {
      setCurrentEditTemplate(selectedTemplate);
      setTemplateModalOpen(true);
    }
  };
  
  // テンプレートモーダルを閉じるハンドラ
  const handleCloseTemplateModal = () => {
    setTemplateModalOpen(false);
    loadTemplates(); // テンプレート一覧を再読み込み
  };
  
  // 写真ブラウザを開くハンドラ
  const handleOpenPhotoBrowser = () => {
    setPhotoBrowserOpen(true);
  };
  
  // 写真ブラウザを閉じるハンドラ
  const handleClosePhotoBrowser = () => {
    setPhotoBrowserOpen(false);
  };
  
  // 選択した写真をクリアするハンドラ
  const handleClearSelectedPhotos = () => {
    setSelectedPhotos([]);
  };
  
  // 投稿文生成ハンドラ
  const handleGenerateText = async () => {
    // テンプレートがないか、選択された画像がない場合はエラー
    if (!selectedTemplate) {
      setError('テンプレートを選択してください');
      return;
    }
    
    if (selectedPhotos.length === 0) {
      setError('画像を選択してください');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      if (window.electronAPI) {
        // バックエンドAPIを呼び出してテキスト生成
        const imageIds = selectedPhotos.map(img => img.id);
        const result = await window.electronAPI.callApi('templates', 'generate-text', { 
          templateId: selectedTemplate.id,
          imageIds
        });
        
        if (result.success && result.data?.text) {
          setGeneratedText(result.data.text);
        } else {
          throw new Error(result.error || '投稿文の生成に失敗しました');
        }
      } else {
        // 開発モード用のダミーテキスト生成
        // 選択された最初の写真のメタデータを使用
        const firstPhoto = selectedPhotos[0];
        const worldName = firstPhoto.metadata?.worldName || 'サンプルワールド';
        const worldId = firstPhoto.metadata?.worldId || 'wrld_00000000-0000-0000-0000-000000000000';
        const captureTime = firstPhoto.metadata?.captureTime || new Date().toLocaleString();
        const friends = firstPhoto.metadata?.friends?.join(', ') || '友人A, 友人B';
        const fileName = firstPhoto.metadata?.fileName || 'VRChat_2023-01-01_00-00-00.000';
        
        // ワールドURLを生成
        const worldUrl = `https://vrchat.com/home/launch?worldId=${worldId}`;
        
        // テンプレートの変数を置換
        const dummyText = selectedTemplate.content
          .replace(/\$world_name\$/g, worldName)
          .replace(/\$world_id\$/g, worldId)
          .replace(/\$world_url\$/g, worldUrl)
          .replace(/\$capture_time\$/g, captureTime)
          .replace(/\$friends\$/g, friends)
          .replace(/\$file_name\$/g, fileName)
          .replace(/\$count\$/g, selectedPhotos.length.toString())
          .replace(/\$date\$/g, new Date().toLocaleDateString());
        
        // 少し遅延を入れてAPIリクエストをシミュレート
        setTimeout(() => {
          setGeneratedText(dummyText);
        }, 800);
      }
    } catch (err) {
      console.error('投稿文生成エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsGenerating(false);
    }
  };
  
  // テキストコピーハンドラ
  const handleCopyText = () => {
    if (!generatedText) return;
    
    try {
      navigator.clipboard.writeText(generatedText);
      setNotification({
        open: true,
        message: 'クリップボードにコピーしました',
        severity: 'success'
      });
    } catch (err) {
      console.error('クリップボードコピーエラー:', err);
      setNotification({
        open: true,
        message: 'コピーに失敗しました',
        severity: 'error'
      });
    }
  };

  // ブラウザでツイートを開くハンドラ
  const handleOpenTweet = () => {
    if (!generatedText || isOverCharacterLimit) return;
    
    // URLエンコード
    const encodedText = encodeURIComponent(generatedText);
    // Twitter Intent URL
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    
    // 新しいウィンドウで開く
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
  };
  
  // 通知を閉じるハンドラ
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };
  
  return (
    <TemplateProvider>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          SNS投稿文生成
        </Typography>
        <Typography variant="body1" paragraph>
          VRChatのスクリーンショットからSNS投稿用のテキストを自動生成します。
          テンプレートを選び、写真を選択してテキストを生成しましょう。
        </Typography>
        
        {/* エラー表示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          {/* 左パネル - テンプレート管理と写真選択 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                テンプレート選択
              </Typography>
              
              <Grid container spacing={2}>
                {/* テンプレート選択部分 */}
                <Grid item xs={12} md={8}>
                  <FormControl fullWidth variant="outlined">
                    <InputLabel id="template-select-label">テンプレート</InputLabel>
                    <Select
                      labelId="template-select-label"
                      id="template-select"
                      value={selectedTemplate?.id || ''}
                      onChange={handleTemplateChange}
                      label="テンプレート"
                    >
                      {templates.length === 0 ? (
                        <MenuItem value="" disabled>
                          {isLoading ? 'テンプレートを読み込み中...' : 'テンプレートがありません'}
                        </MenuItem>
                      ) : (
                        templates.map(template => (
                          <MenuItem key={template.id} value={template.id}>
                            {template.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                  </FormControl>
                </Grid>
                
                {/* テンプレート管理ボタン */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ display: 'flex' }}>
                    {selectedTemplate && (
                      <Button 
                        startIcon={<EditIcon />}
                        variant="outlined"
                        onClick={handleEditTemplate}
                        sx={{ mr: 1, flexGrow: 1 }}
                      >
                        編集
                      </Button>
                    )}
                    <Button 
                      startIcon={<AddIcon />}
                      variant="outlined"
                      onClick={handleCreateTemplate}
                      sx={{ flexGrow: 1 }}
                    >
                      新規
                    </Button>
                  </Box>
                </Grid>
              </Grid>
            </Box>
            
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                写真選択
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<PhotoLibraryIcon />}
                  onClick={handleOpenPhotoBrowser}
                >
                  写真を選択
                </Button>
                
                {selectedPhotos.length > 0 && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={handleClearSelectedPhotos}
                  >
                    選択解除
                  </Button>
                )}
              </Box>
              
              {/* 選択された写真のプレビュー */}
              {selectedPhotos.length > 0 ? (
                <Box>
                  <Typography variant="body2" gutterBottom>
                    選択中: {selectedPhotos.length}枚
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {selectedPhotos.map(photo => (
                      <Card key={photo.id} sx={{ width: 80, height: 80, flexShrink: 0 }}>
                        <CardActionArea onClick={() => handleSelectPhoto(photo)}>
                          <CardMedia
                            component="img"
                            height="80"
                            image={photo.thumbnailPath || photo.path}
                            alt="選択された写真"
                            sx={{ objectFit: 'cover' }}
                          />
                        </CardActionArea>
                      </Card>
                    ))}
                  </Box>
                </Box>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  投稿に含める写真を選択してください
                </Alert>
              )}
            </Box>
            
            {/* 生成ボタン */}
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateText}
              disabled={isGenerating || !selectedTemplate || selectedPhotos.length === 0}
              fullWidth
              sx={{ mt: 2 }}
            >
              {isGenerating ? (
                <>
                  <CircularProgress size={24} sx={{ mr: 1, color: 'white' }} />
                  生成中...
                </>
              ) : '投稿文を生成'}
            </Button>
          </Grid>
          
          {/* 右パネル - 生成されたテキストと情報 */}
          <Grid item xs={12} md={6}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">生成された投稿文</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  {/* 文字数表示 */}
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      mr: 1,
                      color: isOverCharacterLimit ? 'error.main' : 'text.secondary'
                    }}
                  >
                    {generatedText.length} / {CHARACTER_LIMIT}
                  </Typography>
                  
                  {generatedText && (
                    <IconButton onClick={handleCopyText} color="primary" aria-label="コピー">
                      <ContentCopyIcon />
                    </IconButton>
                  )}
                </Box>
              </Box>
              
              <TextField
                fullWidth
                multiline
                rows={12}
                variant="outlined"
                value={generatedText}
                error={isOverCharacterLimit}
                helperText={isOverCharacterLimit ? "140文字を超えています" : ""}
                InputProps={{
                  readOnly: true,
                }}
                placeholder="テンプレートと写真を選択して「投稿文を生成」ボタンをクリックしてください"
              />
            </Box>
            
            {/* 文字数超過警告 */}
            {isOverCharacterLimit && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                【警告】Twitter投稿の文字数制限（140文字）を超えています。
              </Alert>
            )}
            
            {/* ブラウザから投稿するボタン */}
            {generatedText && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleOpenTweet}
                disabled={isOverCharacterLimit}
                startIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>}
                fullWidth
                sx={{ mb: 2 }}
              >
                ブラウザから投稿する
              </Button>
            )}
            
            <Divider sx={{ my: 2 }} />
            
            {/* 使用可能な変数の説明 */}
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                使用可能な変数
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText 
                    primary="$world_name$" 
                    secondary="スクリーンショットに記録されたワールド名" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$world_id$" 
                    secondary="スクリーンショットに記録されたワールドID" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$world_url$" 
                    secondary="VRChatワールドへのURL" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$capture_time$" 
                    secondary="写真の撮影日時" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$friends$" 
                    secondary="一緒にいたフレンド（カンマ区切り）" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$count$" 
                    secondary="選択した写真の枚数" 
                  />
                </ListItem>
                <ListItem>
                  <ListItemText 
                    primary="$date$" 
                    secondary="現在の日付" 
                  />
                </ListItem>
              </List>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* テンプレート編集モーダル */}
      <TweetTemplateModal
        open={templateModalOpen}
        onClose={handleCloseTemplateModal}
        currentTemplate={currentEditTemplate}
      />
      
      {/* 写真ブラウザモーダル */}
      <Dialog 
        open={photoBrowserOpen} 
        onClose={handleClosePhotoBrowser}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>写真を選択</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            {photos.map(photo => (
              <Grid item key={photo.id} xs={6} sm={4} md={3}>
                <Card 
                  sx={{ 
                    border: selectedPhotos.some(p => p.id === photo.id) 
                      ? '2px solid #1976d2' 
                      : '2px solid transparent'
                  }}
                >
                  <CardActionArea onClick={() => handleSelectPhoto(photo)}>
                    <CardMedia
                      component="img"
                      height="120"
                      image={photo.thumbnailPath || photo.path}
                      alt="VRChat写真"
                    />
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePhotoBrowser}>閉じる</Button>
        </DialogActions>
      </Dialog>
      
      {/* 通知 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseNotification} 
          severity={notification.severity}
          variant="filled"
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </TemplateProvider>
  );
};

export default TweetView;
