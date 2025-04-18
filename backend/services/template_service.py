from typing import List, Dict, Any, Optional
import json
from database import SessionLocal
from models.settings import Settings
from services.settings_service import SettingsService
from services.image_service import ImageService

class TemplateService:
    @staticmethod
    def get_templates() -> List[Dict[str, Any]]:
        """
        ツイートテンプレート一覧を取得
        """
        templates = SettingsService.get_setting("tweet_templates")
        
        if not templates:
            # デフォルトのテンプレートを返す
            default_templates = [
                {"id": 1, "name": "シンプル", "template": "「$world_name$」で撮影した写真です！ #VRChat #VRC写真"},
                {"id": 2, "name": "フレンド", "template": "$world_name$にて。$friends$と一緒に！ #VRChat"},
                {"id": 3, "name": "枚数", "template": "今日は$count$枚の写真を撮りました！$world_name$にて。 #VRChat"}
            ]
            
            # データベースに保存
            SettingsService.update_settings({"tweet_templates": default_templates})
            
            return default_templates
        
        return templates
    
    @staticmethod
    def create_template(name: str, template: str) -> Dict[str, Any]:
        """
        新しいテンプレートを作成
        """
        templates = TemplateService.get_templates()
        
        # 新しいIDを生成
        max_id = 0
        if templates:
            max_id = max(template["id"] for template in templates)
        
        new_template = {
            "id": max_id + 1,
            "name": name,
            "template": template
        }
        
        templates.append(new_template)
        
        # データベースに保存
        SettingsService.update_settings({"tweet_templates": templates})
        
        return new_template
    
    @staticmethod
    def update_template(template_id: int, name: str, template: str) -> bool:
        """
        テンプレートを更新
        """
        templates = TemplateService.get_templates()
        
        for i, t in enumerate(templates):
            if t["id"] == template_id:
                templates[i]["name"] = name
                templates[i]["template"] = template
                
                # データベースに保存
                SettingsService.update_settings({"tweet_templates": templates})
                
                return True
        
        return False
    
    @staticmethod
    def delete_template(template_id: int) -> bool:
        """
        テンプレートを削除
        """
        templates = TemplateService.get_templates()
        
        for i, t in enumerate(templates):
            if t["id"] == template_id:
                templates.pop(i)
                
                # データベースに保存
                SettingsService.update_settings({"tweet_templates": templates})
                
                return True
        
        return False
    
    @staticmethod
    def generate_text(image_ids: List[int], template_id: int) -> Dict[str, Any]:
        """
        テンプレートと画像IDを元に定型文を生成
        """
        # テンプレートを取得
        templates = TemplateService.get_templates()
        template = None
        
        for t in templates:
            if t["id"] == template_id:
                template = t
                break
        
        if not template:
            return {"text": "", "replacements": {}, "error": "Template not found"}
        
        # 画像メタデータを取得
        images = []
        world_names = set()
        friends = set()
        
        for image_id in image_ids:
            try:
                image = ImageService.get_image_metadata(image_id)
                images.append(image)
                
                if image["world_name"]:
                    world_names.add(image["world_name"])
                
                if image["metadata"] and "friends" in image["metadata"]:
                    for friend in image["metadata"]["friends"]:
                        friends.add(friend)
            except ValueError:
                pass
        
        if not images:
            return {"text": "", "replacements": {}, "error": "No valid images found"}
        
        # 置換用変数の作成
        replacements = {
            "count": len(images),
            "world_name": ", ".join(world_names) if world_names else "不明なワールド",
            "friends": ", ".join(friends) if friends else "フレンド情報なし"
        }
        
        # テキスト生成
        text = template["template"]
        
        for key, value in replacements.items():
            placeholder = f"${key}$"
            text = text.replace(placeholder, str(value))
        
        return {
            "text": text,
            "replacements": replacements
        }