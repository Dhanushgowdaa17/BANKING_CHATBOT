from flask import Flask
from flask_cors import CORS
from config import Config
from database import init_db
from routes.auth import auth_bp
from routes.chat import chat_bp
from routes.user import user_bp
from routes.admin import admin_bp
import logging, os

logging.basicConfig(level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler()])

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    init_db()
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(chat_bp, url_prefix="/api/chat")
    app.register_blueprint(user_bp, url_prefix="/api/user")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)