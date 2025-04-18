import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  CircularProgress,
  Box,
  Typography,
  Divider,
  Chip,
  Grid,
  Paper
} from '@mui/material';
import { useTemplates, Template } from '../../contexts/TemplateContext';

interface TweetTemplateModalProps {
  open: boolean;
  onClose: () => void;
  currentTemplate: Template | null;
}

const TweetTemplateModal: React.FC<TweetTemplateModalProps> = ({
  open,
  onClose,
  currentTemplate
}) => {
  // 状態管理
  const [name, setName] = useState<string>('');
  const [content, setContent] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // テンプレートコンテキストを使用
  const { addTemplate, updateTemplate } = useTemplates();
  
  // モーダルが開かれたときにテンプレートから値を設定
  useEffect(() => {
    if (open) {
      if (currentTemplate) {
        setName(currentTemplate.name);
        setContent(currentTemplate.content);
      } else {
        // 新規作成時はデフォルト値に
        setName('');
        setContent('');
      }
      setError(null);
    }
  }, [open, currentTemplate]);
  
  // 保存ハンドラ
  const handleSave = async () => {
    // バリデーション
    if (!name.trim()) {
      setError('テンプレート名は必須です');
      return;
    }
    
    if (!content.trim()) {
      setError('テンプレート内容は必須です');
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      // 新規作成または更新
      if (currentTemplate) {
        // 既存テンプレートの更新
        await updateTemplate({
          ...currentTemplate,
          name,
          content
        });
      } else {
        // 新規テンプレートの作成
        await addTemplate({
          name,
          content
        });
      }
      
      // モーダルを閉じる
      onClose();
    } catch (err) {
      console.error('テンプレート保存エラー:', err);
      setError(err instanceof Error ? err.message : '保存中にエラーが発生しました');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 変数を挿入するハンドラ
  const insertVariable = (variable: string) => {
    // カーソル位置または末尾に変数を挿入
    const textField = document.getElementById('template-content') as HTMLTextAreaElement;
    if (textField) {
      const startPos = textField.selectionStart || 0;
      const endPos = textField.selectionEnd || 0;
      
      // テキストの前半と後半を分割して変数を挿入
      const newContent = content.substring(0, startPos) + variable + content.substring(endPos);
      setContent(newContent);
      
      // 挿入後にフォーカスと選択位置を設定
      setTimeout(() => {
        textField.focus();
        const newCursorPos = startPos + variable.length;
        textField.setSelectionRange(newCursorPos, newCursorPos);
      }, 50);
    } else {
      // フォールバック：末尾に追加
      setContent(prevContent => prevContent + variable);
    }
  };
  
  // 利用可能な変数のリスト
  const variables = [
    { name: 'ワールド名', variable: '$world_name$' },
    { name: 'ワールドID', variable: '$world_id$' },
    { name: 'ワールドURL', variable: '$world_url$' },
    { name: '撮影日時', variable: '$capture_time$' },
    { name: 'フレンド', variable: '$friends$' },
    { name: '写真枚数', variable: '$count$' },
    { name: '現在日付', variable: '$date$' }
  ];
  
  return (
    <Dialog 
      open={open} 
      onClose={isSubmitting ? undefined : onClose}
      fullWidth
      maxWidth="md"
    >
      <DialogTitle>
        {currentTemplate ? 'テンプレートを編集' : '新規テンプレートを作成'}
      </DialogTitle>
      
      <DialogContent dividers>
        {error && (
          <Box sx={{ mb: 2, color: 'error.main' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        )}
        
        <TextField
          autoFocus
          margin="dense"
          id="template-name"
          label="テンプレート名"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mb: 3 }}
          disabled={isSubmitting}
          required
        />
        
        <Typography variant="subtitle1" gutterBottom>
          テンプレート内容
        </Typography>
        
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            以下の変数をクリックして、テンプレートに挿入できます：
          </Typography>
          
          <Grid container spacing={1} sx={{ mb: 2 }}>
            {variables.map((v) => (
              <Grid key={v.variable} size={1}>
                <Chip 
                  label={`${v.name} (${v.variable})`}
                  onClick={() => insertVariable(v.variable)}
                  color="primary"
                  variant="outlined"
                  clickable
                />
              </Grid>
            ))}
          </Grid>
        </Paper>
        
        <TextField
          id="template-content"
          label="テンプレート内容"
          multiline
          rows={10}
          fullWidth
          variant="outlined"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={isSubmitting}
          required
          placeholder="テンプレート内容を入力してください。文章中に変数を使用できます。"
        />
        
        <Box sx={{ mt: 3 }}>
        </Box>
      </DialogContent>
      
      <DialogActions>
        <Button 
          onClick={onClose} 
          disabled={isSubmitting}
        >
          キャンセル
        </Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          color="primary"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : undefined}
        >
          {isSubmitting ? '保存中...' : '保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TweetTemplateModal;
