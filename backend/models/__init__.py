from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# SQLAlchemyの基本クラス
Base = declarative_base()

# データベース設定（後でapp.pyから初期化）
engine = None
Session = None

def init_db(db_path):
    global engine, Session
    # SQLiteデータベース接続を作成
    engine = create_engine(f'sqlite:///{db_path}')
    # テーブルが存在しない場合は作成
    Base.metadata.create_all(engine)
    # セッションファクトリを作成
    Session = sessionmaker(bind=engine)
    return Session()