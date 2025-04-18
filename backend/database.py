import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# データベースファイルの場所を設定
DB_DIRECTORY = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
os.makedirs(DB_DIRECTORY, exist_ok=True)
DB_PATH = os.path.join(DB_DIRECTORY, "vsa.db")

SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

# SQLiteの場合は connect_args={"check_same_thread": False} が必要
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# 依存性注入用の関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()