from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys
import socket
import argparse
import sqlite3
from models import init_db
from routes import register_routes
from services.sync_service import sync_settings_from_json, update_sync_status

# 開発モードチェック
dev_mode = not getattr(sys, 'frozen', False)

app = Flask(__name__)
CORS(app)  # Cross-Origin Resource Sharingを有効化

# ヘルスチェックエンドポイント
@app.route('/api/health', methods=['GET'])
def health_check():
    """APIサーバーのヘルスチェック"""
    return {'status': 'ok'}

def find_free_port(host='127.0.0.1', port=5000, max_port=5100):
    """使用可能なポートを見つける"""
    for p in range(port, max_port):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, p))
                return p
        except socket.error:
            port += 1
    raise RuntimeError(f"Could not find a free port between {port} and {max_port}")

def sync_settings_on_startup():
    """起動時に設定を同期"""
    try:
        # プロジェクトルートディレクトリの取得
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        parent_dir = os.path.dirname(base_dir)
        default_json_path = os.path.join(parent_dir, 'appsettings.json')
        
        # 同期処理実行
        if os.path.exists(default_json_path):
            result = sync_settings_from_json(default_json_path)
            # 同期状態を更新
            update_sync_status(result)
            
            if result['success']:
                print(f"設定ファイルと同期しました: {result['settings_updated']}項目を更新")
            else:
                print(f"設定ファイルの同期に失敗: {result.get('error', '不明なエラー')}")
        else:
            print(f"設定ファイルが見つかりません: {default_json_path}")
    except Exception as e:
        print(f"設定同期エラー: {str(e)}")

def run_migrations(db_path):
    """データベースマイグレーションを実行"""
    try:
        print("データベースマイグレーションを実行中...")
        
        # データベースが存在するか確認
        if not os.path.exists(db_path):
            print(f"データベースがまだ存在しません: {db_path}")
            return
            
        # SQLite接続
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # image_metadataテーブルに存在するかを確認
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='image_metadata'")
        if not cursor.fetchone():
            print("image_metadataテーブルが存在しないため、マイグレーションをスキップします")
            return
            
        # username列の有無を確認
        cursor.execute("PRAGMA table_info(image_metadata)")
        columns = cursor.fetchall()
        column_names = [column[1] for column in columns]
        
        if 'username' not in column_names:
            print("username列を追加中...")
            cursor.execute("ALTER TABLE image_metadata ADD COLUMN username TEXT")
            conn.commit()
            print("マイグレーション成功: username列を追加しました")
        
        conn.close()
    except Exception as e:
        print(f"マイグレーションエラー: {str(e)}")

def run_migrations_with_alembic(db_path):
    """Alembicマイグレーションを実行"""
    try:
        print("Alembicマイグレーションを実行中...")
        
        # バックエンドディレクトリのパスを取得
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        
        # カレントディレクトリを一時的に変更
        original_dir = os.getcwd()
        os.chdir(backend_dir)
        
        # Alembic設定を読み込み
        from alembic.config import Config
        from alembic import command
        
        alembic_cfg = Config('alembic.ini')
        
        # SQLiteデータベースのURIを設定ファイルで更新
        alembic_cfg.set_main_option('sqlalchemy.url', f'sqlite:///{db_path}')
        
        # マイグレーションを最新状態に更新
        command.upgrade(alembic_cfg, 'head')
        
        print("マイグレーションが完了しました")
        
        # カレントディレクトリを元に戻す
        os.chdir(original_dir)
    except Exception as e:
        print(f"マイグレーションエラー: {str(e)}")

def migrate_database(source_db_path, target_db_path):
    """古いデータベースから新しいデータベースに内容を移行する"""
    if not os.path.exists(source_db_path):
        print(f"移行元データベースが見つかりません: {source_db_path}")
        return False
    
    # 単純にコピーするか、SQLiteのバックアップAPIを使用
    import shutil
    
    # ターゲットディレクトリが存在することを確認
    target_dir = os.path.dirname(target_db_path)
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
    
    # 既存のデータベースがある場合はバックアップ
    if os.path.exists(target_db_path):
        backup_path = f"{target_db_path}.bak"
        shutil.copy2(target_db_path, backup_path)
        print(f"既存のデータベースをバックアップしました: {backup_path}")
    
    # データベースファイルをコピー
    shutil.copy2(source_db_path, target_db_path)
    return True

def main():
    """メイン関数: サーバーの初期化と起動"""
    parser = argparse.ArgumentParser(description='VSA Backend API Server')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to run the server on')
    parser.add_argument('--dev', action='store_true', help='Development mode')
    parser.add_argument('--db-path', type=str, default=None, help='Path to SQLite database')
    parser.add_argument('--no-sync', action='store_true', help='Skip settings synchronization')
    parser.add_argument('--migrate-old-db', action='store_true', help='Migrate data from old database')
    parser.add_argument('--no-migrate', action='store_true', help='Skip database migration')
    args = parser.parse_args()
    
    # データベースパスの設定 - ルートディレクトリに変更
    if not args.db_path:
        # プロジェクトルートディレクトリの取得（backendの親ディレクトリ）
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        db_path = os.path.join(base_dir, 'vsa_data.db')
        
        # 古いデータベースのパス
        old_db_path = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 
                                   'VRC-SnapArchive', 'vsa_data.db')
        
        # 古いDBが存在し、新しいDBが存在しない場合、または移行フラグが設定されている場合
        if args.migrate_old_db and os.path.exists(old_db_path):
            if not os.path.exists(db_path) or args.migrate_old_db:
                try:
                    print(f"古いデータベースから新しい場所にデータを移行します...")
                    migrate_database(old_db_path, db_path)
                    print(f"データベース移行完了: {old_db_path} -> {db_path}")
                except Exception as e:
                    print(f"データベース移行エラー: {str(e)}")
    else:
        db_path = args.db_path
    
    # 従来の手動マイグレーションの代わりにAlembicを使用
    if not args.no_migrate:
        run_migrations_with_alembic(db_path)
    
    # データベース初期化
    db_session = init_db(db_path)
    app.config['DB_SESSION'] = db_session
    
    # ルート登録
    register_routes(app)
    
    # 設定同期（--no-syncオプションが指定されていなければ実行）
    if not args.no_sync:
        sync_settings_on_startup()
    
    # 利用可能なポートを見つける
    host = args.host
    port = find_free_port(host, args.port)
    
    print(f"Starting server on {host}:{port}")
    print(f"Database path: {db_path}")
    
    if args.dev or dev_mode:
        app.run(debug=True, host=host, port=port)
    else:
        app.run(host=host, port=port)

if __name__ == '__main__':
    main()