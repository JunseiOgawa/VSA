import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey, Table
from sqlalchemy.orm import relationship
from database import Base

# 画像とコンポジットの多対多関連付けテーブル
image_composite = Table(
    "image_composite",
    Base.metadata,
    Column("image_id", Integer, ForeignKey("images.id"), primary_key=True),
    Column("composite_id", Integer, ForeignKey("composites.id"), primary_key=True),
    Column("position", Integer, nullable=True)  # 画像の配置位置情報
)

class Composite(Base):
    __tablename__ = "composites"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    layout = Column(JSON, nullable=True)  # レイアウト情報をJSON形式で保存
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    modified_date = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    # リレーションシップ
    images = relationship("Image", secondary=image_composite, backref="composites")