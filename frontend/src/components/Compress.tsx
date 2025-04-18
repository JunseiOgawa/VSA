import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Paper, 
  Box, 
  Button, 
  TextField,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Checkbox,
  Card,
  CardContent,
  LinearProgress
} from '@mui/material';
import Grid from '@mui/material/Grid';
import InfoIcon from '@mui/icons-material/Info';
import FolderIcon from '@mui/icons-material/Folder';
import CompressIcon from '@mui/icons-material/Compress';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import SettingsIcon from '@mui/icons-material/Settings';
import { useGameConfig } from '../contexts/GameConfigContext';

// フォルダ情報の型定義
interface FolderInfo {
  name: string;
  path: string;
  lastModified: string;
  size?: string;
  selected?: boolean;
}

// 圧縮処理状態の型定義
interface CompressionProgress {
  isProcessing: boolean;
  currentFolder?: string;
  progress: number; // 0-100
  message?: string;
}

const Compress: React.FC = () => {
  // 状態管理
  const [monthlyCompress, setMonthlyCompress] = useState<boolean>(false);
  const [vrcFolder, setVrcFolder] = useState<string>('');
  const [outputFolder, setOutputFolder] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { gameName } = useGameConfig();
  
  // フォルダ関連の状態
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [foldersLoading, setFoldersLoading] = useState<boolean>(false);
  
  // 圧縮処理の状態
  const [compressionProgress, setCompressionProgress] = useState<CompressionProgress>({
    isProcessing: false,
    progress: 0
  });

  // 設定を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        if (window.electronAPI) {
          // 設定を取得
          const result = await window.electronAPI.callApi('settings', 'GET', {});
          if (result.success && result.data) {
            // スクリーンショットパスと圧縮出力先パスを設定
            if (result.data.screenshotPath) {
              setVrcFolder(result.data.screenshotPath);
              // スクリーンショットフォルダが設定されていれば、フォルダ一覧も読み込む
              loadFolders(result.data.screenshotPath);
            }
            if (result.data.compressOutputPath) {
              setOutputFolder(result.data.compressOutputPath);
            }
            // 月別圧縮設定の取得
            if (result.data.monthlyCompress !== undefined) {
              setMonthlyCompress(result.data.monthlyCompress);
            }
          }
        } else {
          // 開発モード用
          console.log('開発モード: 設定の読み込みをシミュレート');
          const savedSettings = localStorage.getItem('app-settings');
          if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            if (settings.screenshotPath) {
              setVrcFolder(settings.screenshotPath);
              // 開発モード用のダミーフォルダ表示
              simulateFolderLoading();
            }
            if (settings.compressOutputPath) setOutputFolder(settings.compressOutputPath);
            if (settings.monthlyCompress !== undefined) setMonthlyCompress(settings.monthlyCompress);
          }
        }
      } catch (err) {
        console.error('設定の読み込みエラー:', err);
        setError('設定の読み込み中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // フォルダ一覧読み込み
  const loadFolders = async (folderPath: string) => {
    if (!folderPath) return;
    
    setFoldersLoading(true);
    try {
      if (window.electronAPI) {
        // Electronを使用してフォルダ一覧を取得
        const result = await window.electronAPI.callApi('folders', 'GET', { path: folderPath });
        if (result.success && Array.isArray(result.data)) {
          setFolders(result.data);
        } else {
          throw new Error('フォルダ一覧の取得に失敗しました');
        }
      } else {
        // 開発モード用のダミーデータ
        simulateFolderLoading();
      }
    } catch (err) {
      console.error('フォルダ一覧取得エラー:', err);
      setError('フォルダ一覧の取得中にエラーが発生しました');
    } finally {
      setFoldersLoading(false);
    }
  };

  // 開発モード用のダミーフォルダデータ
  const simulateFolderLoading = () => {
    // 現在の日付から過去6ヶ月分のフォルダ名を生成
    const now = new Date();
    const dummyFolders: FolderInfo[] = [];
    
    for (let i = 0; i < 6; i++) {
      const folderDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const folderName = `${folderDate.getFullYear()}-${String(folderDate.getMonth() + 1).padStart(2, '0')}`;
      
      dummyFolders.push({
        name: folderName,
        path: `C:\\Users\\Example\\Pictures\\VRChat\\${folderName}`,
        lastModified: folderDate.toLocaleDateString(),
        size: `${Math.floor(Math.random() * 500) + 100} MB`
      });
    }
    
    setFolders(dummyFolders);
  };

  // VRChatフォルダを選択
  const handleSelectVRCFolder = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.browseFolder();
        if (result.success && result.data && !result.data.canceled) {
          const newPath = result.data.filePaths[0];
          setVrcFolder(newPath);
          
          // スクリーンショットパスを設定に保存
          await window.electronAPI.callApi('settings', 'SET', { 
            screenshotPath: newPath 
          });
          
          // フォルダ一覧を読み込む
          loadFolders(newPath);
        }
      } else {
        // 開発用モック
        console.log('フォルダ選択ダイアログを表示（開発モード）');
        const mockPath = 'C:\\Users\\Example\\Pictures\\VRChat';
        setVrcFolder(mockPath);
        
        // ダミーフォルダデータをロード
        simulateFolderLoading();
        
        // ローカルストレージに保存
        const savedSettings = localStorage.getItem('app-settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        localStorage.setItem('app-settings', JSON.stringify({
          ...settings,
          screenshotPath: mockPath
        }));
      }
    } catch (err) {
      console.error('フォルダ選択エラー:', err);
      setError('フォルダの選択中にエラーが発生しました');
    }
  };

  // 出力先フォルダを選択
  const handleSelectOutputFolder = async () => {
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.browseFolder();
        if (result.success && result.data && !result.data.canceled) {
          const newPath = result.data.filePaths[0];
          setOutputFolder(newPath);
          
          // 圧縮出力先パスを設定に保存
          await window.electronAPI.callApi('settings', 'SET', { 
            compressOutputPath: newPath 
          });
        }
      } else {
        // 開発用モック
        console.log('フォルダ選択ダイアログを表示（開発モード）');
        const mockPath = 'C:\\Users\\Example\\Documents\\VRChatArchive';
        setOutputFolder(mockPath);
        
        // ローカルストレージに保存
        const savedSettings = localStorage.getItem('app-settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        localStorage.setItem('app-settings', JSON.stringify({
          ...settings,
          compressOutputPath: mockPath
        }));
      }
    } catch (err) {
      console.error('フォルダ選択エラー:', err);
      setError('フォルダの選択中にエラーが発生しました');
    }
  };

  // 月別圧縮設定を切り替え
  const handleToggleMonthlyCompress = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;
    setMonthlyCompress(newValue);
    
    try {
      if (window.electronAPI) {
        // 設定を保存
        await window.electronAPI.callApi('settings', 'SET', { 
          monthlyCompress: newValue 
        });
      } else {
        // 開発モード用
        const savedSettings = localStorage.getItem('app-settings');
        const settings = savedSettings ? JSON.parse(savedSettings) : {};
        localStorage.setItem('app-settings', JSON.stringify({
          ...settings,
          monthlyCompress: newValue
        }));
      }
    } catch (err) {
      console.error('設定の保存エラー:', err);
      setError('設定の保存中にエラーが発生しました');
    }
  };

  // フォルダ選択処理
  const handleFolderSelect = (folderPath: string) => {
    setSelectedFolders(prev => {
      if (prev.includes(folderPath)) {
        // すでに選択されている場合は削除
        return prev.filter(path => path !== folderPath);
      } else {
        // 選択されていない場合は追加
        return [...prev, folderPath];
      }
    });
  };

  // 圧縮処理を実行する関数
  const handleStartCompression = async () => {
    if (selectedFolders.length === 0) {
      setError('圧縮するフォルダを選択してください');
      return;
    }
    
    if (!outputFolder) {
      setError('出力先フォルダを選択してください');
      return;
    }
    
    // 圧縮処理の開始
    setCompressionProgress({
      isProcessing: true,
      progress: 0,
      message: '圧縮を準備しています...'
    });
    
    try {
      if (window.electronAPI) {
        // Python処理を呼び出す
        for (let i = 0; i < selectedFolders.length; i++) {
          const folder = selectedFolders[i];
          const folderName = folder.split('\\').pop() || folder;
          
          setCompressionProgress({
            isProcessing: true,
            currentFolder: folderName,
            progress: (i / selectedFolders.length) * 100,
            message: `${folderName} を圧縮中...`
          });
          
          // Pythonプロセスを呼び出して圧縮処理を実行
          const result = await window.electronAPI.callApi('compress', 'RUN', { 
            sourcePath: folder,
            outputPath: outputFolder,
            monthlyCompress
          });
          
          if (!result.success) {
            throw new Error(`${folderName} の圧縮に失敗しました: ${result.error}`);
          }
        }
        
        // 処理完了
        setCompressionProgress({
          isProcessing: false,
          progress: 100,
          message: '圧縮が完了しました'
        });
        
        // 選択をクリア
        setSelectedFolders([]);
        
      } else {
        // 開発モード用のシミュレーション
        let progress = 0;
        const timer = setInterval(() => {
          progress += 5;
          if (progress <= 100) {
            const currentIndex = Math.floor((progress / 100) * selectedFolders.length);
            const currentFolder = selectedFolders[currentIndex] || selectedFolders[0];
            const folderName = currentFolder.split('\\').pop() || currentFolder;
            
            setCompressionProgress({
              isProcessing: true,
              currentFolder: folderName,
              progress,
              message: `${folderName} を圧縮中...`
            });
          } else {
            clearInterval(timer);
            setCompressionProgress({
              isProcessing: false,
              progress: 100,
              message: '圧縮が完了しました'
            });
            setSelectedFolders([]);
          }
        }, 200);
      }
    } catch (err) {
      console.error('圧縮処理エラー:', err);
      setError(err instanceof Error ? err.message : '圧縮処理中にエラーが発生しました');
      setCompressionProgress({
        isProcessing: false,
        progress: 0,
        message: 'エラーが発生しました'
      });
    }
  };

  // 現在の日付を取得
  const currentDate = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  if (isLoading) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <CircularProgress />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
      <Typography variant="h5" component="h2" gutterBottom>
        圧縮設定
      </Typography>
      
      <Typography paragraph>
        {gameName}のスクリーンショットを圧縮して容量を削減します。
        月別に圧縮することで管理が容易になります。
      </Typography>

      {/* エラー表示 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2}>
          {/* 月別圧縮設定 */}
          <Grid size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch 
                    checked={monthlyCompress}
                    onChange={handleToggleMonthlyCompress}
                    color="primary"
                  />
                }
                label="月別フォルダを圧縮"
              />
              <Tooltip 
                title="オンにすると、写真を月ごとに圧縮ファイルにまとめます。過去の写真を自動的に圧縮して容量を節約できます。" 
                arrow
              >
                <IconButton size="small" color="primary">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>

          {/* VRChatフォルダ選択 */}
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom>
              {gameName}スクリーンショットフォルダ
              <Tooltip 
                title={`${gameName}のスクリーンショットが保存されているフォルダを選択してください。通常はPicturesフォルダ内の${gameName}フォルダです。`} 
                arrow
              >
                <IconButton size="small" color="primary">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={`${gameName}スクリーンショットのフォルダを選択`}
                value={vrcFolder}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mr: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={handleSelectVRCFolder}
              >
                参照
              </Button>
            </Box>
          </Grid>
          
          {/* フォルダビューワー */}
          {vrcFolder && (
            <Grid size={12}>
              <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent sx={{ py: 1, px: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                      フォルダ一覧 - {currentDate}
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<FolderOpenIcon />} 
                      onClick={() => loadFolders(vrcFolder)}
                      disabled={foldersLoading}
                    >
                      更新
                    </Button>
                  </Box>
                  
                  {foldersLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : folders.length > 0 ? (
                    <List disablePadding dense sx={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: 1 }}>
                      {folders.map((folder) => (
                        <ListItemButton
                          key={folder.path}
                          dense
                          onClick={() => handleFolderSelect(folder.path)}
                          selected={selectedFolders.includes(folder.path)}
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <Checkbox
                              edge="start"
                              checked={selectedFolders.includes(folder.path)}
                              tabIndex={-1}
                              disableRipple
                            />
                          </ListItemIcon>
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <FolderIcon fontSize="small" color="primary" />
                          </ListItemIcon>
                          <ListItemText 
                            primary={folder.name} 
                            secondary={`最終更新: ${folder.lastModified}${folder.size ? ` | サイズ: ${folder.size}` : ''}`}
                            primaryTypographyProps={{ variant: 'body2' }}
                            secondaryTypographyProps={{ variant: 'caption' }}
                          />
                        </ListItemButton>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                      サブフォルダが見つかりません
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* 出力先フォルダ選択 */}
          <Grid size={12}>
            <Typography variant="subtitle2" gutterBottom>
              圧縮ファイル出力先
              <Tooltip 
                title="圧縮されたファイルの保存先フォルダを選択してください。十分な空き容量があることを確認してください。" 
                arrow
              >
                <IconButton size="small" color="primary">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="出力先フォルダを選択"
                value={outputFolder}
                InputProps={{
                  readOnly: true,
                }}
                sx={{ mr: 1 }}
              />
              <Button
                variant="outlined"
                startIcon={<FolderIcon />}
                onClick={handleSelectOutputFolder}
              >
                参照
              </Button>
            </Box>
          </Grid>
          
          {/* 圧縮実行ボタン */}
          {selectedFolders.length > 0 && outputFolder && (
            <Grid size={12} sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body2">
                  選択されたフォルダ: {selectedFolders.length}個
                </Typography>
                
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<CompressIcon />}
                  onClick={handleStartCompression}
                  disabled={compressionProgress.isProcessing}
                  fullWidth
                >
                  {compressionProgress.isProcessing ? '圧縮処理中...' : '選択したフォルダを圧縮'}
                </Button>
                
                {compressionProgress.isProcessing && (
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress variant="determinate" value={compressionProgress.progress} />
                    <Typography variant="caption" align="center" display="block" sx={{ mt: 1 }}>
                      {compressionProgress.message}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 2 }} />
      
      {/* 圧縮設定オプション */}
      <Box sx={{ mt: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          <SettingsIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
          圧縮設定オプション
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={true}
                  color="primary"
                />
              }
              label="圧縮後にオリジナルフォルダを削除"
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={true}
                  color="primary"
                />
              }
              label="圧縮完了後に通知を表示"
            />
          </Grid>
        </Grid>
      </Box>
    </Paper>
  );
};

export default Compress;
