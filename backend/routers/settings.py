from fastapi import APIRouter, HTTPException
from typing import Dict, Any

from services.settings_service import SettingsService

router = APIRouter(
    prefix="/api/settings",
    tags=["settings"],
    responses={404: {"description": "Not found"}},
)

@router.get("", response_model=Dict[str, Any])
def get_settings():
    """アプリケーションの設定を取得"""
    return SettingsService.get_settings()

@router.put("", response_model=Dict[str, Any])
def update_settings(settings: Dict[str, Any]):
    """設定を更新"""
    success = SettingsService.update_settings(settings)
    if not success:
        raise HTTPException(status_code=500, detail="設定の更新に失敗しました")
    
    return {"success": True}