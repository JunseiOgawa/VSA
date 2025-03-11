from routes.images import images_bp
from routes.settings import settings_bp
from routes.sync import sync_bp

def register_routes(app):
    """アプリケーションにすべてのルートを登録"""
    app.register_blueprint(images_bp, url_prefix='/api/images')
    app.register_blueprint(settings_bp, url_prefix='/api/settings')
    app.register_blueprint(sync_bp, url_prefix='/api/sync')