# 環境変数ベースの設定ファイルです。

import os
from dotenv import load_dotenv

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

    # Google OAuth 設定
    GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
