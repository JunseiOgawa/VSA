from flask import Blueprint, jsonify, request, current_app
from services.image_service import get_images, get_image_metadata_by_id, export_images

# Blueprint作成（ルートのグループ化）
images_bp = Blueprint('images', __name__)

@images_bp.route('/', methods=['GET'])
def list_images():
    """画像一覧を取得・検索するAPI"""
    try:
        # クエリパラメータから検索条件を取得
        world_name = request.args.get('world_name')
        friend_name = request.args.get('friend_name')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # サービスレイヤーの関数を呼び出して検索 servicesに送る
        images = get_images(world_name=world_name, friend_name=friend_name, 
                           date_from=date_from, date_to=date_to)
        return jsonify({'success': True, 'images': images})
    except Exception as e:
        # エラーが発生した場合はエラーレスポンスを返す
        return jsonify({'success': False, 'error': str(e)}), 500

@images_bp.route('/<int:image_id>/metadata', methods=['GET'])
def image_metadata(image_id):
    """特定画像のメタデータを取得するAPI"""
    try:
        # IDを指定して画像メタデータを取得
        metadata = get_image_metadata_by_id(image_id)
        if metadata:
            return jsonify({'success': True, 'metadata': metadata})
        return jsonify({'success': False, 'error': 'Image not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@images_bp.route('/export', methods=['POST'])
def export():
    """画像エクスポートAPI"""
    try:
        # リクエストボディからエクスポート設定を取得
        data = request.json
        image_ids = data.get('image_ids', [])
        target_folder = data.get('target_folder')
        
        if not target_folder:
            return jsonify({'success': False, 'error': 'Target folder is required'}), 400
            
        # エクスポート処理を実行
        result = export_images(image_ids, target_folder)
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500