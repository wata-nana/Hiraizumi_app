# SQLAchemyを用いたデータベースモデル用ファイルです。

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import UniqueConstraint
from datetime import datetime, timezone

db = SQLAlchemy()


# ユーザーモデル
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sub = db.Column(db.String(255), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(120), nullable=False)
    picture = db.Column(db.String(250))

    # googleアカウントのOAuth認証を入れるときに編集しやすいようsubで管理
    # マイグレーション壊れないようユニーク制約に名前をつける
    __table_args__ = (UniqueConstraint("sub", name="uq_user_sub"),)


class Pin(db.Model):
    __tablename__ = "pins"

    id = db.Column(db.Integer, primary_key=True)
    lat = db.Column(db.Float, nullable=False)
    lng = db.Column(db.Float, nullable=False)
    title = db.Column(db.String(30), nullable=False)  # タイトル
    category = db.Column(db.Integer, nullable=False)  # ピンの分類
    description = db.Column(db.Text, nullable=False)  # 場所の説明
    caution = db.Column(db.Text, nullable=True)  # 注意事項
    image_url = db.Column(db.String(300), nullable=True)  # 写真
    created_at = db.Column(db.DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))  # 追加時間
    expires_at = db.Column(db.DateTime(timezone=True), nullable=True)  # 表示期限

    # 投稿したユーザー
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)

    # 将来拡張用
    # comments = db.relationship("Comment", backref="pin", lazy=True)
