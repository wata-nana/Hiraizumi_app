# 環境変数ベースの設定ファイルです。

import os
from dotenv import load_dotenv
from datetime import timedelta

# envからの情報読み込み
load_dotenv()

# プロジェクトの絶対パス
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# instance ディレクトリと DB ファイルの絶対パス
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
DB_PATH = os.path.join(INSTANCE_DIR, "hosomichi.db")


class Config:
    # sqliteのデータベース紐づけ
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY")
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # １週間はセッションを保持
    SESSION_PERMANENT = True
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)

    # ローカル用セッション保存設定。本番環境ではRadis使うべき。
    SESSION_TYPE = "filesystem"
    SESSION_FILE_DIR = os.path.join(INSTANCE_DIR, "flask_session")
    SESSION_USE_SIGNER = True

    # cookieに関するセキュリティ設定
    SESSION_COOKIE_HTTPONLY = True

    if os.getenv("FLASK_ENV") == "production":
        SESSION_COOKIE_SECURE = True  # 本番環境用
        SESSION_COOKIE_SAMESITE = "None"
        SESSION_COOKIE_PARTITIONED = True
    else:
        SESSION_COOKIE_NAME = "mycookie"  # 練習環境用・ドメイン直指定
        SESSION_COOKIE_SECURE = False
        SESSION_COOKIE_SAMESITE = "Lax"

    # Google OAuth 設定
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
