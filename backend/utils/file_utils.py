import os
from PIL import Image
from typing import Dict, Any, Tuple, List, Callable, Optional
from pathlib import Path

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

def get_folder_size(folder_path: str) -> int:
    """
    フォルダの合計サイズを計算
    
    :param folder_path: フォルダパス
    :return: 合計サイズ（バイト）
    """
    total_size = 0
    for dirpath, _, filenames in os.walk(folder_path):
        for filename in filenames:
            file_path = os.path.join(dirpath, filename)
            if os.path.isfile(file_path):
                total_size += os.path.getsize(file_path)
    return total_size

def get_file_list(folder_path: str, recursive: bool = True) -> List[str]:
    """
    フォルダ内のファイル一覧を取得
    
    :param folder_path: フォルダパス
    :param recursive: サブフォルダを含めるかどうか
    :return: ファイルパスのリスト
    """
    file_list = []
    if recursive:
        for dirpath, _, filenames in os.walk(folder_path):
            for filename in filenames:
                file_list.append(os.path.join(dirpath, filename))
    else:
        with os.scandir(folder_path) as entries:
            for entry in entries:
                if entry.is_file():
                    file_list.append(entry.path)
    return file_list

def format_file_size(size_bytes: int) -> str:
    """
    ファイルサイズを読みやすい形式にフォーマット
    
    :param size_bytes: サイズ（バイト）
    :return: フォーマットされたサイズ文字列
    """
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    unit_index = 0
    size = float(size_bytes)
    
    while size >= 1024.0 and unit_index < len(units) - 1:
        size /= 1024.0
        unit_index += 1
    
    return f"{size:.2f} {units[unit_index]}"

def process_files_with_progress(
    file_list: List[str], 
    process_func: Callable[[str, Dict[str, Any]], None],
    context: Dict[str, Any] = None,
    progress_callback: Optional[Callable[[int, int, str], None]] = None
) -> Dict[str, Any]:
    """
    ファイルリストを処理し、進捗状況をコールバック関数で報告
    
    :param file_list: 処理するファイルパスのリスト
    :param process_func: 各ファイルに適用する処理関数
    :param context: 処理関数に渡すコンテキスト情報
    :param progress_callback: 進捗報告コールバック関数
    :return: 処理結果の集計情報
    """
    total_files = len(file_list)
    processed = 0
    results = {
        "total": total_files,
        "processed": 0,
        "errors": 0
    }
    
    context = context or {}
    
    for file_path in file_list:
        try:
            # ファイルを処理
            process_func(file_path, context)
            results["processed"] += 1
        except Exception as e:
            print(f"Error processing file {file_path}: {e}")
            results["errors"] += 1
        
        # 進捗を更新
        processed += 1
        if progress_callback:
            current_file = os.path.basename(file_path)
            progress_callback(processed, total_files, current_file)
    
    return results