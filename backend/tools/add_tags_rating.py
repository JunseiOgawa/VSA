import os
import sys
import subprocess

def add_tags_rating_columns():
    """tags と rating カラムを追加するマイグレーションを作成して適用する"""
    try:
        # バックエンドディレクトリのパスを取得
        backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        
        # カレントディレクトリをバックエンドに変更
        os.chdir(backend_dir)
        
        print(f"バックエンドディレクトリ: {backend_dir}")
        
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

def update_image_model():
    """image.pyモデルにtagsとratingカラムを追加"""
    model_path = os.path.join('models', 'image.py')
    
    if not os.path.exists(model_path):
        print(f"モデルファイルが見つかりません: {model_path}")
        return
    
    with open(model_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
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
