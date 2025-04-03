import React from 'react';
import { Container, Box } from '@mui/material';
import TweetView from './tweet/TweetView';
import { TemplateProvider } from '../contexts/TemplateContext';

// 写真コンポーネントから選択された画像を渡すためのプロパティ
interface TweetProps {
  selectedImages?: { id: string; path: string; thumbnailPath?: string }[];
}
const Tweet: React.FC<TweetProps> = ({ selectedImages = [] }) => {
  return (
    <TemplateProvider>
      <Box>
        <TweetView />
      </Box>
    </TemplateProvider>
  );
};

export default Tweet;
