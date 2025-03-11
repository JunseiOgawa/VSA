from flask import Flask, jsonify
from flask_cors import CORS
import os
import sys
import socket
import argparse
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

def main():
    """メイン関数: サーバーの初期化と起動"""
    parser = argparse.ArgumentParser(description='VSA Backend API Server')
    parser.add_argument('--port', type=int, default=5000, help='Port to run the server on')
    parser.add_argument('--host', type=str, default='127.0.0.1', help='Host to run the server on')
    parser.add_argument('--dev', action='store_true', help='Development mode')
    parser.add_argument('--db-path', type=str, default=None, help='Path to SQLite database')
    parser.add_argument('--no-sync', action='store_true', help='Skip settings synchronization')
    args = parser.parse_args()
    
    # データベースパスの設定
    if not args.db_path:
        # デフォルトのデータパスを設定
        app_data_dir = os.path.join(os.environ.get('APPDATA', os.path.expanduser('~')), 'VRC-SnapArchive')
        os.makedirs(app_data_dir, exist_ok=True)
        db_path = os.path.join(app_data_dir, 'vsa_data.db')
    else:
        db_path = args.db_path
    
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