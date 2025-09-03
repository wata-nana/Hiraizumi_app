# OAuthのルーティングとコールバック処理用ファイルです。

from authlib.integrations.base_client.errors import OAuthError
from extensions import oauth
from flask import Blueprint, flash, redirect, url_for, session, current_app
from SQLAlchemy_models import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login/google")
def login():
    # ログイン済みユーザー処理
    if "user" in session:
        return redirect(url_for("routes.map_page"))

    redirect_uri = url_for("auth.callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route("/auth/callback")
def callback():
    try:
        token = oauth.google.authorize_access_token()
        user_info = token.get("userinfo")

        if not user_info:
            flash("ユーザー情報を取得できませんでした。\nGoogleアカウントを確認してください。", "error")
            return redirect(url_for("routes.welcome"))

        # DBにユーザー登録
        user = User.query.filter_by(sub=user_info["sub"]).first()
        if not user:
            user = User(
                sub=user_info["sub"],
                email=user_info["email"],
                name=user_info.get("name"),
                picture=user_info.get("picture"),
            )
            db.session.add(user)
            db.session.commit()

        # セッションに保存
        session["user"] = {
            "id": user.sub,
            "email": user.email,
            "name": user.name,
            "picture": user.picture,
        }

        return redirect(url_for("routes.map_page"))

    except OAuthError as error:
        current_app.logger.error("OAuth error: ", error)
        flash("Google認証に失敗しました。\n再度ログインしてください。", "error")
        return redirect(url_for("routes.welcome"))

    except Exception as error:
        current_app.logger.error("Unexpected error in Google callback:", error)
        flash("システムエラーが発生しました。\n再度ログインしてください。", "error")
        return redirect(url_for("routes.welcome"))


@auth_bp.route("/logout")
def logout():
    session.pop("user", None)
    return redirect(url_for("routes.welcome"))
