from fastapi import APIRouter, HTTPException
from typing import Dict, Any, List

from services.template_service import TemplateService

router = APIRouter(
    prefix="/api",
    tags=["templates"],
    responses={404: {"description": "Not found"}},
)

@router.get("/templates", response_model=List[Dict[str, Any]])
def get_templates():
    """ツイートテンプレート一覧を取得"""
    return TemplateService.get_templates()

@router.post("/templates", response_model=Dict[str, Any])
def create_template(data: Dict[str, Any]):
    """新しいテンプレートを作成"""
    if "name" not in data or not data["name"]:
        raise HTTPException(status_code=400, detail="テンプレート名は必須です")
    
    if "template" not in data or not data["template"]:
        raise HTTPException(status_code=400, detail="テンプレート内容は必須です")
    
    return TemplateService.create_template(data["name"], data["template"])

@router.put("/templates/{template_id}", response_model=Dict[str, Any])
def update_template(template_id: int, data: Dict[str, Any]):
    """テンプレートを更新"""
    if "name" not in data or not data["name"]:
        raise HTTPException(status_code=400, detail="テンプレート名は必須です")
    
    if "template" not in data or not data["template"]:
        raise HTTPException(status_code=400, detail="テンプレート内容は必須です")
    
    success = TemplateService.update_template(template_id, data["name"], data["template"])
    if not success:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    
    return {"success": True}

@router.delete("/templates/{template_id}", response_model=Dict[str, Any])
def delete_template(template_id: int):
    """テンプレートを削除"""
    success = TemplateService.delete_template(template_id)
    if not success:
        raise HTTPException(status_code=404, detail="テンプレートが見つかりません")
    
    return {"success": True}

@router.post("/generate-text", response_model=Dict[str, Any])
def generate_text(data: Dict[str, Any]):
    """テンプレートと画像IDから定型文を生成"""
    if "image_ids" not in data or not isinstance(data["image_ids"], list):
        raise HTTPException(status_code=400, detail="image_ids リストは必須です")
    
    if "template_id" not in data or not isinstance(data["template_id"], int):
        raise HTTPException(status_code=400, detail="template_id は必須です")
    
    result = TemplateService.generate_text(data["image_ids"], data["template_id"])
    
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    
    return result