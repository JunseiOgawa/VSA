import React, { useState, useEffect } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  styled
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';
import CompressIcon from '@mui/icons-material/Compress';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

import { useTheme } from '../contexts/ThemeContext';


// メニュー項目の型定義
interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

// コンポーネントのプロパティ
interface SideMenuProps {
  open: boolean;
  onSelectMenu: (menuId: string) => void;
  selectedMenu: string;
  onOpenChange: (isOpen: boolean) => void;
}

// カスタムスタイル付きのコンテナ
const MenuContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'isOpen'
})<{ isOpen: boolean }>(({ theme, isOpen }) => ({
  position: 'fixed',
  left: 0,
  top: 0,
  height: '100vh',
  width: isOpen ? 240 : 40,
  backgroundColor: theme.palette.background.paper,
  boxShadow: theme.shadows[3],
  zIndex: 1200,
  overflow: 'hidden',
  transition: 'width 0.2s ease',
  '&:hover': {
    width: 240,
  }
}));

// 細い状態のサイドバー用のスタイル
const MinimalBarStyle = {
  width: 8,
  height: '100%',
  backgroundColor: 'secondary.main',
  position: 'absolute',
  left: 0,
  top: 0,
  cursor: 'pointer',
};

const SideMenu: React.FC<SideMenuProps> = ({ open, onSelectMenu, selectedMenu, onOpenChange }) => {
  // テーマコンテキストを使用
  const { mode, toggleTheme } = useTheme();
  
  // マウスがメニューエリア上にあるかどうかの状態
  const [isHovering, setIsHovering] = useState(false);

  //ホームメニュー項目
  const homeMenuItems: MenuItem[] = [
    { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  ];
  
  // メニュー項目の定義（機能メニュー）
  const menuItems: MenuItem[] = [
    { id: 'photos', label: '写真', icon: <PhotoLibraryIcon /> },
    { id: 'albums', label: 'アルバム', icon: <PhotoAlbumIcon /> },
    { id: 'compress', label: '圧縮', icon: <CompressIcon /> },
    { id: 'advanced-search', label: '高度な検索', icon: <SearchIcon /> },
  ];
  
  // 設定メニュー項目
  const settingsItems: MenuItem[] = [
    //trhe falseで判別　後々別theme実装するときはtruefalseで判別をやめる
    { 
      id: 'theme', 
      label: mode === 'dark' ? 'ライトモード' : 'ダークモード', 
      icon: mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon /> 
    },
  ];

  // メニュー項目選択ハンドラ
  const handleMenuSelect = (menuId: string) => {
    if (menuId === 'theme') {
      // テーマ切替メニューが選択された場合
      toggleTheme();
    } else {
      // 通常のメニュー選択
      onSelectMenu(menuId);
    }
  };
  
  // マウスイベントハンドラ
  const handleMouseEnter = () => {
    setIsHovering(true);
    onOpenChange(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    onOpenChange(false);
  };
  
  // リサイズ時にメニューを閉じる
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600 && open) {
        onOpenChange(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [open, onOpenChange]);

  return (
    <MenuContainer 
      isOpen={open || isHovering}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 常に表示される細いバー */}
      <Box sx={MinimalBarStyle} />
      
      {/* 機能メニュー項目 */}
      <List sx={{ pt: 2, ml: 1, opacity: (open || isHovering) ? 1 : 0, transition: 'opacity 0.3s ease' }}>
        {/* ホームメニュー項目を最初に表示 */}
        {homeMenuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton 
              selected={selectedMenu === item.id}
              onClick={() => handleMenuSelect(item.id)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.dark',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  }
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* メイン機能メニュー項目 */}
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton 
              selected={selectedMenu === item.id}
              onClick={() => handleMenuSelect(item.id)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'primary.dark',
                  '&:hover': {
                    backgroundColor: 'primary.main',
                  }
                }
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
        
        {/* 設定メニューの区切り線 */}
        <Divider sx={{ my: 2 }} />
        
        {/* 設定メニュー項目 */}
        {settingsItems.map((item) => (
          <ListItem key={item.id} disablePadding>
            <ListItemButton 
              onClick={() => handleMenuSelect(item.id)}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </MenuContainer>
  );
};

export default SideMenu;

export {};
