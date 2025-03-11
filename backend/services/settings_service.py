from flask import current_app
from models import Session
from models.settings import Settings

def get_db_session():
    """データベースセッションを取得"""
    return current_app.config['DB_SESSION']

def get_all_settings():
    """すべての設定を取得"""
    session = get_db_session()
    settings = session.query(Settings).all()
    
    # 辞書に変換
    result = {}
    for setting in settings:
        result[setting.key] = setting.get_value()
    return result

def get_setting_by_key(key):
    """キーを指定して設定を取得"""
    session = get_db_session()
    setting = session.query(Settings).filter(Settings.key == key).first()
    if setting:
        return {setting.key: setting.get_value()}
    return None

def update_setting(key, value):
    """設定を更新または作成"""
    session = get_db_session()
    setting = session.query(Settings).filter(Settings.key == key).first()
    
    if not setting:
        # 設定が存在しない場合は新規作成
        setting = Settings(key=key)
        session.add(setting)
    
    # 値をセット
    setting.set_value(value)
    session.commit()
    
    return True