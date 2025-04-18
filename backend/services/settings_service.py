import json
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from database import SessionLocal
from models.settings import Settings

class SettingsService:
    @staticmethod
    def get_settings() -> Dict[str, Any]:
        """
        アプリケーション設定を取得
        """
        db = SessionLocal()
        
        try:
            settings = {}
            db_settings = db.query(Settings).all()
            
            for setting in db_settings:
                settings[setting.key] = setting.value
            
            return settings
        
        finally:
            db.close()
    
    @staticmethod
    def update_settings(settings_data: Dict[str, Any]) -> bool:
        """
        設定を更新
        """
        db = SessionLocal()
        
        try:
            for key, value in settings_data.items():
                # 既存の設定を検索
                setting = db.query(Settings).filter(Settings.key == key).first()
                
                if setting:
                    # 既存の設定を更新
                    setting.value = value
                else:
                    # 新しい設定を作成
                    new_setting = Settings(key=key, value=value)
                    db.add(new_setting)
            
            db.commit()
            return True
        
        except Exception as e:
            db.rollback()
            print(f"Error updating settings: {e}")
            return False
        
        finally:
            db.close()
    
    @staticmethod
    def get_setting(key: str) -> Optional[Any]:
        """
        特定の設定値を取得
        """
        db = SessionLocal()
        
        try:
            setting = db.query(Settings).filter(Settings.key == key).first()
            return setting.value if setting else None
        
        finally:
            db.close()