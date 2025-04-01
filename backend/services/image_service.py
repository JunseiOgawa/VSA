from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from typing import List, Dict, Any, Optional
from datetime import datetime
import os

from ..models.image_metadata import ImageMetadata
from ..database import SessionLocal

class ImageService:
    @staticmethod
    def get_images(
        page: int = 1,
        limit: int = 50,
        world_name: Optional[str] = None,
        world_id: Optional[str] = None,
        friend: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        sort_by: str = "img_Date",
        order: str = "desc"
    ) -> Dict[str, Any]:
        """
        画像メタデータを検索条件に基づいて取得
        
        :param page: ページ番号
        :param limit: 1ページあたりの件数
        :param world_name: ワールド名フィルター
        :param world_id: ワールドIDフィルター
        :param friend: フレンド名フィルター
        :param date_from: 撮影日時開始
        :param date_to: 撮影日時終了
        :param sort_by: ソート項目
        :param order: ソート順
        :return: 画像リストとページネーション情報
        """
        with SessionLocal() as db:
            # クエリビルダー
            query = db.query(ImageMetadata)
            
            # フィルター条件の適用
            if world_name:
                query = query.filter(ImageMetadata.img_WorldName.like(f"%{world_name}%"))
            
            if world_id:
                query = query.filter(ImageMetadata.img_WorldID == world_id)
            
            if friend:
                # JSONフィールド内のフレンド名を検索（SQLiteの場合は実装が複雑なので簡易版）
                query = query.filter(ImageMetadata.img_Users.like(f"%{friend}%"))
            
            if date_from:
                date_from_obj = datetime.fromisoformat(date_from)
                query = query.filter(ImageMetadata.img_Date >= date_from_obj)
            
            if date_to:
                date_to_obj = datetime.fromisoformat(date_to)
                query = query.filter(ImageMetadata.img_Date <= date_to_obj)
            
            # 合計件数の取得
            total = query.count()
            
            # ソート順の適用
            sort_column = getattr(ImageMetadata, sort_by, ImageMetadata.img_Date)
            if order == "desc":
                query = query.order_by(sort_column.desc())
            else:
                query = query.order_by(sort_column)
            
            # ページネーション
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)
            
            # 結果の取得と変換
            results = query.all()
            images = [img.to_dict() for img in results]
            
            return {
                "images": images,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
    
    @staticmethod
    def get_image_metadata(image_id: int) -> Dict[str, Any]:
        """
        特定の画像のメタデータを取得
        
        :param image_id: 画像ID
        :return: 画像メタデータ
        """
        with SessionLocal() as db:
            image = db.query(ImageMetadata).filter(ImageMetadata.img_Id == image_id).first()
            if not image:
                raise ValueError(f"Image with ID {image_id} not found")
            
            return image.to_dict()