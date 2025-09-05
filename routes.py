# ページのルーティング設定ファイルです。

from flask import Blueprint, render_template, request, jsonify, url_for, current_app
from flask_login import login_required, current_user
from SQLAlchemy_models import db, Pin
from datetime import datetime, timezone
from werkzeug.utils import secure_filename
import os


routes_bp = Blueprint("routes", __name__)
api_bp = Blueprint("api", __name__)


@routes_bp.route("/")
def welcome():
    return render_template("welcome.html")


@routes_bp.route("/map")
@login_required
def map_page():
    return render_template("map.html", user=current_user)


@api_bp.route("/pins", methods=["GET"])
def get_pins():
    try:
        pins = Pin.query.filter(Pin.lat.between(MIN_LAT, MAX_LAT), Pin.lng.between(MIN_LNG, MAX_LNG)).all()

        result = [
            [
                {
                    "id": p.id,
                    "lat": p.lat,
                    "lng": p.lng,
                    "title": p.title,
                    "category": p.category,
                    "description": p.description,
                    "caution": p.caution,
                    "image_url": p.image_url,
                    "created_at": p.created_at.isoformat(),
                    "expires_at": p.expires_at.isoformat() if p.expires_at else None,
                    "user_id": p.user_id,
                }
                for p in pins
            ]
        ]

        current_app.logger.info(f"{len(result)} 件のピンを取得しました")
        return jsonify(result)

    except Exception:
        current_app.logger.exception("ピン取得中にエラーが発生しました")
        return jsonify({"error": "ピン取得に失敗しました"}), 500


# 一関・平泉の地域範囲設定
MIN_LAT, MAX_LAT = 38.75, 39.05
MIN_LNG, MAX_LNG = 140.95, 141.30

# 画像ファイルの設定
UPLOAD_FOLDER = "static/uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@api_bp.route("/pins", methods=["POST"])
@login_required
def add_pin():
    try:
        # データ受け取り：formdata
        lat = float(request.form.get("lat", 0))
        lng = float(request.form.get("lng", 0))
        title = request.form.get("title", "").strip()
        category = int(request.form.get("category", 0))
        description = request.form.get("description", "").strip()
        caution = request.form.get("caution", "").strip() or None

        # 経度・緯度の確認
        if not (MIN_LAT <= lat <= MAX_LAT and MIN_LNG <= lng <= MAX_LNG):
            return jsonify({"error": "ピンは一関市・平泉町の範囲内に追加してください"}), 400

        # 表示期限を文字列からdatatimeへ変換
        expires_at = None
        expires_at_str = request.form.get("expires_at")
        if expires_at_str:
            try:
                # HTML input type="datetime-local" は "YYYY-MM-DDTHH:MM" 形式
                expires_at = datetime.strptime(expires_at_str, "%Y-%m-%dT%H:%M")
            except ValueError:
                pass

        # 必須項目チェック
        if not title or not (1 <= len(title) <= 30):
            return jsonify({"error": "タイトルは1〜30文字で入力してください"}), 400
        if not category or not (1 <= category <= 12):
            return jsonify({"error": "分類を選択してください"}), 400
        if not description:
            return jsonify({"error": "説明は必須です"}), 400

        # 画像処理
        image_url = None
        image_file = request.files.get("image")
        if image_file and allowed_file(image_file.filename):
            filename = secure_filename(f"{datetime.now(timezone.utc).timestamp()}_{image_file.filename}")
            save_path = os.path.join(UPLOAD_FOLDER, filename)
            image_file.save(save_path)
            image_url = url_for("static", filename=f"uploads/{filename}", _external=True)

        # DB登録
        new_pin = Pin(
            lat=lat,
            lng=lng,
            title=title,
            category=category,
            description=description,
            caution=caution,
            image_url=image_url,
            expires_at=expires_at,
            user_id=current_user.id,
        )
        db.session.add(new_pin)
        db.session.commit()
        current_app.logger.info(f"新しいピンを追加しました: id={new_pin.id}, user_id={current_user.id}")
        return jsonify({"success": True, "id": new_pin.id})

    except Exception:
        current_app.logger.exception("ピン追加中に予期せぬエラーが発生しました")
        return jsonify({"error": "ピン追加に失敗しました"}), 500
