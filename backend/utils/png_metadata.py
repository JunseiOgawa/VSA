from PIL import Image
import json
import io

def read_png_metadata(file_path):
    """PNG画像からメタデータを読み取る"""
    try:
        with Image.open(file_path) as img:
            # PNGのテキストチャンクからデータを取得
            metadata = {}
            if 'tEXt' in img.info:
                for key, value in img.info['tEXt'].items():
                    # バイナリデータをデコード
                    if isinstance(key, bytes):
                        key = key.decode('utf-8', errors='ignore')
                    if isinstance(value, bytes):
                        value = value.decode('utf-8', errors='ignore')
                    metadata[key] = value
                    
            # VRChat固有のメタデータキーをチェック
            vrc_metadata = {}
            for key in ['vrc_world_id', 'vrc_world_name', 'vrc_friends']:
                if key in metadata:
                    # JSONとして解析可能なものは解析
                    try:
                        vrc_metadata[key] = json.loads(metadata[key])
                    except json.JSONDecodeError:
                        vrc_metadata[key] = metadata[key]
            
            return vrc_metadata
    except Exception as e:
        print(f"Error reading metadata from {file_path}: {e}")
        return {}

def write_png_metadata(file_path, metadata_dict):
    """PNG画像にメタデータを書き込む"""
    try:
        # 画像を開く
        img = Image.open(file_path)
        
        # メタデータをテキスト形式に変換
        text_info = {}
        for key, value in metadata_dict.items():
            if isinstance(value, (dict, list)):
                # 辞書やリストはJSONに変換
                text_info[key] = json.dumps(value)
            else:
                text_info[key] = str(value)
        
        # メタデータを追加して保存
        img_with_metadata = img.copy()
        img_with_metadata.save(file_path, pnginfo=text_info)
        
        return True
    except Exception as e:
        print(f"Error writing metadata to {file_path}: {e}")
        return False