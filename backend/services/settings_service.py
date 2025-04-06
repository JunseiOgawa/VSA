import os
import json
from typing import Dict, Any, Optional

class SettingsService:
    @staticmethod
    def initialize_settings() -> bool:
        """
        appsettings.jsonが存在するかを確認し、存在しない場合はデフォルト設定で作成する
        
        :return: 初期化成功フラグ
        """
        try:
            # プロジェクトのルートディレクトリパスを取得
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            
            settings_path = os.path.join(root_dir, "appsettings.json")
            
            # appsettings.jsonが存在しない場合、デフォルト設定で作成
            if not os.path.exists(settings_path):
                default_settings = {
                    "screenshotPath": "",
                    "outputPath": "",
                    "folderStructure": {
                        "enabled": True,
                        "type": "month"
                    },
                    "fileRenaming": {
                        "enabled": True,
                        "format": "yyyy-MM-dd-HHmm-seq"
                    },
                    "metadata": {
                        "enabled": True,
                        "addWorldName": True,
                        "addDateTime": True
                    },
                    "compression": {
                        "autoCompress": True,
                        "compressionLevel": "medium",
                        "originalFileHandling": "keep"
                    },
                    "performance": {
                        "cpuThreshold": 80,
                        "maxConcurrentProcessing": 10
                    },
                    "language": "ja"
                }
                
                with open(settings_path, 'w', encoding='utf-8') as f:
                    json.dump(default_settings, f, ensure_ascii=False, indent=4)
                
                print(f"Created default appsettings.json at {settings_path}")
                return True
            
            return True
            
        except Exception as e:
            print(f"Error initializing settings: {str(e)}")
            return False

    @staticmethod
    def get_settings() -> Dict[str, Any]:
        """
        現在の設定を取得する
        
        :return: 設定情報
        """
        try:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            settings_path = os.path.join(root_dir, "appsettings.json")
            
            if not os.path.exists(settings_path):
                # appsettings.jsonがない場合、初期化を試みる
                success = SettingsService.initialize_settings()
                if not success:
                    return {}
            
            with open(settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            
            # フロントエンド用に一部設定を変換
            frontend_settings = {
                "screenshotPath": settings.get("screenshotPath", ""),
                "outputPath": settings.get("outputPath", ""),
                "language": settings.get("language", "ja"),
                "autoCompress": settings.get("compression", {}).get("autoCompress", True),
            }
            
            return frontend_settings
            
        except Exception as e:
            print(f"Error getting settings: {str(e)}")
            return {}
    
    @staticmethod
    def update_settings(new_settings: Dict[str, Any]) -> bool:
        """
        設定を更新する
        
        :param new_settings: 新しい設定情報
        :return: 更新成功フラグ
        """
        try:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            settings_path = os.path.join(root_dir, "appsettings.json")
            
            # 現在の設定を読み込む
            if os.path.exists(settings_path):
                with open(settings_path, 'r', encoding='utf-8') as f:
                    current_settings = json.load(f)
            else:
                # ファイルがなければ初期化
                SettingsService.initialize_settings()
                with open(settings_path, 'r', encoding='utf-8') as f:
                    current_settings = json.load(f)
            
            # フロントエンドから送られてきた設定を適切な場所に反映
            if "screenshotPath" in new_settings:
                current_settings["screenshotPath"] = new_settings["screenshotPath"]
            
            if "outputPath" in new_settings:
                current_settings["outputPath"] = new_settings["outputPath"]
            
            if "language" in new_settings:
                current_settings["language"] = new_settings["language"]
            
            if "autoCompress" in new_settings:
                if "compression" not in current_settings:
                    current_settings["compression"] = {}
                current_settings["compression"]["autoCompress"] = new_settings["autoCompress"]
            
            # 更新した設定を保存
            with open(settings_path, 'w', encoding='utf-8') as f:
                json.dump(current_settings, f, ensure_ascii=False, indent=4)
            
            return True
            
        except Exception as e:
            print(f"Error updating settings: {str(e)}")
            return False