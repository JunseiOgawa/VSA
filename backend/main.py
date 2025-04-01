import json
import sys
from sqlalchemy.orm import Session
import traceback
from contextlib import contextmanager

from database import engine, Base, SessionLocal
import models

# データベースの初期化
def init_db():
    Base.metadata.create_all(bind=engine)

# デフォルト設定の初期化
def init_default_settings(db: Session):
    # デフォルトのツイートテンプレートが存在しない場合は作成
    tweet_templates = db.query(models.Settings).filter(models.Settings.key == "tweet_templates").first()
    
    if not tweet_templates:
        default_templates = [
            {"id": 1, "name": "シンプル", "template": "「$world_name$」で撮影した写真です！ #VRChat #VRC写真"},
            {"id": 2, "name": "フレンド", "template": "$world_name$にて。$friends$と一緒に！ #VRChat"},
            {"id": 3, "name": "枚数", "template": "今日は$count$枚の写真を撮りました！$world_name$にて。 #VRChat"}
        ]
        
        new_setting = models.Settings(key="tweet_templates", value=default_templates)
        db.add(new_setting)
        
        default_template = models.Settings(key="default_tweet_template", value=1)
        db.add(default_template)
        
        db.commit()

# アプリケーション起動時の初期化
def startup():
    init_db()
    with SessionLocal() as db:
        init_default_settings(db)
    print(json.dumps({"status": "initialized"}), flush=True)

# メインアプリ初期化時に設定を初期化
# アプリケーション起動時に呼び出す
def initialize_app():
    return SettingsService.initialize_settings()

# コマンドハンドラーの辞書
command_handlers = {}

# 標準入力から受け取ったJSONコマンドを処理
def process_command(command_json):
    try:
        # JSONデータをパース
        data = json.loads(command_json)
        command = data.get("command")
        params = data.get("params", {})
        request_id = data.get("id", "unknown")
        
        # コマンドハンドラーが存在するか確認
        if command in command_handlers:
            result = command_handlers[command](**params)
            # 結果を返す
            return json.dumps({
                "result": result,
                "error": None,
                "id": request_id
            })
        else:
            # コマンドが見つからない場合はエラー
            return json.dumps({
                "result": None,
                "error": {
                    "code": 404,
                    "message": f"Command not found: {command}"
                },
                "id": request_id
            })
    except Exception as e:
        # 例外発生時はエラーメッセージを返す
        traceback.print_exc()
        return json.dumps({
            "result": None,
            "error": {
                "code": 500,
                "message": str(e)
            },
            "id": request_id
        })

# メインループ
def main():
    # 初期化
    startup()
    
    # 標準入力からコマンドを読み取って処理
    for line in sys.stdin:
        if not line.strip():
            continue
        
        response = process_command(line)
        # 標準出力に応答を書き込む
        print(response, flush=True)

# サービスのインポート
from services.image_service import ImageService
from services.settings_service import SettingsService
from services.template_service import TemplateService

# コマンドハンドラー　JSONに返す
command_handlers["initialize_app"] = initialize_app
command_handlers["get_settings"] = SettingsService.get_settings
command_handlers["update_settings"] = SettingsService.update_settings
command_handlers["get_images"] = ImageService.get_images
command_handlers["get_image_metadata"] = ImageService.get_image_metadata
command_handlers["get_templates"] = TemplateService.get_templates  # SettingsServiceからTemplateServiceに変更
command_handlers["create_template"] = TemplateService.create_template  # SettingsServiceからTemplateServiceに変更
command_handlers["update_template"] = TemplateService.update_template  # SettingsServiceからTemplateServiceに変更
command_handlers["delete_template"] = TemplateService.delete_template  # SettingsServiceからTemplateServiceに変更
command_handlers["generate_text"] = TemplateService.generate_text

if __name__ == "__main__":
    main()