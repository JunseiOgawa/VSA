from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
from models.composite import Composite
from models.image_metadata import Image

router = APIRouter(
    prefix="/api/composites",
    tags=["composites"],
    responses={404: {"description": "Not found"}},
)

# コンポジットオブジェクトを辞書に変換
def composite_to_dict(composite: Composite) -> Dict[str, Any]:
    """コンポジットオブジェクトを辞書に変換"""
    return {
        "id": composite.id,
        "name": composite.name,
        "layout": composite.layout or {},
        "created_date": composite.created_date.isoformat() if composite.created_date else None,
        "modified_date": composite.modified_date.isoformat() if composite.modified_date else None,
        "image_count": len(composite.images) if composite.images else 0
    }

@router.get("", response_model=List[Dict[str, Any]])
def get_composites(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """コンポジット一覧を取得"""
    composites = db.query(Composite).offset(skip).limit(limit).all()
    return [composite_to_dict(composite) for composite in composites]

@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_composite(data: Dict[str, Any], db: Session = Depends(get_db)):
    """新しいコンポジットを作成"""
    # 入力検証
    if "name" not in data or not data["name"]:
        raise HTTPException(status_code=400, detail="コンポジット名は必須です")
    
    # コンポジットの作成
    new_composite = Composite(
        name=data["name"],
        layout=data.get("layout", {})
    )
    
    db.add(new_composite)
    db.commit()
    db.refresh(new_composite)
    
    # 画像の追加（image_idsが指定されている場合）
    if "image_ids" in data and isinstance(data["image_ids"], list):
        for image_id in data["image_ids"]:
            image = db.query(Image).filter(Image.id == image_id).first()
            if image:
                new_composite.images.append(image)
        
        db.commit()
        db.refresh(new_composite)
    
    return composite_to_dict(new_composite)

@router.get("/{composite_id}", response_model=Dict[str, Any])
def get_composite(composite_id: int, db: Session = Depends(get_db)):
    """特定のコンポジット情報を取得"""
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail=f"コンポジットID {composite_id} が見つかりません")
    
    # コンポジット情報に画像データも含める
    result = composite_to_dict(composite)
    
    # 画像情報を取得
    images = []
    for img in composite.images:
        images.append({
            "id": img.id,
            "filepath": img.filepath,
            "filename": img.filename,
            "world_name": img.world_name,
            "world_id": img.world_id,
            "img_date": img.img_date.isoformat() if img.img_date else None,
        })
    
    result["images"] = images
    
    return result

@router.put("/{composite_id}", response_model=Dict[str, Any])
def update_composite(composite_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    """コンポジット情報を更新"""
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail=f"コンポジットID {composite_id} が見つかりません")
    
    # 基本情報の更新
    if "name" in data and data["name"]:
        composite.name = data["name"]
    
    if "layout" in data:
        composite.layout = data["layout"]
    
    # 画像の更新（完全置換）
    if "image_ids" in data and isinstance(data["image_ids"], list):
        # 現在の画像をクリア
        composite.images = []
        
        # 新しい画像を追加
        for image_id in data["image_ids"]:
            image = db.query(Image).filter(Image.id == image_id).first()
            if image:
                composite.images.append(image)
    
    db.commit()
    db.refresh(composite)
    
    return composite_to_dict(composite)

@router.delete("/{composite_id}", response_model=Dict[str, Any])
def delete_composite(composite_id: int, db: Session = Depends(get_db)):
    """コンポジットを削除"""
    composite = db.query(Composite).filter(Composite.id == composite_id).first()
    if not composite:
        raise HTTPException(status_code=404, detail=f"コンポジットID {composite_id} が見つかりません")
    
    db.delete(composite)
    db.commit()
    
    return {"success": True, "message": f"コンポジットID {composite_id} を削除しました"}