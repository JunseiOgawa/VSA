from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
import pathlib

# アプリケーションデータディレクトリの取得
# WindowsのC:\Users\<ユーザー名>\AppData\Local\VRC-SnapArchive
app_data_dir = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'VRC-SnapArchive')
# ディレクトリが存在しない場合は作成
os.makedirs(app_data_dir, exist_ok=True)

# DBファイルのパス
db_path = os.path.join(app_data_dir, 'vsa.db')
db_url = f"sqlite:///{db_path}"


# エンジン作成
engine = create_engine(
    db_url, 
    connect_args={"check_same_thread": False}  # SQLiteを複数スレッドで使用するための設定
)

# セッションファクトリ:安全に手動でセッションを管理するためのファクトリ
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# モデル定義のベースクラス
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()