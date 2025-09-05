# OAuthのルーティングとコールバック処理用ファイルです。

from authlib.integrations.base_client.errors import OAuthError
from extensions import oauth
from flask import Blueprint, flash, redirect, url_for, current_app
from flask_login import login_user, logout_user, current_user
from SQLAlchemy_models import db, User

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login/google")
def login():
    # ログイン済みユーザー処理
    if current_user.is_authenticated:
        return redirect(url_for("routes.map_page"))
    redirect_uri = url_for("auth.callback", _external=True)
    return oauth.google.authorize_redirect(redirect_uri)


@auth_bp.route("/auth/callback")
def callback():
    try:
        token = oauth.google.authorize_access_token()
        resp = oauth.google.get(
            oauth.google.client_kwargs.get(
                "userinfo_endpoint", "https://openidconnect.googleapis.com/v1/userinfo"
            ),
            token=token,
        )
        user_info = resp.json()

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
        else:
            # 既存ユーザー情報を更新
            updated = False

            if user.email != user_info["email"]:
                user.email = user_info["email"]
                updated = True

            if user.name != user_info.get("name"):
                user.name = user_info.get("name")
                updated = True

            if user.picture != user_info.get("picture"):
                user.picture = user_info.get("picture")
                updated = True

            if updated:
                db.session.commit()

        # Flask-Login でログイン状態をセット
        login_user(user)
        return redirect(url_for("routes.map_page"))

    except OAuthError:
        current_app.logger.exception("OAuth error during Google callback")
        flash("Google認証に失敗しました。\n再度ログインしてください。", "error")
        return redirect(url_for("routes.welcome"))

    except Exception:
        current_app.logger.exception("Unexpected error in Google callback")
        flash("システムエラーが発生しました。\n再度ログインしてください。", "error")
        return redirect(url_for("routes.welcome"))


@auth_bp.route("/logout")
def logout():
    logout_user()
    return redirect(url_for("routes.welcome"))
