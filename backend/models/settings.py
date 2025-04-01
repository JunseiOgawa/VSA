from sqlalchemy import Column, Integer, String, JSON, UniqueConstraint
from ..database import Base

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)  # 設定値をJSON形式で保存
    
    def __repr__(self):
        return f"<Settings(key='{self.key}')>"
    
    def to_dict(self):
        """
        モデルを辞書形式に変換するユーティリティメソッド
        """
        return {
            "id": self.id,
            "key": self.key,
            "value": self.value
        }