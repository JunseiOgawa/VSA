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
  Alert,
  Snackbar
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { useTemplates, Template } from '../../contexts/TemplateContext';
import TweetTemplateModal from './TweetTemplateModal';
import { SelectChangeEvent } from '@mui/material/Select';

interface TweetGeneratorProps {
  selectedImages?: { id: string; path: string; thumbnailPath?: string }[];
}

const TweetGenerator: React.FC<TweetGeneratorProps> = ({ selectedImages = [] }) => {
  // テンプレートの状態を取得
  const { templates, selectedTemplate, setSelectedTemplate, loadTemplates, isLoading } = useTemplates();
  
  // ローカル状態
  const [templateModalOpen, setTemplateModalOpen] = useState<boolean>(false);
  const [currentEditTemplate, setCurrentEditTemplate] = useState<Template | null>(null);
  const [generatedText, setGeneratedText] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });
  
  // 文字数制限（Twitter標準の140文字）
  const CHARACTER_LIMIT = 140;
  
  // 文字数超過判定
  const isOverCharacterLimit = generatedText.length > CHARACTER_LIMIT;
  
  // 選択された画像が変更されたらテキストをクリア
  useEffect(() => {
    setGeneratedText('');
  }, [selectedImages]);
  
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
    loadTemplates(); // 変更を反映するためにテンプレート一覧を再読み込み
  };
  
  // 投稿文生成ハンドラ
  const handleGenerateText = async () => {
    // テンプレートがないか、選択された画像がない場合はエラー
    if (!selectedTemplate) {
      setError('テンプレートを選択してください');
      return;
    }
    
    if (selectedImages.length === 0) {
      setError('画像を選択してください');
      return;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      if (window.electronAPI) {
        // バックエンドAPIを呼び出してテキスト生成
        const imageIds = selectedImages.map(img => img.id);
        const result = await window.electronAPI.callApi('templates', 'generate-text', { 
          templateId: selectedTemplate.id,
          imageIds
        });
        
        if (result.success && result.data?.text) {
          // 最後に特殊な値の置換をダブルチェック
          let finalText = result.data.text;
          
          // $count$が残っている場合は手動で置換
          if (finalText.includes('$count$')) {
            finalText = finalText.replace(/\$count\$/g, selectedImages.length.toString());
          }
          
          setGeneratedText(finalText);
        } else {
          throw new Error(result.error || '投稿文の生成に失敗しました');
        }
      } else {
        // 開発モード用のダミーテキスト生成
        const worldName = 'サンプルワールド';
        const worldId = 'wrld_00000000-0000-0000-0000-000000000000';
        const captureTime = new Date().toLocaleString();
        const friends = '友人A, 友人B';
        const fileName = 'VRChat_2023-01-01_00-00-00.000';
        
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
          .replace(/\$count\$/g, selectedImages.length.toString())
          .replace(/\$date\$/g, new Date().toLocaleDateString());
        
        // 少し遅延を入れてAPIリクエストをシミュレート
        setTimeout(() => {
          setGeneratedText(dummyText);
        }, 500);
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
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        SNS投稿文生成
      </Typography>
      
      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2}>
          {/* テンプレート選択部分 */}
          <Grid size={{ xs: 12, md: 9 }}>
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
          <Grid size={{ xs: 12, md: 3 }}>
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
          
          {/* 選択された画像のプレビュー */}
          {selectedImages.length > 0 && (
            <Grid size={12}>
              <Typography variant="subtitle1" gutterBottom>
                選択された画像 ({selectedImages.length}/4枚)
              </Typography>
              <Box sx={{ display: 'flex', overflowX: 'auto', gap: 1, pb: 1 }}>
                {selectedImages.map((image, index) => (
                  <Card key={image.id} sx={{ width: 100, flexShrink: 0 }}>
                    <CardMedia
                      component="img"
                      height="100"
                      image={image.thumbnailPath || image.path}
                      alt={`選択画像 ${index + 1}`}
                      sx={{ objectFit: 'cover' }}
                    />
                  </Card>
                ))}
              </Box>
            </Grid>
          )}
          
          {/* 生成ボタン */}
          <Grid size={12}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleGenerateText}
              disabled={isGenerating || !selectedTemplate || selectedImages.length === 0}
              fullWidth
              sx={{ mt: 1 }}
            >
              {isGenerating ? '生成中...' : '投稿文を生成'}
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* 生成されたテキストの表示 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle1">生成された投稿文</Typography>
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
          rows={6}
          variant="outlined"
          value={generatedText}
          error={isOverCharacterLimit}
          helperText={isOverCharacterLimit ? "140文字を超えています" : ""}
          InputProps={{
            readOnly: true,
          }}
          placeholder="テンプレートと画像を選択して「投稿文を生成」ボタンをクリックしてください"
        />
      </Box>
      
      {/* 文字数超過警告 */}
      {isOverCharacterLimit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Twitter投稿の文字数制限（140文字）を超えています。テンプレートを編集してください。
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
      
      {/* テンプレート編集モーダル */}
      <TweetTemplateModal
        open={templateModalOpen}
        onClose={handleCloseTemplateModal}
        currentTemplate={currentEditTemplate}
      />
      
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
    </Paper>
  );
};

export default TweetGenerator;
