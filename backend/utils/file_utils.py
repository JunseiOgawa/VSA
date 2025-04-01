import os
from PIL import Image
from typing import Dict, Any, Tuple

def is_image_file(file_path: str) -> bool:
    """
    ファイルが画像ファイルかどうかを判定
    
    :param file_path: ファイルパス
    :return: 画像ファイルならTrue
    """
    _, ext = os.path.splitext(file_path)
    return ext.lower() in ['.png', '.jpg', '.jpeg', '.jxl', '.webp']

def get_image_dimensions(file_path: str) -> Tuple[int, int]:
    """
    画像の幅と高さを取得
    
    :param file_path: 画像ファイルのパス
    :return: (幅, 高さ)のタプル
    """
    try:
        with Image.open(file_path) as img:
            return img.size
    except Exception as e:
        print(f"Error getting image dimensions: {e}")
        return (0, 0)