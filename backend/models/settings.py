import datetime
from sqlalchemy import Column, Integer, String, DateTime, JSON
from database import Base

class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, nullable=False, index=True)
    value = Column(JSON, nullable=True)
    created_date = Column(DateTime, default=datetime.datetime.utcnow)
    modified_date = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)