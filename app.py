# アプリ本体のファイルです。

import os
from flask import Flask
from flask_migrate import Migrate
from flask_session import Session
from flask_login import LoginManager
from config import Config, INSTANCE_DIR
from SQLAlchemy_models import db, User
from extensions import oauth
from google_oauth import auth_bp
from routes import routes_bp, api_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # instance ディレクトリがなければ必ず作成
    os.makedirs(INSTANCE_DIR, exist_ok=True)

    # DBの初期化
    db.init_app(app)
    # CLIからテーブル管理
    Migrate(app, db)
    """
    新しいカラムを追加したい場合
    flask db migrate -m "add カラム名 to user"
    flask db upgrade
    """

    # OAuthとFlask接続
    oauth.init_app(app)

    # googleクライアント情報登録
    oauth.register(
        name="google",
        client_id=app.config["GOOGLE_CLIENT_ID"],
        client_secret=app.config["GOOGLE_CLIENT_SECRET"],
        server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
        client_kwargs={"scope": "openid email profile"},
    )

    # Flask-Sessionの初期化
    os.makedirs(app.config["SESSION_FILE_DIR"], exist_ok=True)
    Session(app)

    # Flask-Login 初期化
    login_manager = LoginManager(app)
    login_manager.login_view = "routes.welcome"

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    # Blueprintの登録
    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp)
    app.register_blueprint(api_bp, url_prefix="/api")

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
