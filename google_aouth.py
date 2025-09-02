# googleのAOuth2.0認証処理用ファイルです。

from flask import Blueprint, redirect, url_for, session
from authlib.integrations.flask_client import OAuth
from SQLAlchemy_models import db, User
import os

auth_bp = Blueprint("auth", __name__)

oauth = OAuth()
google = oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)


@auth_bp.route("/login/google")
def login():
    redirect_uri = url_for("auth.callback", _external=True)
    return google.authorize_redirect(redirect_uri)


@auth_bp.route("/auth/callback")
def callback():
    token = google.authorize_access_token()
    claims = google.parse_id_token(token)

    # DBにユーザー登録
    user = User.query.filter_by(email=claims["email"]).first()
    if not user:
        user = User(email=claims["email"], name=claims["name"], picture=claims.get("picture"))
        db.session.add(user)
        db.session.commit()

    # セッションに保存
    session["user"] = {
        "id": claims["sub"],
        "email": claims["email"],
        "name": claims["name"],
        "picture": claims.get("picture"),
    }
    return redirect(url_for("routes.map_page"))


@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("routes.welcome"))
