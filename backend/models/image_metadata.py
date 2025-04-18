import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship

from database import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filepath = Column(String, unique=True, nullable=False)
    filename = Column(String, nullable=False)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    modified_date = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # VRChat関連メタデータ
    world_name = Column(String, nullable=True, index=True)
    world_id = Column(String, nullable=True, index=True)
    img_date = Column(DateTime, nullable=True, index=True)
    
    # JSON形式で保存されるメタデータ（友達リストなど）
    meta_data = Column(JSON, nullable=True)
    
    # リレーションシップ（後で実装）
    # albums = relationship("Album", secondary="image_album", back_populates="images")
    # composites = relationship("Composite", secondary="image_composite", back_populates="images")