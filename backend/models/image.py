import json
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text
from models import Base

class ImageMetadata(Base):
    """画像メタデータを格納するテーブルモデル"""
    __tablename__ = 'image_metadata'
    
    id = Column(Integer, primary_key=True)
    file_path = Column(String(255), unique=True, nullable=False)  # 画像ファイルの絶対パス
    file_name = Column(String(255), nullable=False)  # ファイル名
    world_id = Column(String(100))  # VRChatワールドID
    world_name = Column(String(255))  # VRChatワールド名
    username = Column(String(256))  # ユーザー名（撮影者）
    friends = Column(Text)  # フレンド情報をJSON形式で保存
    capture_time = Column(DateTime)  # 撮影時刻
    created_at = Column(DateTime, default=datetime.now)  # レコード作成日時
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)  # 更新日時
    tags = Column(Text)  # タグ情報をJSON形式で保存
    rating = Column(Integer)  # 評価（1-5星など）
        
    def __init__(self, file_path, file_name, world_name=None, world_id=None, 
                 username=None, capture_time=None, friends=None, extra_metadata=None):
        self.file_path = file_path
        self.file_name = file_name
        self.world_name = world_name
        self.world_id = world_id
        self.username = username
        self.capture_time = capture_time
        
        # フレンドリスト（文字列またはリスト）
        if isinstance(friends, list):
            self.friends = json.dumps(friends)
        else:
            self.friends = friends
            
        # 追加メタデータ
        if isinstance(extra_metadata, dict):
            self.extra_metadata = json.dumps(extra_metadata)
        else:
            self.extra_metadata = extra_metadata
    
    def to_dict(self):
        """モデルをJSON変換可能な辞書形式に変換"""
        result = {
            'id': self.id,
            'file_path': self.file_path,
            'file_name': self.file_name,
            'world_id': self.world_id,
            'world_name': self.world_name,
            'username': self.username,
            'friends': json.loads(self.friends) if self.friends else [],
            'capture_time': self.capture_time.isoformat() if self.capture_time else None,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'tags': json.loads(self.tags) if self.tags else [],
            'rating': self.rating
        }
        return result