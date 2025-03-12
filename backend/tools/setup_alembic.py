import os
import sys
import subprocess
import shutil

def init_alembic():
    """バックエンドディレクトリでAlembicを初期化"""
    try:
        # バックエンドディレクトリのパスを取得
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # カレントディレクトリをバックエンドに変更
        os.chdir(backend_dir)
        
        print(f"バックエンドディレクトリ: {backend_dir}")
        
        # alembicディレクトリが既にあれば削除
        alembic_dir = os.path.join(backend_dir, 'alembic')
        if os.path.exists(alembic_dir):
            print(f"既存のalembicディレクトリを削除: {alembic_dir}")
            shutil.rmtree(alembic_dir)
        
        # alembic initコマンドを実行
        print("Alembicを初期化中...")
        subprocess.run(["alembic", "init", "alembic"], check=True)
        
        # env.pyを更新
        update_env_py()
        
        # alembic.iniを更新
        update_alembic_ini()
        
        print("Alembic初期化完了。env.pyとalembic.iniを設定しました。")
        print("次のコマンドでマイグレーションを生成できます：")
        print("cd backend")
        print("alembic revision --autogenerate -m \"Add tags and rating columns\"")
        
        return True
    except Exception as e:
        print(f"エラー: {str(e)}")
        return False

def update_env_py():
    """env.pyファイルを更新してモデルをインポート"""
    env_path = os.path.join('alembic', 'env.py')
    
    if not os.path.exists(env_path):
        print(f"env.pyが見つかりません: {env_path}")
        return
    
    with open(env_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # モデルインポートとターゲットメタデータ設定を追加
    import_code = """
# モデルをインポート
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import Base
from models.image import ImageMetadata
# 他のモデルもここで必要に応じてインポート

# ターゲットメタデータの設定
target_metadata = Base.metadata
"""
    
    # target_metadata = None の行を置換
    content = content.replace("target_metadata = None", import_code)
    
    # SQLiteでのALTER TABLE対応を追加
    online_func = """def run_migrations_online() -> None:
    \"\"\"Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.
    \"\"\"
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata,
            # SQLite対応の設定
            render_as_batch=True,
            compare_type=True
        )

        with context.begin_transaction():
            context.run_migrations()"""
    
    # 元のrun_migrations_online関数を置き換える
    import re
    pattern = r"def run_migrations_online.*?context\.run_migrations\(\)"
    content = re.sub(pattern, online_func, content, flags=re.DOTALL)
    
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("env.pyを更新しました")

def update_alembic_ini():
    """alembic.iniファイルを更新してSQLite接続を設定"""
    ini_path = 'alembic.ini'
    
    if not os.path.exists(ini_path):
        print(f"alembic.iniが見つかりません: {ini_path}")
        return
    
    with open(ini_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # SQLite接続文字列を設定
    db_path = os.path.join('..', 'vsa_data.db')
    content = content.replace("sqlalchemy.url = driver://user:pass@localhost/dbname", 
                             f"sqlalchemy.url = sqlite:///{db_path}")
    
    with open(ini_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("alembic.iniを更新しました")

if __name__ == "__main__":
    if init_alembic():
        sys.exit(0)
    else:
        sys.exit(1)
