/**
 * アルバム関連の型定義
 */

export interface Album {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  imageCount?: number;
  coverImagePath?: string;
}

export interface CreateAlbumRequest {
  name: string;
  description?: string;
}

export interface UpdateAlbumRequest {
  id: string;
  name?: string;
  description?: string;
  coverImageId?: string;
}

export interface AlbumResponse {
  success: boolean;
  data?: Album | Album[];
  error?: string;
  message?: string;
}

// AlbumTypes.tsをモジュールとして認識させるための空のエクスポート文
export {};