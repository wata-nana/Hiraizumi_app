# アプリ本体のファイルです。
import os
from flask import Flask
from flask_migrate import Migrate
from config import Config, INSTANCE_DIR
from SQLAlchemy_models import db
from google_aouth import auth_bp, oauth
from routes import routes_bp


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

    # OAuthの初期化
    oauth.init_app(app)

    # Blueprintの登録
    app.register_blueprint(auth_bp)
    app.register_blueprint(routes_bp)

    return app


if __name__ == "__main__":
    app = create_app()
    app.run(debug=True)
