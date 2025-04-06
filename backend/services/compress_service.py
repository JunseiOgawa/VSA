import os
import json
import shutil
import tempfile
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from pathlib import Path

# 圧縮関連ライブラリ
import py7zr
from PIL import Image

# プロジェクト内モジュール
from ..utils.file_utils import is_image_file, get_image_dimensions

# ロガー設定
logger = logging.getLogger(__name__)

class CompressService:
    """
    画像圧縮サービス
    VRChatスクリーンショットを圧縮してアーカイブするための機能を提供
    """
    
    @staticmethod
    def compress_folder(source_path: str, output_path: str, monthly_compress: bool = True) -> Dict[str, Any]:
        """
        指定フォルダの画像を圧縮処理してアーカイブ化する
        
        :param source_path: 圧縮対象のフォルダパス
        :param output_path: 圧縮ファイルの出力先
        :param monthly_compress: 月別圧縮モードフラグ
        :return: 処理結果の情報
        """
        try:
            source_dir = Path(source_path)
            output_dir = Path(output_path)
            
            # 入力元フォルダ名を取得（月別名のパターンを想定）
            folder_name = source_dir.name
            
            # 出力先が存在しない場合は作成
            if not output_dir.exists():
                output_dir.mkdir(parents=True, exist_ok=True)
            
            # 一時作業ディレクトリを作成
            with tempfile.TemporaryDirectory() as temp_dir:
                temp_path = Path(temp_dir)
                logger.info(f"一時作業ディレクトリを作成: {temp_path}")
                
                # メタデータを格納するリスト
                metadata_list = []
                
                # 処理ファイル情報
                processed_files = {
                    "total": 0,
                    "images": 0,
                    "other": 0,
                    "errors": 0,
                    "total_original_size": 0,
                    "total_compressed_size": 0
                }
                
                # ソースフォルダ内のすべてのファイルを処理
                for file_path in source_dir.glob("**/*"):
                    if file_path.is_file():
                        processed_files["total"] += 1
                        original_size = file_path.stat().st_size
                        processed_files["total_original_size"] += original_size
                        
                        # 画像ファイルの処理
                        if is_image_file(str(file_path)):
                            try:
                                processed_files["images"] += 1
                                
                                # ファイルのメタデータを取得
                                rel_path = file_path.relative_to(source_dir)
                                width, height = get_image_dimensions(str(file_path))
                                
                                # メタデータ情報を構築
                                file_metadata = {
                                    "filename": file_path.name,
                                    "path": str(rel_path),
                                    "size": original_size,
                                    "modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                                    "dimensions": {
                                        "width": width,
                                        "height": height
                                    }
                                }
                                
                                # メタデータをリストに追加
                                metadata_list.append(file_metadata)
                                
                                # 一時ディレクトリにJXL形式で圧縮コピー
                                dest_path = temp_path / rel_path.with_suffix('.jxl')
                                dest_path.parent.mkdir(parents=True, exist_ok=True)
                                
                                # PILを使って画像を開き、JXL形式で保存
                                try:
                                    with Image.open(file_path) as img:
                                        # 可逆圧縮として保存（品質100）
                                        img.save(dest_path, format="JXL", quality=100, lossless=True)
                                        # 圧縮後のサイズを加算
                                        compressed_size = dest_path.stat().st_size
                                        processed_files["total_compressed_size"] += compressed_size
                                except Exception as e:
                                    logger.error(f"JXL変換エラー {file_path}: {str(e)}")
                                    # エラー時は元のファイルをそのままコピー
                                    shutil.copy2(file_path, temp_path / rel_path)
                                    processed_files["errors"] += 1
                                    processed_files["total_compressed_size"] += original_size
                            
                            except Exception as e:
                                logger.error(f"画像処理エラー {file_path}: {str(e)}")
                                processed_files["errors"] += 1
                        else:
                            # 画像以外のファイル（そのままコピー）
                            processed_files["other"] += 1
                            rel_path = file_path.relative_to(source_dir)
                            dest_path = temp_path / rel_path
                            dest_path.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(file_path, dest_path)
                            processed_files["total_compressed_size"] += original_size
                
                # メタデータJSONファイルを作成
                metadata_file = temp_path / "metadata.json"
                with open(metadata_file, 'w', encoding='utf-8') as f:
                    json.dump({
                        "folder_name": folder_name,
                        "compression_date": datetime.now().isoformat(),
                        "file_count": processed_files["total"],
                        "image_count": processed_files["images"],
                        "files": metadata_list
                    }, f, ensure_ascii=False, indent=2)
                
                # 7zアーカイブファイル名を生成
                archive_name = f"{folder_name}.7z"
                archive_path = output_dir / archive_name
                
                # 7z形式で圧縮
                logger.info(f"7zアーカイブを作成: {archive_path}")
                with py7zr.SevenZipFile(archive_path, 'w') as archive:
                    # 一時ディレクトリ内のすべてのファイルを追加
                    for root, dirs, files in os.walk(temp_path):
                        for file in files:
                            file_path = os.path.join(root, file)
                            # パスを相対パスに変換してアーカイブに追加
                            arcname = os.path.relpath(file_path, temp_path)
                            archive.write(file_path, arcname)
                
                # 圧縮後のアーカイブサイズを取得
                archive_size = archive_path.stat().st_size
                
                # 圧縮率を計算
                if processed_files["total_original_size"] > 0:
                    compression_ratio = (1 - archive_size / processed_files["total_original_size"]) * 100
                else:
                    compression_ratio = 0
                
                # 結果情報を返す
                return {
                    "success": True,
                    "source_path": source_path,
                    "output_path": str(archive_path),
                    "folder_name": folder_name,
                    "file_count": processed_files["total"],
                    "image_count": processed_files["images"],
                    "other_count": processed_files["other"],
                    "error_count": processed_files["errors"],
                    "original_size": processed_files["total_original_size"],
                    "compressed_size": archive_size,
                    "compression_ratio": compression_ratio,
                    "complete_time": datetime.now().isoformat()
                }
                
        except Exception as e:
            logger.error(f"圧縮処理エラー: {str(e)}", exc_info=True)
            return {
                "success": False,
                "source_path": source_path,
                "error": str(e)
            }
    
    @staticmethod
    def get_monthly_folders(base_path: str, include_current: bool = False) -> List[Dict[str, Any]]:
        """
        指定されたベースパスから月別フォルダ一覧を取得する
        
        :param base_path: 基準となるフォルダパス
        :param include_current: 現在月のフォルダを含めるかどうか
        :return: 月別フォルダ情報のリスト
        """
        try:
            base_dir = Path(base_path)
            if not base_dir.exists() or not base_dir.is_dir():
                return []
            
            # 現在の年月を取得
            now = datetime.now()
            current_year_month = f"{now.year}-{now.month:02d}"
            
            # フォルダ一覧を取得
            folders = []
            for item in base_dir.iterdir():
                if item.is_dir():
                    # YYYY-MM形式のフォルダ名を検出
                    folder_name = item.name
                    if len(folder_name) == 7 and folder_name[4] == '-' and folder_name[:4].isdigit() and folder_name[5:].isdigit():
                        # 現在月を除外オプションがある場合
                        if not include_current and folder_name == current_year_month:
                            continue
                        
                        # フォルダ情報を取得
                        try:
                            # フォルダ内のファイル数を計算
                            file_count = sum(1 for _ in item.glob('**/*') if _.is_file())
                            
                            # フォルダサイズを計算
                            folder_size = sum(f.stat().st_size for f in item.glob('**/*') if f.is_file())
                            
                            # 最終更新日時を取得
                            last_modified = datetime.fromtimestamp(item.stat().st_mtime).isoformat()
                            
                            folders.append({
                                "name": folder_name,
                                "path": str(item),
                                "file_count": file_count,
                                "size": folder_size,
                                "size_formatted": CompressService._format_size(folder_size),
                                "last_modified": last_modified
                            })
                        except Exception as e:
                            logger.error(f"フォルダ情報取得エラー {folder_name}: {str(e)}")
            
            # 新しいものから順に並べ替え
            folders.sort(key=lambda x: x["name"], reverse=True)
            return folders
            
        except Exception as e:
            logger.error(f"月別フォルダ取得エラー: {str(e)}")
            return []
    
    @staticmethod
    def _format_size(size_bytes: int) -> str:
        """
        バイトサイズを人間が読みやすい形式にフォーマット
        
        :param size_bytes: バイトサイズ
        :return: フォーマットされたサイズ文字列
        """
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 * 1024:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 * 1024 * 1024:
            return f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            return f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"
