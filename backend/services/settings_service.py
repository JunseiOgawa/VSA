import os
import json
import shutil
from typing import Dict, Any, List, Optional
from ..models.settings import Settings
from ..database import SessionLocal

class SettingsService:
    @staticmethod
    def initialize_settings() -> bool:
        """
        launcherのappsettings.jsonをmainsettings.jsonとして初期化する
        
        :return: 初期化成功フラグ
        """
        try:
            # プロジェクトのルートディレクトリパスを取得
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            
            launcher_settings_path = os.path.join(root_dir, "appsettings.json")
            main_settings_path = os.path.join(root_dir, "mainsettings.json")
            
            # appsettings.jsonが存在するか確認
            if not os.path.exists(launcher_settings_path):
                print(f"Error: appsettings.json not found at {launcher_settings_path}")
                return False
            
            # 既存のmainsettings.jsonがある場合、上書きする前に内容を確認
            if os.path.exists(main_settings_path):
                # ファイルの内容を読み込んで比較
                with open(launcher_settings_path, 'r', encoding='utf-8') as launcher_file:
                    launcher_settings = json.load(launcher_file)
                
                with open(main_settings_path, 'r', encoding='utf-8') as main_file:
                    main_settings = json.load(main_file)
                
                # 内容が同じ場合は何もしない
                if launcher_settings == main_settings:
                    print("Settings files are identical, no update needed")
                    return True
            
            # ファイルをコピー
            shutil.copy2(launcher_settings_path, main_settings_path)
            print(f"Successfully copied {launcher_settings_path} to {main_settings_path}")
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
            main_settings_path = os.path.join(root_dir, "mainsettings.json")
            
            if not os.path.exists(main_settings_path):
                # mainsettings.jsonがない場合、初期化を試みる
                success = SettingsService.initialize_settings()
                if not success:
                    return {}
            
            with open(main_settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            
            return settings
            
        except Exception as e:
            print(f"Error getting settings: {str(e)}")
            return {}
    
    @staticmethod
    def update_settings(settings: Dict[str, Any]) -> bool:
        """
        設定情報を更新する
        
        :param settings: 更新する設定情報
        :return: 更新成功フラグ
        """
        try:
            root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
            main_settings_path = os.path.join(root_dir, "mainsettings.json")
            
            with open(main_settings_path, 'w', encoding='utf-8') as f:
                json.dump(settings, f, indent=2, ensure_ascii=False)
            
            return True
            
        except Exception as e:
            print(f"Error updating settings: {str(e)}")
            return False