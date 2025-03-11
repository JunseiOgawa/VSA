import os
import json
import datetime
from flask import current_app
from models.settings import Settings

def get_db_session():
    """データベースセッションを取得"""
    return current_app.config['DB_SESSION']

def sync_settings_from_json(json_path=None):
    """
    appsettings.jsonからDBに設定を同期する関数
    
    Args:
        json_path: appsettings.jsonのパス（指定がなければデフォルトを使用）
    
    Returns:
        dict: 同期結果情報
    """
    # デフォルトのJSONパスを使用
    if not json_path:
        # プロジェクトルートディレクトリの取得（通常はVSA-launcherと同階層）
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        # launcherディレクトリまで遡る
        parent_dir = os.path.dirname(base_dir)
        json_path = os.path.join(parent_dir, 'appsettings.json')
    
    if not os.path.exists(json_path):
        return {
            'success': False,
            'error': f'Settings file not found: {json_path}',
            'timestamp': datetime.datetime.now().isoformat()
        }
    
    try:
        # JSONファイル読み込み (UTF-8エンコーディングを指定)
        with open(json_path, 'r', encoding='utf-8') as f:
            app_settings = json.load(f)
        
        # データベース接続
        session = get_db_session()
        
        # 設定をデータベースに反映
        settings_updated = 0
        
        # 平坦化して反映
        flattened_settings = flatten_dict(app_settings)
        for key, value in flattened_settings.items():
            # キーが存在するか確認
            setting = session.query(Settings).filter(Settings.key == key).first()
            
            if setting:
                # 値が異なる場合のみ更新
                current_value = setting.get_value()
                if current_value != value:
                    setting.set_value(value)
                    settings_updated += 1
            else:
                # 新規作成
                new_setting = Settings(key=key)
                new_setting.set_value(value)
                session.add(new_setting)
                settings_updated += 1
        
        # 変更をコミット
        session.commit()
        
        return {
            'success': True,
            'settings_updated': settings_updated,
            'file_path': json_path,
            'timestamp': datetime.datetime.now().isoformat()
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'file_path': json_path,
            'timestamp': datetime.datetime.now().isoformat()
        }

def flatten_dict(d, parent_key='', sep='.'):
    """
    多層構造の辞書を平坦化する
    例: {"FolderStructure": {"Enabled": true}} -> {"FolderStructure.Enabled": true}
    VSA-launcherの設定構造に合わせる
    
    Args:
        d: 元の辞書
        parent_key: 親キー
        sep: キー区切り文字
    
    Returns:
        dict: 平坦化された辞書
    """
    items = []
    for k, v in d.items():
        new_key = f"{parent_key}{sep}{k}" if parent_key else k
        if isinstance(v, dict):
            items.extend(flatten_dict(v, new_key, sep=sep).items())
        else:
            items.append((new_key, v))
    return dict(items)

def get_sync_status():
    """
    最新の同期状態を取得
    
    Returns:
        dict: 同期状態
    """
    session = get_db_session()
    last_sync = session.query(Settings).filter(Settings.key == 'system.lastSync').first()
    
    if last_sync:
        return {
            'last_synced': last_sync.get_value(),
            'has_synced': True
        }
    else:
        return {
            'has_synced': False
        }

def update_sync_status(sync_result):
    """
    同期状態を更新
    
    Args:
        sync_result: 同期結果
    """
    session = get_db_session()
    last_sync = session.query(Settings).filter(Settings.key == 'system.lastSync').first()
    
    if not last_sync:
        last_sync = Settings(key='system.lastSync')
        session.add(last_sync)
    
    last_sync.set_value(sync_result)
    session.commit()