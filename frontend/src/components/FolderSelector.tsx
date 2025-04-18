import React, { useState, useEffect } from 'react';
import { Folder } from '@mui/icons-material';
import { readFileSync, writeFileSync } from 'fs';

interface FolderNode {
  key: string;
  title: string;
  isLeaf: boolean;
  children?: FolderNode[];
  isChecked?: boolean;
}

const FolderSelector: React.FC = () => {
  const [folderStructure, setFolderStructure] = useState<FolderNode[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  
  // フォルダ構造を読み込む処理
  useEffect(() => {
    // システムのフォルダ構造を取得する処理
    // ...
  }, []);
  
  // 設定を読み込む
  useEffect(() => {
    try {
      const settings = JSON.parse(readFileSync('./front-appsetting.json', 'utf8'));
      if (settings.selectedFolders) {
        setSelectedFolders(settings.selectedFolders);
      }
    } catch (e) {
      console.error('設定の読み込みに失敗しました', e);
    }
  }, []);
  
  // チェックボックスの変更処理
  const onCheck: TreeProps<FolderNode>['onCheck'] = (checkedKeys, info) => {
    // checkedKeys を string[] に変換
    let checked: string[];
    if (Array.isArray(checkedKeys)) {
      checked = checkedKeys.map(key => String(key));
    } else {
      checked = checkedKeys.checked.map(key => String(key));
    }
    setSelectedFolders(checked);
    updatePreviewImages(checked);
  };
  
  // プレビュー画像の更新
  const updatePreviewImages = (folders: string[]) => {
    // 選択されたフォルダから画像を読み込む処理
    // ...　　npm install antd　npm install react react-dom　npm install react-icons
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
  
  return (
    <div className="folder-selector-container">
      <div className="preview-area">
        {previewImages.map((img, index) => (
          <img key={index} src={img} alt={`プレビュー ${index}`} className="thumbnail" />
        ))}
      </div>
      
      <div className="folder-tree">
        <h3>
          <Folder color="primary" style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          取り込むフォルダを選択
        </h3>
        <Tree
          checkable
          onCheck={onCheck}
          checkedKeys={selectedFolders}
          treeData={folderStructure}
        />
        <Button type="primary" onClick={saveSettings}>
          設定を保存
        </Button>
      </div>
    </div>
  );
};

export default FolderSelector;