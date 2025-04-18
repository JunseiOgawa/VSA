from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any

from database import get_db
from models.album import Album
from models.image_metadata import Image

router = APIRouter(
    prefix="/api/albums",
    tags=["albums"],
    responses={404: {"description": "Not found"}},
)

# アルバム情報のPydanticモデル（スキーマ）を使用する代わりに辞書を使用
def album_to_dict(album: Album) -> Dict[str, Any]:
    """アルバムオブジェクトを辞書に変換"""
    return {
        "id": album.id,
        "name": album.name,
        "description": album.description,
        "created_date": album.created_date.isoformat() if album.created_date else None,
        "modified_date": album.modified_date.isoformat() if album.modified_date else None,
        "image_count": len(album.images) if album.images else 0
    }

@router.get("", response_model=List[Dict[str, Any]])
def get_albums(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """アルバム一覧を取得"""
    albums = db.query(Album).offset(skip).limit(limit).all()
    return [album_to_dict(album) for album in albums]

@router.post("", status_code=status.HTTP_201_CREATED, response_model=Dict[str, Any])
def create_album(data: Dict[str, Any], db: Session = Depends(get_db)):
    """新しいアルバムを作成"""
    # 入力検証
    if "name" not in data or not data["name"]:
        raise HTTPException(status_code=400, detail="アルバム名は必須です")
    
    # アルバムの作成
    new_album = Album(
        name=data["name"],
        description=data.get("description", "")
    )
    
    db.add(new_album)
    db.commit()
    db.refresh(new_album)
    
    return album_to_dict(new_album)

@router.get("/{album_id}", response_model=Dict[str, Any])
def get_album(album_id: int, db: Session = Depends(get_db)):
    """特定のアルバム情報を取得"""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    return album_to_dict(album)

@router.put("/{album_id}", response_model=Dict[str, Any])
def update_album(album_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    """アルバム情報を更新"""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    # 入力検証
    if "name" in data and data["name"]:
        album.name = data["name"]
    
    if "description" in data:
        album.description = data["description"]
    
    db.commit()
    db.refresh(album)
    
    return album_to_dict(album)

@router.delete("/{album_id}", response_model=Dict[str, Any])
def delete_album(album_id: int, db: Session = Depends(get_db)):
    """アルバムを削除"""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    db.delete(album)
    db.commit()
    
    return {"success": True, "message": f"アルバムID {album_id} を削除しました"}

@router.get("/{album_id}/images", response_model=List[Dict[str, Any]])
def get_album_images(album_id: int, db: Session = Depends(get_db)):
    """アルバム内の画像一覧を取得"""
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    # 画像を辞書に変換
    def image_to_dict(img: Image) -> Dict[str, Any]:
        return {
            "id": img.id,
            "filepath": img.filepath,
            "filename": img.filename,
            "world_name": img.world_name,
            "world_id": img.world_id,
            "img_date": img.img_date.isoformat() if img.img_date else None,
            "metadata": img.metadata or {},
        }
    
    return [image_to_dict(img) for img in album.images]

@router.post("/{album_id}/images", response_model=Dict[str, Any])
def add_images_to_album(album_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    """アルバムに画像を追加"""
    # 入力検証
    if "image_ids" not in data or not isinstance(data["image_ids"], list):
        raise HTTPException(status_code=400, detail="image_ids リストは必須です")
    
    # アルバムの存在確認
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    # 画像の存在確認と追加
    added_count = 0
    for image_id in data["image_ids"]:
        image = db.query(Image).filter(Image.id == image_id).first()
        if image and image not in album.images:
            album.images.append(image)
            added_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{added_count}枚の画像をアルバムに追加しました",
        "album_id": album_id,
        "added_count": added_count
    }

@router.delete("/{album_id}/images", response_model=Dict[str, Any])
def remove_images_from_album(album_id: int, data: Dict[str, Any], db: Session = Depends(get_db)):
    """アルバムから画像を削除"""
    # 入力検証
    if "image_ids" not in data or not isinstance(data["image_ids"], list):
        raise HTTPException(status_code=400, detail="image_ids リストは必須です")
    
    # アルバムの存在確認
    album = db.query(Album).filter(Album.id == album_id).first()
    if not album:
        raise HTTPException(status_code=404, detail=f"アルバムID {album_id} が見つかりません")
    
    # 画像の削除
    removed_count = 0
    for image_id in data["image_ids"]:
        image = db.query(Image).filter(Image.id == image_id).first()
        if image and image in album.images:
            album.images.remove(image)
            removed_count += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"{removed_count}枚の画像をアルバムから削除しました",
        "album_id": album_id,
        "removed_count": removed_count
    }