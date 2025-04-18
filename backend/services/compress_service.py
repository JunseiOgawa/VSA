import os
import shutil
import tempfile
from typing import List, Dict, Any
from pathlib import Path
import py7zr
from PIL import Image as PILImage

class CompressService:
    @staticmethod
    def compress_images(image_ids: List[int], output_path: str = None, format: str = "7z") -> Dict[str, Any]:
        """
        選択した画像を圧縮してダウンロード用ファイルを作成
        
        Args:
            image_ids: 圧縮する画像IDのリスト
            output_path: 出力先パス（指定しない場合は一時ディレクトリに作成）
            format: 圧縮形式（7z, zip）
            
        Returns:
            圧縮ファイルのパスと詳細情報
        """
        from services.image_service import ImageService
        
        # 一時ディレクトリを作成
        temp_dir = tempfile.mkdtemp()
        
        try:
            # 画像ファイルを一時ディレクトリにコピー
            copied_files = []
            
            for image_id in image_ids:
                try:
                    # 画像メタデータを取得
                    image_metadata = ImageService.get_image_metadata(image_id)
                    
                    # ファイルパスを取得
                    filepath = image_metadata.get("filepath")
                    
                    if filepath and os.path.exists(filepath):
                        # ファイル名を取得
                        filename = os.path.basename(filepath)
                        
                        # 一時ディレクトリにコピー
                        dest_path = os.path.join(temp_dir, filename)
                        shutil.copy2(filepath, dest_path)
                        
                        copied_files.append({
                            "id": image_id,
                            "original_path": filepath,
                            "temp_path": dest_path,
                            "filename": filename
                        })
                except Exception as e:
                    print(f"Error processing image {image_id}: {e}")
            
            if not copied_files:
                return {
                    "success": False,
                    "error": "No valid images found",
                    "file_path": None
                }
            
            # 出力ファイルのパスを設定
            if not output_path:
                # 一時ファイルに作成
                output_file = tempfile.mktemp(suffix=f".{format}")
            else:
                # 指定されたパスに作成
                output_file = output_path
                if not output_file.endswith(f".{format}"):
                    output_file += f".{format}"
            
            # ディレクトリを作成
            os.makedirs(os.path.dirname(os.path.abspath(output_file)), exist_ok=True)
            
            # 圧縮処理
            if format.lower() == "7z":
                with py7zr.SevenZipFile(output_file, 'w') as archive:
                    for file_info in copied_files:
                        archive.write(file_info["temp_path"], arcname=file_info["filename"])
            elif format.lower() == "zip":
                shutil.make_archive(
                    output_file.rstrip(".zip"),
                    'zip',
                    temp_dir
                )
            else:
                return {
                    "success": False,
                    "error": f"Unsupported format: {format}",
                    "file_path": None
                }
            
            return {
                "success": True,
                "file_path": output_file,
                "file_count": len(copied_files),
                "file_size": os.path.getsize(output_file),
                "format": format
            }
            
        finally:
            # 一時ディレクトリを削除
            shutil.rmtree(temp_dir)
    
    @staticmethod
    def convert_image(image_path: str, output_format: str = "jpg", quality: int = 85) -> Dict[str, Any]:
        """
        画像を別の形式に変換
        
        Args:
            image_path: 変換する画像のパス
            output_format: 出力形式（jpg, png, webp, avif, jxl）
            quality: 品質（1-100）
            
        Returns:
            変換結果の情報
        """
        try:
            # 元の画像を開く
            img = PILImage.open(image_path)
            
            # 出力ファイル名を生成
            original_path = Path(image_path)
            output_dir = original_path.parent
            output_filename = f"{original_path.stem}.{output_format.lower()}"
            output_path = output_dir / output_filename
            
            # 変換オプションを設定
            save_options = {}
            
            if output_format.lower() in ["jpg", "jpeg"]:
                save_options["quality"] = quality
                save_options["optimize"] = True
                if img.mode == "RGBA":
                    img = img.convert("RGB")
            
            elif output_format.lower() == "png":
                save_options["optimize"] = True
            
            elif output_format.lower() == "webp":
                save_options["quality"] = quality
                save_options["method"] = 6  # 最高圧縮
            
            elif output_format.lower() == "avif":
                save_options["quality"] = quality
            
            elif output_format.lower() == "jxl":
                save_options["quality"] = quality
            
            # 画像を保存
            img.save(output_path, format=output_format.upper(), **save_options)
            
            # 結果を返す
            return {
                "success": True,
                "original_path": str(image_path),
                "output_path": str(output_path),
                "format": output_format,
                "original_size": os.path.getsize(image_path),
                "output_size": os.path.getsize(output_path)
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "original_path": str(image_path)
            }