import json
import os
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal, get_db
import models
from routers import albums, composites, images, settings, templates

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

# FastAPIアプリケーションの初期化
app = FastAPI(
    title="VSA Backend API",
    description="VRC Snap Archive Backend API",
    version="1.0.0"
)

# CORS設定（開発環境ではすべてのオリジンを許可）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限する
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 起動時にデータベースを初期化
@app.on_event("startup")
async def startup_event():
    init_db()
    # デフォルト設定の初期化
    db = SessionLocal()
    try:
        init_default_settings(db)
    finally:
        db.close()

# ヘルスチェックエンドポイント
@app.get("/")
def read_root():
    return {"status": "ok", "message": "VSA Backend API is running"}

# 各ルーターの登録
app.include_router(images.router)
app.include_router(albums.router)
app.include_router(composites.router)
app.include_router(settings.router)
app.include_router(templates.router)

# アプリケーション実行
if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)