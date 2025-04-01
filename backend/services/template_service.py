from typing import Dict, Any, List, Optional
from ..models.settings import Settings
from ..database import SessionLocal

class TemplateService:
    @staticmethod
    def get_templates() -> List[Dict[str, Any]]:
        """
        テンプレート一覧を取得する
        
        :return: テンプレートのリスト
        """
        with SessionLocal() as db:
            settings = db.query(Settings).filter(Settings.key == "tweet_templates").first()
            if not settings or not settings.value:
                return []
            
            return settings.value
    
    @staticmethod
    def create_template(name: str, template: str) -> Dict[str, Any]:
        """
        新しいテンプレートを作成する
        
        :param name: テンプレート名
        :param template: テンプレート内容
        :return: 作成されたテンプレート
        """
        with SessionLocal() as db:
            settings = db.query(Settings).filter(Settings.key == "tweet_templates").first()
            
            if not settings:
                templates = []
                settings = Settings(key="tweet_templates", value=templates)
                db.add(settings)
            else:
                templates = settings.value or []
            
            # 新しいIDを生成
            new_id = 1
            if templates:
                existing_ids = [t.get("id", 0) for t in templates]
                new_id = max(existing_ids) + 1
            
            # 新しいテンプレートを追加
            new_template = {
                "id": new_id,
                "name": name,
                "template": template
            }
            
            templates.append(new_template)
            settings.value = templates
            db.commit()
            
            return new_template
    
    @staticmethod
    def update_template(template_id: int, name: str, template: str) -> bool:
        """
        既存のテンプレートを更新する
        
        :param template_id: テンプレートID
        :param name: 新しいテンプレート名
        :param template: 新しいテンプレート内容
        :return: 更新成功フラグ
        """
        with SessionLocal() as db:
            settings = db.query(Settings).filter(Settings.key == "tweet_templates").first()
            
            if not settings or not settings.value:
                return False
            
            templates = settings.value
            updated = False
            
            for i, tmpl in enumerate(templates):
                if tmpl.get("id") == template_id:
                    templates[i] = {
                        "id": template_id,
                        "name": name,
                        "template": template
                    }
                    updated = True
                    break
            
            if updated:
                settings.value = templates
                db.commit()
                
            return updated
    
    @staticmethod
    def delete_template(template_id: int) -> bool:
        """
        テンプレートを削除する
        
        :param template_id: テンプレートID
        :return: 削除成功フラグ
        """
        with SessionLocal() as db:
            settings = db.query(Settings).filter(Settings.key == "tweet_templates").first()
            
            if not settings or not settings.value:
                return False
            
            templates = settings.value
            original_length = len(templates)
            
            # IDに一致するテンプレートを除外
            templates = [t for t in templates if t.get("id") != template_id]
            
            if len(templates) < original_length:
                settings.value = templates
                db.commit()
                
                # デフォルトテンプレートが削除されたテンプレートだった場合、デフォルトを更新
                default_setting = db.query(Settings).filter(Settings.key == "default_tweet_template").first()
                if default_setting and default_setting.value == template_id:
                    if templates:
                        default_setting.value = templates[0]["id"]
                    else:
                        default_setting.value = None
                    db.commit()
                
                return True
            
            return False
            
    @staticmethod
    def generate_text(image_ids: List[int], template_id: int) -> Dict[str, Any]:
        """
        選択した画像IDとテンプレートIDから定型文を生成
        
        :param image_ids: 画像ID配列
        :param template_id: テンプレートID
        :return: 生成された定型文と置換された変数情報
        """
        # 既存のgenerate_text実装をここに移植
        # 実装が提供されていないため仮の実装
        return {
            "text": "Generated text would appear here",
            "variables": {}
        }