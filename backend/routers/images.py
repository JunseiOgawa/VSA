from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from datetime import datetime

from database import get_db
from models.image_metadata import Image
from services.image_service import ImageService

router = APIRouter(
    prefix="/api/images",
    tags=["images"],
    responses={404: {"description": "Not found"}},
)

@router.get("", response_model=Dict[str, Any])
def get_images(
    page: int = Query(1, ge=1, description="ページ番号"),
    limit: int = Query(50, ge=1, le=200, description="1ページあたりの項目数"),
    world_name: Optional[str] = Query(None, description="ワールド名（部分一致）"),
    world_id: Optional[str] = Query(None, description="ワールドID（完全一致）"),
    friend: Optional[str] = Query(None, description="フレンド名（部分一致）"),
    date_from: Optional[str] = Query(None, description="開始日（ISO形式: YYYY-MM-DD）"),
    date_to: Optional[str] = Query(None, description="終了日（ISO形式: YYYY-MM-DD）"),
    sort_by: str = Query("img_date", description="ソートフィールド"),
    order: str = Query("desc", description="ソート順（asc/desc）"),
    db: Session = Depends(get_db)
):
    """画像一覧の取得（フィルタリング、ソート、ページネーション対応）"""
    
    # サービスレイヤーに処理を委譲
    result = ImageService.get_images(
        page=page,
        limit=limit,
        world_name=world_name,
        world_id=world_id,
        friend=friend,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        order=order
    )
    
    return result

@router.get("/{image_id}", response_model=Dict[str, Any])
def get_image(image_id: int, db: Session = Depends(get_db)):
    """特定の画像のメタデータを取得"""
    try:
        return ImageService.get_image_metadata(image_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{image_id}", response_model=Dict[str, Any])
def update_image_metadata(image_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    """画像メタデータを更新"""
    # 画像の存在確認
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail=f"画像ID {image_id} が見つかりません")
    
    # 更新可能なフィールド
    if "world_name" in data:
        image.world_name = data["world_name"]
    
    if "world_id" in data:
        image.world_id = data["world_id"]
    
    if "img_date" in data and data["img_date"]:
        try:
            image.img_date = datetime.fromisoformat(data["img_date"])
        except ValueError:
            pass
    
    if "metadata" in data and isinstance(data["metadata"], dict):
        # 既存のメタデータをマージする
        current_metadata = image.meta_data or {}
        current_metadata.update(data["metadata"])
        image.meta_data = current_metadata
    
    # 変更を保存
    db.commit()
    db.refresh(image)
    
    # 結果を返す
    return ImageService._image_to_dict(image)

@router.get("/search/by-world", response_model=List[Dict[str, Any]])
def search_worlds(db: Session = Depends(get_db)):
    """ワールド名一覧を取得（ユニークなワールド名のリスト）"""
    worlds = db.query(Image.world_name).distinct().all()
    result = [{"name": world[0]} for world in worlds if world[0]]
    return result

@router.get("/search/by-friend", response_model=List[Dict[str, Any]])
def search_friends(db: Session = Depends(get_db)):
    """フレンド名一覧を取得（メタデータからユニークなフレンド名のリスト）"""
    # SQLiteのJSONフィールド検索は制限があるため、Pythonで処理
    images = db.query(Image).all()
    friends = set()
    
    for image in images:
        if image.meta_data and "friends" in image.meta_data:
            for friend in image.meta_data["friends"]:
                friends.add(friend)
    
    return [{"name": friend} for friend in sorted(friends)]