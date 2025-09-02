# SQLAchemyを用いたデータベースモデル用ファイルです。

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


# ユーザーモデル
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    picture = db.Column(db.String(250))
