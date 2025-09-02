# ページのルーティング設定ファイルです。

from flask import Blueprint, render_template, redirect, url_for, session

routes_bp = Blueprint("routes", __name__)


@routes_bp.route("/")
def welcome():
    return render_template("welcome.html")


@routes_bp.route("/map")
def map_page():
    if "user" not in session:
        return redirect(url_for("routes.welcome"))
    return render_template("map.html", user=session["user"])
