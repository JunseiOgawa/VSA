from flask import Blueprint, jsonify, request, current_app
from services.sync_service import sync_settings_from_json, get_sync_status

sync_bp = Blueprint('sync', __name__)

@sync_bp.route('/', methods=['POST'])
def sync_settings():
    """設定ファイルとDBを同期するAPI"""
    try:
        # リクエストからJSONのパスを取得（オプション）
        data = request.json or {}
        json_path = data.get('json_path')
        
        # 同期処理を実行
        result = sync_settings_from_json(json_path)
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@sync_bp.route('/status', methods=['GET'])
def get_status():
    """同期状態を取得するAPI"""
    try:
        status = get_sync_status()
        return jsonify({
            'success': True,
            'status': status
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500