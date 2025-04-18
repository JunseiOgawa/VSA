/**
 * アルバム管理サービス
 * アルバムの作成、取得、更新、削除などの操作を提供します
 */

interface Album {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  imageCount?: number;
}

/**
 * アルバムを取得する
 */
const getAlbums = async (): Promise<Album[]> => {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.callApi('albums', 'GET', {});
      if (result.success) {
        return result.data || [];
      }
    }
    return [];
  } catch (error) {
    console.error('アルバム取得エラー:', error);
    return [];
  }
};

/**
 * アルバムを作成する
 */
const createAlbum = async (album: Omit<Album, 'id' | 'createdAt' | 'updatedAt'>): Promise<Album | null> => {
  try {
    if (window.electronAPI) {
      const result = await window.electronAPI.callApi('albums', 'POST', album);
      if (result.success) {
        return result.data;
      }
    }
    return null;
  } catch (error) {
    console.error('アルバム作成エラー:', error);
    return null;
  }
};

// AlbumServiceをオブジェクトとしてエクスポート
const AlbumService = {
  getAlbums,
  createAlbum
};

export default AlbumService;
export type { Album };