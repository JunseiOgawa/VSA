import React, { useState, useEffect } from 'react';
import { 
  Folder,
  FolderOpen,
  ArrowRight,
  ArrowDropDown
} from '@mui/icons-material';
import { 
  Typography, 
  Button, 
  Box, 
  Checkbox,
  FormControlLabel,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton
} from '@mui/material';
import { readFileSync, writeFileSync } from 'fs';

// フォルダノードの型定義
interface FolderNode {
  key: string;
  title: string;
  isLeaf: boolean;
  children?: FolderNode[];
}

const FolderSelector: React.FC = () => {
  // フォルダ構造のステート
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);
  // 選択されたフォルダのステート
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  // プレビュー画像のステート
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  // 展開されたノードを管理するステート
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({});
  
  // コンポーネントマウント時に設定を読み込み
  useEffect(() => {
    // フォルダ構造の読み込み処理（実際の実装はここで行う）
    const loadFolderStructure = async () => {
      try {
        // この部分は実際のファイルシステムやAPIからデータを取得する処理に置き換える
        const exampleStructure: FolderNode[] = [
          {
            key: 'folder1',
            title: 'VRChat',
            isLeaf: false,
            children: [
              {
                key: 'folder1-1',
                title: 'Screenshots',
                isLeaf: false,
                children: [
                  {
                    key: 'folder1-1-1',
                    title: '2024-04-01',
                    isLeaf: true,
                  },
                  {
                    key: 'folder1-1-2',
                    title: '2024-04-02',
                    isLeaf: true,
                  }
                ]
              },
              {
                key: 'folder1-2',
                title: 'Videos',
                isLeaf: true,
              }
            ]
          },
          {
            key: 'folder2',
            title: 'Images',
            isLeaf: false,
            children: [
              {
                key: 'folder2-1',
                title: 'Camera',
                isLeaf: true,
              }
            ]
          }
        ];
        setFolderStructure(exampleStructure);
      } catch (error) {
        console.error('フォルダ構造の読み込みに失敗しました', error);
      }
    };
    
    loadFolderStructure();
    
    // 設定ファイルから選択済みフォルダを読み込む
    try {
      const settings = JSON.parse(readFileSync('./front-appsetting.json', 'utf8'));
      if (settings.selectedFolders) {
        setSelectedFolders(settings.selectedFolders);
        updatePreviewImages(settings.selectedFolders);
      }
    } catch (e) {
      console.error('設定の読み込みに失敗しました', e);
    }
  }, []);
  
  // チェックボックスの変更処理
  const handleCheckChange = (nodeId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    
    let newSelected = [...selectedFolders];
    const isSelected = selectedFolders.includes(nodeId);
    
    if (isSelected) {
      // すでに選択されている場合は削除
      newSelected = newSelected.filter(id => id !== nodeId);
    } else {
      // 選択されていない場合は追加
      newSelected.push(nodeId);
    }
    
    setSelectedFolders(newSelected);
    updatePreviewImages(newSelected);
  };
  
  // ノードの展開状態を切り替える
  const toggleNodeExpand = (nodeId: string) => {
    setExpandedNodes(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };
  
  // プレビュー画像の更新
  const updatePreviewImages = (folders: string[]) => {
    // 選択されたフォルダから画像を読み込む処理（実装例）
    // 実際の実装はファイルシステムやAPIからデータを取得する
    const mockImages = [
      'https://picsum.photos/200/300?random=1',
      'https://picsum.photos/200/300?random=2',
      'https://picsum.photos/200/300?random=3',
    ];
    
    // 選択したフォルダ数に応じてダミー画像を表示（実際の実装では削除）
    if (folders.length > 0) {
      setPreviewImages(mockImages.slice(0, folders.length));
    } else {
      setPreviewImages([]);
    }
  };
  
  // 設定を保存
  const saveSettings = () => {
    try {
      const settings = JSON.parse(readFileSync('./front-appsetting.json', 'utf8'));
      settings.selectedFolders = selectedFolders;
      writeFileSync('./front-appsetting.json', JSON.stringify(settings, null, 2));
      alert('設定を保存しました');
    } catch (e) {
      console.error('設定の保存に失敗しました', e);
    }
  };

  // 再帰的にフォルダツリーをレンダリングする関数
  const renderFolderTree = (nodes: FolderNode[], level = 0) => {
    return nodes.map((node) => {
      const isSelected = selectedFolders.includes(node.key);
      const isExpanded = expandedNodes[node.key] || false;
      const hasChildren = node.children && node.children.length > 0;
      
      return (
        <React.Fragment key={node.key}>
          <ListItem
            dense
            sx={{
              pl: level * 2, // インデントレベルに応じたパディング
              cursor: 'pointer',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
            onClick={() => hasChildren && toggleNodeExpand(node.key)}
          >
            {/* 展開/折りたたみアイコン */}
            <ListItemIcon sx={{ minWidth: 32 }}>
              {hasChildren ? (
                <IconButton
                  size="small"
                  edge="start"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleNodeExpand(node.key);
                  }}
                >
                  {isExpanded ? 
                    <ArrowDropDown fontSize="small" /> : 
                    <ArrowRight fontSize="small" />
                  }
                </IconButton>
              ) : (
                <Box sx={{ width: 24 }} /> // 子がない場合のスペーサー
              )}
            </ListItemIcon>
            
            {/* フォルダアイコン */}
            <ListItemIcon sx={{ minWidth: 36 }}>
              {hasChildren ? (
                isExpanded ? 
                  <FolderOpen color="primary" fontSize="small" /> : 
                  <Folder color="primary" fontSize="small" />
              ) : (
                <Folder color="primary" fontSize="small" />
              )}
            </ListItemIcon>
            
            {/* フォルダ名とチェックボックス */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={isSelected}
                  size="small"
                  onClick={(e) => handleCheckChange(node.key, e)}
                />
              }
              label={<Typography variant="body2">{node.title}</Typography>}
              sx={{ m: 0, flexGrow: 1 }}
            />
          </ListItem>
          
          {/* 子要素がある場合、展開時に表示 */}
          {hasChildren && (
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <List component="div" disablePadding>
                {renderFolderTree(node.children!, level + 1)}
              </List>
            </Collapse>
          )}
        </React.Fragment>
      );
    });
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* フォルダ選択部分 */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <Folder color="primary" sx={{ mr: 1 }} />
              <Typography variant="h6">取り込むフォルダを選択</Typography>
            </Box>
            
            <Box 
              sx={{ 
                height: 400, 
                overflowY: 'auto', 
                border: '1px solid #e0e0e0', 
                borderRadius: 1,
                bgcolor: 'background.paper',
              }}
            >
              <List>
                {renderFolderTree(folderStructure)}
              </List>
            </Box>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                {selectedFolders.length} フォルダが選択されています
              </Typography>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={saveSettings}
                startIcon={<Folder />}
              >
                設定を保存
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        {/* プレビュー部分 */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={2} sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>プレビュー</Typography>
            {previewImages.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {previewImages.map((img, index) => (
                  <Box
                    key={index}
                    component="img"
                    src={img}
                    alt={`プレビュー ${index + 1}`}
                    sx={{
                      width: 100,
                      height: 100,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                フォルダを選択すると、画像がここにプレビュー表示されます
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default FolderSelector;