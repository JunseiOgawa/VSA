import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  Divider,
  Chip,
  IconButton,
  Button,
  Tooltip,
  CircularProgress
} from '@mui/material';
import FolderZipIcon from '@mui/icons-material/FolderZip';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import DownloadIcon from '@mui/icons-material/Download';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import CompressIcon from '@mui/icons-material/Compress';
import { useGameConfig } from '../../contexts/GameConfigContext';

// 圧縮アーカイブ情報の型定義
interface ArchiveInfo {
  path: string;
  name: string;
  size: number;
  sizeFormatted: string;
  createdAt: string;
  fileCount: number;
  compressionRatio: number;
}

/**
 * 圧縮アーカイブを表示・管理するコンポーネント
 */
const CompressView: React.FC = () => {
  // 状態管理
  const [archives, setArchives] = useState<ArchiveInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { gameName } = useGameConfig();
  
  // 圧縮アーカイブ一覧を読み込む
  useEffect(() => {
    const loadArchives = async () => {
      setLoading(true);
      
      try {
        if (window.electronAPI) {
          const result = await window.electronAPI.callApi('settings', 'GET', {});
          
          if (result.success && result.data && result.data.compressOutputPath) {
            // 圧縮出力パスからアーカイブ一覧を取得
            const archivesResult = await window.electronAPI.callApi('archives', 'GET', {
              path: result.data.compressOutputPath
            });
            
            if (archivesResult.success && Array.isArray(archivesResult.data)) {
              setArchives(archivesResult.data);
            } else {
              // 開発モード用のダミーデータ
              simulateArchiveData();
            }
          } else {
            // 設定が見つからない場合
            setError('圧縮出力先が設定されていません。設定画面で出力先を指定してください。');
            simulateArchiveData(); // 開発モード用
          }
        } else {
          // 開発モード用のシミュレーション
          console.log('開発モード: アーカイブデータをシミュレート');
          simulateArchiveData();
        }
      } catch (err) {
        console.error('アーカイブ一覧取得エラー:', err);
        setError('アーカイブ一覧の取得中にエラーが発生しました');
        // 開発モード用のシミュレーション
        simulateArchiveData();
      } finally {
        setLoading(false);
      }
    };
    
    loadArchives();
  }, []);
  
  // 開発モード用のダミーデータ生成
  const simulateArchiveData = () => {
    const dummyArchives: ArchiveInfo[] = [];
    
    // 現在の日付から過去6ヶ月分のアーカイブを生成
    const now = new Date();
    
    for (let i = 1; i <= 6; i++) {
      const archiveDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
      const month = archiveDate.getMonth() + 1;
      const year = archiveDate.getFullYear();
      const folderName = `${year}-${String(month).padStart(2, '0')}`;
      
      // ランダムなサイズとファイル数を生成
      const size = Math.floor(Math.random() * 500 + 100) * 1024 * 1024; // 100MB-600MB
      const fileCount = Math.floor(Math.random() * 100 + 50); // 50-150ファイル
      const compressionRatio = Math.floor(Math.random() * 40 + 50); // 50%-90%
      
      dummyArchives.push({
        path: `C:\\Users\\Example\\Documents\\${gameName}Archive\\${folderName}.7z`,
        name: `${folderName}.7z`,
        size: size,
        sizeFormatted: formatFileSize(size),
        createdAt: archiveDate.toISOString(),
        fileCount: fileCount,
        compressionRatio: compressionRatio
      });
    }
    
    setArchives(dummyArchives);
  };
  
  // ファイルサイズフォーマット関数
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };
  
  // アーカイブを解凍する
  const handleExtractArchive = (archivePath: string) => {
    console.log(`アーカイブを解凍: ${archivePath}`);
    // 実際の解凍処理はバックエンドで実装予定
  };
  
  // アーカイブを削除する
  const handleDeleteArchive = (archivePath: string) => {
    console.log(`アーカイブを削除: ${archivePath}`);
    // 実際の削除処理はバックエンドで実装予定
  };
  
  // アーカイブの保存場所を開く
  const handleOpenLocation = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.callApi('settings', 'GET', {});
        if (result.success && result.data && result.data.compressOutputPath) {
          // フォルダを開く
          await window.electronAPI.callApi('openFolder', 'EXEC', {
            path: result.data.compressOutputPath
          });
        }
      }
    } catch (err) {
      console.error('フォルダを開くエラー:', err);
    }
  };
  
  // 圧縮処理を開始する
  const handleStartCompression = () => {
    // Compressコンポーネントに移動する処理
    // 実際の実装では親コンポーネントのナビゲーション関数を呼び出す
    console.log('圧縮設定画面に移動');
  };
  
  // 読み込み中表示
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" component="h2">
            圧縮アーカイブ
          </Typography>
          
          <Box>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<CompressIcon />} 
              onClick={handleStartCompression}
              sx={{ mr: 1 }}
            >
              新規圧縮
            </Button>
            <Button 
              variant="outlined"
              startIcon={<FileOpenIcon />}
              onClick={handleOpenLocation}
            >
              保存場所を開く
            </Button>
          </Box>
        </Box>
        
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        
        {archives.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <FolderZipIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              圧縮アーカイブがありません
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              まだ圧縮されたアーカイブがありません。「新規圧縮」ボタンから月別フォルダを圧縮できます。
            </Typography>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<CompressIcon />}
              onClick={handleStartCompression}
            >
              圧縮を開始する
            </Button>
          </Box>
        ) : (
          <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
            {archives.map((archive, index) => (
              <React.Fragment key={archive.path}>
                <ListItem
                  alignItems="flex-start"
                  secondaryAction={
                    <Box>
                      <Tooltip title="アーカイブを解凍">
                        <IconButton edge="end" onClick={() => handleExtractArchive(archive.path)}>
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="アーカイブを削除">
                        <IconButton edge="end" onClick={() => handleDeleteArchive(archive.path)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar>
                      <FolderZipIcon />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography component="span" variant="h6">
                          {archive.name}
                        </Typography>
                        <Chip 
                          label={`${archive.compressionRatio}% 圧縮`} 
                          color="success" 
                          size="small" 
                          sx={{ ml: 2 }}
                        />
                      </Box>
                    }
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          {new Date(archive.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}に作成
                        </Typography>
                        <Box sx={{ display: 'flex', mt: 1 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
                            サイズ: {archive.sizeFormatted}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            ファイル数: {archive.fileCount}ファイル
                          </Typography>
                        </Box>
                      </React.Fragment>
                    }
                  />
                </ListItem>
                {index < archives.length - 1 && <Divider variant="inset" component="li" />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
      
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <InfoIcon sx={{ mr: 1, color: 'info.main' }} />
          <Typography variant="h6">
            圧縮アーカイブについて
          </Typography>
        </Box>
        <Typography paragraph>
          圧縮アーカイブは、{gameName}のスクリーンショットを月別に圧縮して保存したものです。
          圧縮によって容量を削減しながら、必要なときにいつでも元の画像を取り出すことができます。
        </Typography>
        <Typography paragraph>
          圧縮処理では、JPEG XL形式での圧縮と7z形式でのアーカイブ化を組み合わせて、
          画質を維持しながら最大90%の容量削減を実現しています。
        </Typography>
        <Typography>
          ⚠️ 注意: 圧縮アーカイブを削除すると、中のファイルも完全に削除されます。
          重要なデータは必ずバックアップを取っておいてください。
        </Typography>
      </Paper>
    </Box>
  );
};

export default CompressView;

export {};
