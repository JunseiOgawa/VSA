import os
import json
import shutil
from datetime import datetime
from flask import current_app
from sqlalchemy import and_, or_
from models import Session
from models.image import ImageMetadata

def get_db_session():
    """データベースセッションを取得"""
    return current_app.config['DB_SESSION']

#images.pyから受け取ったimage_dataを使って検索を行う 検索方式はORMを使う
def get_images(world_name=None, friend_name=None, username=None, date_from=None, date_to=None):
    """条件に基づいて画像を検索"""
    session = get_db_session()
    query = session.query(ImageMetadata)
    
    # 検索条件を適用
    if world_name:
        query = query.filter(ImageMetadata.world_name.like(f'%{world_name}%'))
        
    if friend_name:
        # JSONフィールド内の検索（SQLite実装に注意）
        query = query.filter(ImageMetadata.friends.like(f'%{friend_name}%'))
    
    # ユーザー名（撮影者）での検索
    if username:
        query = query.filter(ImageMetadata.username.like(f'%{username}%'))
    
    # 日付範囲
    if date_from:
        try:
            date_from = datetime.fromisoformat(date_from)
            query = query.filter(ImageMetadata.capture_time >= date_from)
        except ValueError:
            pass  # 無効な日付形式は無視
            
    if date_to:
        try:
            date_to = datetime.fromisoformat(date_to)
            query = query.filter(ImageMetadata.capture_time <= date_to)
        except ValueError:
            pass
    
    # 結果を取得
    results = query.all()
    # 辞書に変換してリスト化
    return [image.to_dict() for image in results]

def get_image_metadata_by_id(image_id):
    """画像IDからメタデータを取得"""
    session = get_db_session()
    image = session.query(ImageMetadata).filter(ImageMetadata.id == image_id).first()
    if image:
        return image.to_dict()
    return None

def export_images(image_ids, target_folder):
    """画像をエクスポート"""
    if not os.path.exists(target_folder):
        os.makedirs(target_folder, exist_ok=True)
        
    session = get_db_session()
    images = session.query(ImageMetadata).filter(ImageMetadata.id.in_(image_ids)).all()
    
    results = {
        'total': len(images),
        'success': 0,
        'failed': 0,
        'details': []
    }
    
    for image in images:
        source_path = image.file_path
        dest_path = os.path.join(target_folder, image.file_name)
        
        try:
            if os.path.exists(source_path):
                shutil.copy2(source_path, dest_path)
                results['success'] += 1
                results['details'].append({
                    'id': image.id,
                    'file_name': image.file_name,
                    'status': 'success'
                })
            else:
                results['failed'] += 1
                results['details'].append({
                    'id': image.id,
                    'file_name': image.file_name,
                    'status': 'failed',
                    'reason': 'Source file not found'
                })
        except Exception as e:
            results['failed'] += 1
            results['details'].append({
                'id': image.id,
                'file_name': image.file_name,
                'status': 'failed',
                'reason': str(e)
            })
    
    return results