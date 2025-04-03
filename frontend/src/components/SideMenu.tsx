import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText,
  Divider,
  styled,
  Drawer,
  Backdrop
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary';
import PhotoAlbumIcon from '@mui/icons-material/PhotoAlbum';
import CompressIcon from '@mui/icons-material/Compress';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SettingsIcon from '@mui/icons-material/Settings';
import TwitterIcon from '@mui/icons-material/Twitter'; // ツイートアイコンを追加

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

// モーダルサイドバー用の細いバー
const MinimalBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  width: 13,
  height: 'calc(100vh - 32px)',
  backgroundColor: theme.palette.secondary.main,
  left: 0,
  top: '32px',
  zIndex: 1100,
  cursor: 'pointer',
}));

// モーダルメニュードロワー用のスタイル - z-indexを調整
const MenuDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: 240,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    borderRight: 'none',
    zIndex: 1200, // タイトルバーより低く、最小化バーより高い
    marginTop: '32px', // タイトルバーの高さ分下にずらす
    height: 'calc(100% - 32px)' // タイトルバーの高さ分を引く
  },
}));

const SideMenu: React.FC<SideMenuProps> = ({ open, onSelectMenu, selectedMenu, onOpenChange }) => {
  // テーマコンテキストを使用
  const { mode, toggleTheme } = useTheme();
  
  // マウスがメニューエリア上にあるかどうかの状態
  const [isHovering, setIsHovering] = useState(false);
  
  // タイマー参照を保持するRef
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  //ホームメニュー項目
  const homeMenuItems: MenuItem[] = [
    { id: 'home', label: 'ホーム', icon: <HomeIcon /> },
  ];
  
  // メニュー項目の定義（機能メニュー）
  const menuItems: MenuItem[] = [
    { id: 'photos', label: '写真', icon: <PhotoLibraryIcon /> },
    { id: 'albums', label: 'アルバム', icon: <PhotoAlbumIcon /> },
    { id: 'compress', label: '圧縮', icon: <CompressIcon /> },
    { id: 'tweet', label: 'ツイート', icon: <TwitterIcon /> }, // ツイート機能を追加
    { id: 'advanced-search', label: '高度な検索', icon: <SearchIcon /> },
  ];
  
  // 設定メニュー項目
  const settingsItems: MenuItem[] = [
    { 
      id: 'theme', 
      label: mode === 'dark' ? 'ライトモード' : 'ダークモード', 
      icon: mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon /> 
    },
    { id: 'settings', label: '設定', icon: <SettingsIcon /> },
  ];

  // メニュー項目選択ハンドラ
  const handleMenuSelect = (menuId: string) => {
    if (menuId === 'theme') {
      // テーマ切替メニューが選択された場合
      toggleTheme();
    } else {
      // 通常のメニュー選択
      onSelectMenu(menuId);
      // メニューを閉じる
      onOpenChange(false);
    }
  };
  
  // マウスイベントハンドラ
  const handleMouseEnter = () => {
    // タイマーがセットされていたらクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    setIsHovering(true);
    onOpenChange(true);
  };
  
  const handleMouseLeave = () => {
    setIsHovering(false);
    
    // タイマーをセットして少し遅延してからメニューを閉じる
    timerRef.current = setTimeout(() => {
      onOpenChange(false);
    }, 200);
  };
  
  // リサイズとウィンドウフォーカス変更時の処理
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 600 && open) {
        onOpenChange(false);
      }
    };
    
    // ウィンドウがフォーカスを失った時の処理を追加
    const handleBlur = () => {
      // ウィンドウがフォーカスを失ったらメニューを閉じる
      setIsHovering(false);
      onOpenChange(false);
      
      // タイマーがあればクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('blur', handleBlur); // ウィンドウのブラーイベントをリッスン
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('blur', handleBlur); // イベントリスナーの削除
      
      // コンポーネントのアンマウント時にタイマーをクリア
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [open, onOpenChange]);

  // メニューを閉じる
  const handleClose = () => {
    onOpenChange(false);
  };

  // ミニマルバーがクリックされたときにメニューを開く
  const handleMinimalBarClick = () => {
    onOpenChange(true);
  };

  return (
    <>
      {/* 常に表示される細いバー */}
      <MinimalBar 
        onClick={handleMinimalBarClick}
        onMouseEnter={handleMouseEnter}
      />
      
      {/* モーダルメニュー */}
      <MenuDrawer
        open={open || isHovering}
        onClose={handleClose}
        variant="temporary"
        anchor="left"
        ModalProps={{
          keepMounted: true,
        }}
      >
        {/* Boxでラップしてマウスイベントをハンドリングする */}
        <Box 
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          sx={{ height: '100%', width: '100%' }}
        >
          {/* 機能メニュー項目 */}
          <List sx={{ pt: 2, pl: 1 }}>
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
          </List>
        </Box>
      </MenuDrawer>
      
      {/* 背景オーバーレイ（スマホなどで見たときに背景を暗くする） */}
      <Backdrop
        sx={{ zIndex: 1050, color: '#fff' }}
        open={open && window.innerWidth < 600}
        onClick={handleClose}
      />
    </>
  );
};

export default SideMenu;

export {};
