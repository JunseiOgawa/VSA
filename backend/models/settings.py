import json
from sqlalchemy import Column, Integer, String, Text
from models import Base

class Settings(Base):
    """アプリケーション設定を格納するテーブルモデル"""
    __tablename__ = 'settings'
    
    id = Column(Integer, primary_key=True)
    key = Column(String(100), unique=True, nullable=False)  # 設定キー
    value = Column(Text)  # 設定値（JSON形式で保存）
    
    def get_value(self):
        """JSON形式の値を解析して返す"""
        if self.value:
            return json.loads(self.value)
        return None
        
    def set_value(self, data):
        """データをJSON形式に変換して保存"""
        self.value = json.dumps(data)