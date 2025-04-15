import datetime
import json
import os
from typing import List, Optional, Dict, Any
from sqlalchemy import desc, asc, or_
from sqlalchemy.orm import Session

from database import SessionLocal
from models.image_metadata import Image

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
        sort_by: str = "img_date",
        order: str = "desc"
    ) -> Dict[str, Any]:
        """
        画像一覧の取得（フィルタリング、ソート、ページング対応）
        """
        db = SessionLocal()
        
        try:
            # クエリの構築
            query = db.query(Image)
            
            # フィルター条件の適用
            if world_name:
                query = query.filter(Image.world_name.like(f"%{world_name}%"))
            
            if world_id:
                query = query.filter(Image.world_id == world_id)
            
            if friend:
                # JSONフィールドからの検索（SQLiteでは制限あり、実装方法は要検討）
                # 簡易実装としてすべての画像を取得し、Pythonコードでフィルタリング
                pass
            
            if date_from:
                try:
                    from_date = datetime.datetime.fromisoformat(date_from)
                    query = query.filter(Image.img_date >= from_date)
                except ValueError:
                    pass
            
            if date_to:
                try:
                    to_date = datetime.datetime.fromisoformat(date_to)
                    query = query.filter(Image.img_date <= to_date)
                except ValueError:
                    pass
            
            # 総件数の取得
            total_count = query.count()
            
            # ソート条件の適用
            sort_column = getattr(Image, sort_by.lower(), Image.id)
            if order.lower() == "desc":
                query = query.order_by(desc(sort_column))
            else:
                query = query.order_by(asc(sort_column))
            
            # ページングの適用
            offset = (page - 1) * limit
            query = query.offset(offset).limit(limit)
            
            # 結果の取得
            images = query.all()
            
            # Pythonでのフレンドフィルタリング（SQLiteのJSON検索に限界があるため）
            if friend and images:
                filtered_images = []
                for img in images:
                    meta_data = img.meta_data
                    if meta_data and 'friends' in meta_data:
                        if any(friend.lower() in f.lower() for f in meta_data['friends']):
                            filtered_images.append(img)
                images = filtered_images
                # 注: この実装では総件数が正確でなくなる可能性があります
            
            # レスポンスの構築
            result = {
                "items": [ImageService._image_to_dict(img) for img in images],
                "meta": {
                    "total": total_count,
                    "page": page,
                    "limit": limit,
                    "pages": (total_count + limit - 1) // limit
                }
            }
            
            return result
        
        finally:
            db.close()
    
    @staticmethod
    def get_image_metadata(image_id: int) -> Dict[str, Any]:
        """
        特定の画像のメタデータを取得
        """
        db = SessionLocal()
        
        try:
            image = db.query(Image).filter(Image.id == image_id).first()
            
            if not image:
                raise ValueError(f"Image with ID {image_id} not found")
            
            return ImageService._image_to_dict(image)
        
        finally:
            db.close()
    
    @staticmethod
    def _image_to_dict(image: Image) -> Dict[str, Any]:
        """
        Imageモデルを辞書に変換
        """
        return {
            "id": image.id,
            "filepath": image.filepath,
            "filename": image.filename,
            "world_name": image.world_name,
            "world_id": image.world_id,
            "img_date": image.img_date.isoformat() if image.img_date else None,
            "metadata": image.meta_data or {},
            "created_date": image.created_date.isoformat() if image.created_date else None,
            "modified_date": image.modified_date.isoformat() if image.modified_date else None,
        }