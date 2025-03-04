from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sys
import socket

# 開発モードチェック
dev_mode = not getattr(sys, 'frozen', False)

app = Flask(__name__)
CORS(app)  # Cross-Origin Resource Sharingを有効化

# APIエンドポイント
@app.route('/api/settings', methods=['GET', 'POST'])
def handle_settings():
    if request.method == 'GET':
        # 設定ファイルを読み込んで返す
        return jsonify({'status': 'success', 'data': {}})
    else:
        # POSTリクエストで設定を更新
        data = request.json
        # 設定ファイルへの保存処理
        return jsonify({'status': 'success'})

# ワールド情報取得API
@app.route('/api/worlds', methods=['GET'])
def get_worlds():
    # VRChatログからワールド情報を取得する処理
    return jsonify({'status': 'success', 'data': []})

# サーバー起動
if __name__ == '__main__':
    # デフォルトポート
    port = 5000
    host = '127.0.0.1'  # localhost
    
    # ポートが使用中の場合は別のポートを試行
    while True:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind((host, port))
                break
        except socket.error:
            port += 1
    
    print(f"Starting server on {host}:{port}")
    if dev_mode:
        app.run(debug=True, host=host, port=port)
    else:
        app.run(host=host, port=port)