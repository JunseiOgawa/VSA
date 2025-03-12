import os
import sys
import subprocess
import json

def add_tags_rating_columns():
    """tags と rating カラムを追加するマイグレーションを作成して適用する"""
    try:
        # バックエンドディレクトリのパスを取得
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # カレントディレクトリをバックエンドに変更
        os.chdir(backend_dir)
        
        print(f"バックエンドディレクトリ: {backend_dir}")
        
        # alembic.ini が存在するか確認し、なければ作成
        setup_alembic()
        
        # モデルファイルを更新
        update_image_model()
        
        # マイグレーションの生成と適用
        print("マイグレーションを生成中...")
        subprocess.run(["alembic", "revision", "--autogenerate", "-m", "Add tags and rating columns"], check=True)
        
        print("マイグレーションを適用中...")
        subprocess.run(["alembic", "upgrade", "head"], check=True)
        
        print("マイグレーション完了！")
        return True
    except Exception as e:
        print(f"エラー: {str(e)}")
        return False

def setup_alembic():
    """Alembicの設定ファイルを作成し初期化する"""
    # alembic.ini が存在するか確認
    if not os.path.exists('alembic.ini'):
        print("alembic.ini が見つかりません。新しく作成します...")
        
        # alembic init を実行
        subprocess.run(["alembic", "init", "migrations"], check=True)
        
        # alembic.ini を編集
        with open('alembic.ini', 'r') as f:
            config = f.read()
        
        # SQLAlchemy URL を設定 (SQLite を使用する例)
        config = config.replace('sqlalchemy.url = driver://user:pass@localhost/dbname', 
                              'sqlalchemy.url = sqlite:///app.db')
        
        with open('alembic.ini', 'w') as f:
            f.write(config)
        
        # env.py を編集してモデルをインポート
        env_path = os.path.join('migrations', 'env.py')
        with open(env_path, 'r') as f:
            env_content = f.read()
        
        # モデルのインポート行を追加
        import_line = "\nfrom models import Base\n"
        target = "from alembic import context"
        env_content = env_content.replace(target, target + import_line)
        
        # target_metadata を設定
        env_content = env_content.replace("target_metadata = None", "target_metadata = Base.metadata")
        
        with open(env_path, 'w') as f:
            f.write(env_content)
        
        print("Alembicの設定が完了しました")

def update_image_model():
    """image.pyモデルにtagsとratingカラムを追加"""
    model_path = os.path.join('models', 'image.py')
    
    if not os.path.exists(model_path):
        print(f"モデルファイルが見つかりません: {model_path}")
        return
    
    with open(model_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    # jsonモジュールのインポートを確認・追加
    has_json_import = any('import json' in line for line in lines)
    if not has_json_import:
        for i, line in enumerate(lines):
            if line.startswith('import ') or line.startswith('from '):
                lines.insert(i + 1, 'import json\n')
                break
    
    # カラム定義を追加
    column_added = False
    for i, line in enumerate(lines):
        if "updated_at = Column(DateTime" in line:
            lines.insert(i + 1, "    tags = Column(Text)  # タグ情報をJSON形式で保存\n")
            lines.insert(i + 2, "    rating = Column(Integer)  # 評価（1-5星など）\n")
            column_added = True
            break
    
    # to_dict メソッドを更新
    for i, line in enumerate(lines):
        if "'updated_at': self.updated_at.isoformat()" in line:
            lines[i] = lines[i].replace("'updated_at': self.updated_at.isoformat()", 
                                        "'updated_at': self.updated_at.isoformat(),\n            "
                                        "'tags': json.loads(self.tags) if self.tags else [],\n            "
                                        "'rating': self.rating")
            break
    
    if column_added:
        with open(model_path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
        print(f"モデルファイル{model_path}を更新しました")
    else:
        print(f"モデルファイルの更新に失敗しました")

if __name__ == "__main__":
    if add_tags_rating_columns():
        sys.exit(0)
    else:
        sys.exit(1)
