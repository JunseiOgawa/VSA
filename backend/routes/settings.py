from flask import Blueprint, jsonify, request, current_app
from services.settings_service import get_all_settings, get_setting_by_key, update_setting

# Blueprint作成
settings_bp = Blueprint('settings', __name__)

@settings_bp.route('/', methods=['GET'])
def get_settings():
    """すべての設定を取得するAPI"""
    try:
        settings = get_all_settings()
        return jsonify({'success': True, 'settings': settings})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/<string:key>', methods=['GET'])
def get_setting(key):
    """特定の設定キーの値を取得するAPI"""
    try:
        setting = get_setting_by_key(key)
        if setting:
            return jsonify({'success': True, 'setting': setting})
        return jsonify({'success': False, 'error': 'Setting not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@settings_bp.route('/', methods=['PUT'])
def update_settings():
    """設定を更新するAPI"""
    try:
        data = request.json
        if not isinstance(data, dict):
            return jsonify({'success': False, 'error': 'Invalid data format'}), 400
            
        results = {}
        for key, value in data.items():
            results[key] = update_setting(key, value)
            
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500