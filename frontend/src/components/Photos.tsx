import React, { useState, useEffect, useCallback } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button, 
  Divider, 
  Grid, 
  Alert, 
  AlertTitle, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar
} from '@mui/material';
import TweetIcon from '@mui/icons-material/Twitter';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SyncIcon from '@mui/icons-material/Sync';
import ErrorIcon from '@mui/icons-material/Error';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import Tweet from './Tweet';

// 写真データ型
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

// APIサーバー状態型
interface ApiServerStatus {
  running: boolean;
  port?: number;
  error?: string;
}

// 写真スキャン状態型
interface ScanStatus {
  status: 'idle' | 'scanning' | 'completed' | 'error';
  message?: string;
  result?: any;
}

// フォルダ選択結果の型
interface FolderSelectResult {
  success: boolean;
  path?: string;
  data?: {
    canceled: boolean;
    filePaths: string[];
  };
}

const Photos: React.FC = () => {
  // 基本状態
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoData[]>([]);
  const [showTweetGenerator, setShowTweetGenerator] = useState<boolean>(false);
  
  // 写真取り込み関連の状態
  const [inputFolders, setInputFolders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [apiServerStatus, setApiServerStatus] = useState<ApiServerStatus>({ running: false });
  const [scanStatus, setScanStatus] = useState<ScanStatus>({ status: 'idle' });
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState<string | null>(null);

  // API停止時のエラーダイアログ表示状態
  const [showApiErrorDialog, setShowApiErrorDialog] = useState<boolean>(false);
  
  // APIサーバーステータスの確認
  useEffect(() => {
    const checkApiServer = async () => {
      try {
        if (window.electronAPI) {
          const status = await window.electronAPI.callApi('api/status', 'GET');
          setApiServerStatus(status);
          
          if (!status.running) {
            setShowApiErrorDialog(true);
          }
        }
      } catch (err) {
        console.error('APIサーバーステータス確認エラー:', err);
      }
    };
    
    checkApiServer();
    
    // APIサーバーステータス変更通知のリスナーを設定
    let cleanupListener: () => void;
    if (window.electronAPI && window.electronAPI.onStatusUpdate) {
      cleanupListener = window.electronAPI.onStatusUpdate((data: any) => {
        if (data.type === 'apiServerStatus') {
          const apiStatus = data.data as ApiServerStatus;
          setApiServerStatus(apiStatus);
          
          if (apiStatus.running) {
            setShowApiErrorDialog(false);
          } else {
            setShowApiErrorDialog(true);
          }
        }
      });
    }
    
    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, []);
  
  // 写真スキャン状態通知のリスナーを設定
  useEffect(() => {
    let cleanupListener: () => void;
    if (window.electronAPI && window.electronAPI.onStatusUpdate) {
      cleanupListener = window.electronAPI.onStatusUpdate((data: any) => {
        if (data.type === 'photosScanStatus') {
          const scanData = data.data as ScanStatus;
          setScanStatus(scanData);
          
          if (scanData.status === 'completed') {
            // スキャン完了時の処理
            loadPhotos();
            setSuccess('写真のスキャンが完了しました');
          } else if (scanData.status === 'error') {
            setError(scanData.message || 'スキャン中にエラーが発生しました');
          }
        }
      });
    }
    
    return () => {
      if (cleanupListener) cleanupListener();
    };
  }, []);
  
  // 入力フォルダの読み込み
  const loadInputFolders = useCallback(async () => {
    try {
      if (window.electronAPI) {
        setIsLoading(true);
        const result = await window.electronAPI.callApi('api/folders/input', 'GET');
        
        if (result.success) {
          setInputFolders(result.data || []);
        } else {
          throw new Error(result.error || '入力フォルダの取得に失敗しました');
        }
      }
    } catch (err) {
      console.error('入力フォルダ取得エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // 写真データの読み込み（APIサーバーから）
  const loadPhotos = useCallback(async () => {
    try {
      // ローカルAPIサーバーが起動している場合のみ読み込み
      if (!apiServerStatus.running) {
        console.warn('APIサーバーが起動していないため写真を読み込めません');
        return;
      }
      
      setIsLoading(true);
      
      // 実際のAPIサーバーからのデータ取得
      try {
        const result = await window.electronAPI?.callApi('api/photos', 'GET');
        if (result.success && result.data) {
          setPhotos(result.data);
          return;
        }
      } catch (apiErr) {
        console.warn('APIからの写真読み込みに失敗、ダミーデータを使用します:', apiErr);
      }
      
      // APIからのデータ取得に失敗した場合、ダミーデータを使用
      const dummyPhotos: PhotoData[] = Array.from({ length: 20 }, (_, index) => ({
        id: `photo${index + 1}`,
        path: `https://via.placeholder.com/300x200?text=Photo+${index + 1}`,
        thumbnailPath: `https://via.placeholder.com/150x100?text=Photo+${index + 1}`,
        metadata: {
          worldName: `サンプルワールド ${index % 3 + 1}`,
          captureTime: new Date(Date.now() - index * 86400000).toISOString(),
          friends: [`フレンド${index % 5 + 1}`, `フレンド${index % 7 + 2}`]
        }
      }));
      
      setPhotos(dummyPhotos);
    } catch (err) {
      console.error('写真データ読み込みエラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  }, [apiServerStatus.running]);
  
  // 初期データ読み込み
  useEffect(() => {
    loadInputFolders();
  }, [loadInputFolders]);
  
  // 写真選択ハンドラ
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
  
  // フォルダ選択ダイアログを表示して写真フォルダを追加
  const handleAddPhotosFolder = async () => {
    try {
      if (window.electronAPI) {
        setIsLoading(true);
        // まずフォルダ選択ダイアログを表示
        const folderResult = await window.electronAPI.browseFolder();
        
        if (!folderResult.success || !folderResult.path) {
          // ユーザーがキャンセルした場合やパスが選択されなかった場合
          setIsLoading(false);
          return;
        }
        
        // 選択されたフォルダを写真フォルダとして登録
        const result = await window.electronAPI.callApi('api/folders/input', 'POST', {
          path: folderResult.path
        });
        
        if (result.success) {
          setInputFolders(result.data.inputPictureFolders || []);
          setSuccess('写真フォルダが追加されました');
        } else {
          throw new Error(result.error || result.message || '写真フォルダの追加に失敗しました');
        }
      }
    } catch (err) {
      console.error('写真フォルダ追加エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 入力フォルダを削除確認ダイアログを表示
  const handleConfirmDeleteFolder = (folderPath: string) => {
    setConfirmDeleteFolder(folderPath);
  };
  
  // 入力フォルダを削除
  const handleDeleteFolder = async () => {
    if (!confirmDeleteFolder) return;
    
    try {
      if (window.electronAPI) {
        setIsLoading(true);
        const result = await window.electronAPI.callApi('api/folders/input', 'DELETE', {
          path: confirmDeleteFolder
        });
        
        if (result.success) {
          setInputFolders(result.data || []);
          setSuccess('フォルダが削除されました');
        } else {
          throw new Error(result.error || 'フォルダの削除に失敗しました');
        }
      }
    } catch (err) {
      console.error('フォルダ削除エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
      setConfirmDeleteFolder(null);
    }
  };
  
  // 写真スキャン処理の実行
  const handleScanPhotos = async () => {
    try {
      if (inputFolders.length === 0) {
        setError('写真フォルダが設定されていません');
        return;
      }
      
      if (!apiServerStatus.running) {
        setError('APIサーバーが起動していないためスキャンできません');
        setShowApiErrorDialog(true);
        return;
      }
      
      if (window.electronAPI) {
        setScanStatus({ status: 'scanning', message: 'スキャンを開始しています...' });
        const result = await window.electronAPI.callApi('api/photos/scan', 'POST');
        
        if (!result.success) {
          throw new Error(result.error || 'スキャン処理の開始に失敗しました');
        }
      }
    } catch (err) {
      console.error('写真スキャンエラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
      setScanStatus({ status: 'error', message: err instanceof Error ? err.message : '不明なエラーが発生しました' });
    }
  };
  
  // APIサーバーの再起動
  const handleRestartApiServer = async () => {
    try {
      setIsLoading(true);
      if (window.electronAPI) {
        const result = await window.electronAPI.callApi('api/server/restart', 'POST');
        
        if (result.success) {
          setSuccess('APIサーバーを再起動しました');
        } else {
          throw new Error('APIサーバーの再起動に失敗しました');
        }
      }
    } catch (err) {
      console.error('APIサーバー再起動エラー:', err);
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* エラー通知 */}
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={() => setError(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      </Snackbar>
      
      {/* 成功通知 */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={3000} 
        onClose={() => setSuccess(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      </Snackbar>
      
      {/* APIサーバーエラーダイアログ */}
      <Dialog open={showApiErrorDialog} onClose={() => setShowApiErrorDialog(false)}>
        <DialogTitle>APIサーバーに接続できません</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            <AlertTitle>接続エラー</AlertTitle>
            バックエンドAPIサーバーが起動していないか、応答がありません。
            サーバーを再起動して問題が解決するか確認してください。
          </Alert>
          <Typography variant="body2" paragraph>
            エラー詳細: {apiServerStatus.error || 'APIサーバーが起動していません'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowApiErrorDialog(false)}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleRestartApiServer}
            disabled={isLoading}
          >
            APIサーバーを再起動
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 削除確認ダイアログ */}
      <Dialog open={!!confirmDeleteFolder} onClose={() => setConfirmDeleteFolder(null)}>
        <DialogTitle>フォルダの削除確認</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            以下のフォルダを監視対象から削除しますか？
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, fontWeight: 'bold' }}>
            {confirmDeleteFolder}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            ※フォルダ内のファイルは削除されません
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteFolder(null)}>
            キャンセル
          </Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleDeleteFolder}
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>

      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          写真取り込み
        </Typography>
        <Typography paragraph>
          VRChatで撮影したスクリーンショットフォルダを設定し、写真を取り込みます。
        </Typography>
        
        {/* APIサーバーステータス表示 */}
        <Box sx={{ mb: 3 }}>
          <Chip 
            icon={apiServerStatus.running ? <CheckCircleIcon /> : <ErrorIcon />}
            label={apiServerStatus.running ? 
              `APIサーバー接続中 (ポート: ${apiServerStatus.port})` : 
              'APIサーバー未接続'
            }
            color={apiServerStatus.running ? 'success' : 'error'}
            variant="outlined"
            sx={{ mb: 1 }}
          />
          
          {!apiServerStatus.running && (
            <Box sx={{ mt: 1 }}>
              <Button 
                variant="outlined" 
                color="primary" 
                size="small"
                onClick={handleRestartApiServer}
                startIcon={<RefreshIcon />}
                disabled={isLoading}
              >
                APIサーバーを再起動
              </Button>
            </Box>
          )}
        </Box>
        
        {/* 写真フォルダ設定 */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            写真フォルダ設定
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Button
              variant="contained"
              startIcon={<FolderIcon />}
              onClick={handleAddPhotosFolder}
              disabled={isLoading}
            >
              写真フォルダを追加
            </Button>
          </Box>
          
          {/* 入力フォルダ一覧 */}
          {inputFolders.length > 0 ? (
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <List dense>
                {inputFolders.map((folder, index) => (
                  <ListItem key={index} divider={index < inputFolders.length - 1}>
                    <ListItemText
                      primary={folder}
                      secondary={`フォルダID: ${index + 1}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        aria-label="delete"
                        onClick={() => handleConfirmDeleteFolder(folder)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          ) : (
            <Alert severity="info" sx={{ mb: 2 }}>
              写真フォルダが設定されていません。「写真フォルダを追加」ボタンをクリックして設定してください。
            </Alert>
          )}
          
          {/* スキャン操作ボタン */}
          {inputFolders.length > 0 && (
            <Button
              variant="contained"
              color="secondary"
              startIcon={<SyncIcon />}
              onClick={handleScanPhotos}
              disabled={isLoading || scanStatus.status === 'scanning' || !apiServerStatus.running}
            >
              写真スキャン開始
            </Button>
          )}
        </Box>
        
        {/* スキャン状態表示 */}
        {scanStatus.status === 'scanning' && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              {scanStatus.message || 'スキャン中...'}
            </Typography>
            <LinearProgress />
          </Box>
        )}
        
        {/* スキャン結果表示 */}
        {scanStatus.status === 'completed' && scanStatus.result && (
          <Alert severity="success" sx={{ mb: 3 }}>
            <AlertTitle>スキャン完了</AlertTitle>
            {scanStatus.message || 'スキャンが完了しました'}
            <Typography variant="body2" sx={{ mt: 1 }}>
              処理結果: {scanStatus.result.processed || 0}件の写真を処理しました
            </Typography>
          </Alert>
        )}
        
        <Divider sx={{ my: 3 }} />
        
        {/* 写真一覧表示 */}
        <Typography variant="h6" gutterBottom>
          写真一覧
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
        
        {/* 写真グリッド表示 */}
        {photos.length > 0 ? (
          <Grid container spacing={2}>
            {photos.map(photo => (
              <Grid item key={photo.id} xs={6} sm={4} md={3} lg={2}>
                <Paper
                  elevation={selectedPhotos.some(p => p.id === photo.id) ? 3 : 1}
                  sx={{
                    p: 1,
                    cursor: 'pointer',
                    border: selectedPhotos.some(p => p.id === photo.id) ? '2px solid #1976d2' : 'none',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                  onClick={() => handleSelectPhoto(photo)}
                >
                  {/* 写真サムネイル */}
                  <Box
                    component="img"
                    src={photo.thumbnailPath || photo.path}
                    alt={photo.metadata?.fileName || 'Photo'}
                    sx={{
                      width: '100%',
                      height: 120,
                      objectFit: 'cover',
                      borderRadius: 1
                    }}
                  />
                  
                  {/* 写真メタデータ */}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" component="div" noWrap>
                      {photo.metadata?.worldName || 'Unknown World'}
                    </Typography>
                    <Typography variant="caption" component="div" color="text.secondary" noWrap>
                      {photo.metadata?.captureTime ? 
                        new Date(photo.metadata.captureTime).toLocaleString() : 
                        'Unknown Date'
                      }
                    </Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ minHeight: 200, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
              <AddPhotoAlternateIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography color="textSecondary">
                写真がありません
              </Typography>
              <Typography color="textSecondary" variant="body2">
                写真フォルダを設定して「写真スキャン開始」をクリックしてください
              </Typography>
            </Box>
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
                      position: 'relative'
                    }}
                  >
                    {/* 写真サムネイル */}
                    <Box
                      component="img"
                      src={photo.thumbnailPath || photo.path}
                      alt={photo.metadata?.fileName || 'Photo'}
                      sx={{
                        width: '100%',
                        height: 100,
                        objectFit: 'cover',
                        borderRadius: 1
                      }}
                    />
                    
                    {/* 削除ボタン */}
                    <IconButton
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        bgcolor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.9)'
                        }
                      }}
                      onClick={() => handleSelectPhoto(photo)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
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
