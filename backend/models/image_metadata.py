from sqlalchemy import Column, Integer, String, DateTime, JSON, UniqueConstraint
from sqlalchemy.sql import func
from ..database import Base

class ImageMetadata(Base):
    __tablename__ = "image_metadata"
    
    img_Id = Column(Integer, primary_key=True, index=True)
    img_Path = Column(String, unique=True, index=True)
    img_FileName = Column(String)
    img_Date = Column(DateTime, index=True)
    img_Users = Column(JSON)  # JSONとして保存
    img_WorldName = Column(String, index=True)
    img_WorldID = Column(String, index=True)
    img_Sort = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    def __repr__(self):
        return f"<ImageMetadata(img_Id={self.img_Id}, img_FileName='{self.img_FileName}')>"
    
    def to_dict(self):
        """
        モデルを辞書形式に変換するユーティリティメソッド
        JSONシリアライズ可能な形式で返す
        """
        return {
            "img_Id": self.img_Id,
            "img_Path": self.img_Path,
            "img_FileName": self.img_FileName,
            "img_Date": self.img_Date.isoformat() if self.img_Date else None,
            "img_Users": self.img_Users,
            "img_WorldName": self.img_WorldName,
            "img_WorldID": self.img_WorldID,
            "img_Sort": self.img_Sort,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }