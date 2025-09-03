# SQLAchemyを用いたデータベースモデル用ファイルです。

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint

db = SQLAlchemy()


# ユーザーモデル
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sub = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    picture = db.Column(db.String(250))

# googleアカウントのOAuth認証を入れるときに編集しやすいようsubで管理
# マイグレーション壊れないようユニーク制約に名前をつける
    __table_args__ = (
        UniqueConstraint("sub", name="uq_user_sub"),
    )
