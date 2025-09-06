# ページのルーティング設定ファイルです。

from flask import Blueprint, render_template, request, jsonify, url_for, current_app
from flask_login import login_required, current_user
from SQLAlchemy_models import db, Pin, Route, RoutePin
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


@api_bp.route("/routes", methods=["POST"])
@login_required
def add_route():
    try:
        # formdata
        name = request.form.get("name", "").strip()
        description = request.form.get("description", "").strip()
        route_pins = request.form.get("route_pins")  # JSON文字列: [{"pin_id":1,"order":0}, ...]
        image_file = request.files.get("image")

        # 必須チェック
        if not name or not description or not route_pins or not image_file:
            return jsonify({"error": "すべての項目が必須です"}), 400

        # 画像保存
        filename = secure_filename(f"{datetime.now(timezone.utc).timestamp()}_{image_file.filename}")
        save_path = os.path.join("static/uploads", filename)
        os.makedirs(os.path.dirname(save_path), exist_ok=True)
        image_file.save(save_path)
        image_url = url_for("static", filename=f"uploads/{filename}", _external=True)

        # Route 作成
        new_route = Route(name=name, description=description, image_url=image_url, user_id=current_user.id)
        db.session.add(new_route)
        db.session.flush()  # ID取得用にコミット前にflush

        import json

        pins_list = json.loads(route_pins)
        for rp in pins_list:
            route_pin = RoutePin(route_id=new_route.id, pin_id=rp["pin_id"], order=rp["order"])
            db.session.add(route_pin)

        db.session.commit()
        return jsonify({"success": True, "route_id": new_route.id})

    except Exception:
        current_app.logger.exception("旅路登録エラー")
        return jsonify({"error": "旅路の登録に失敗しました"}), 500


# 全旅路の名前と写真のみ取得
@routes_bp.route("/api/routes", methods=["GET"])
def get_routes():
    routes = Route.query.order_by(Route.name.asc()).all()  # nameの昇順
    routes_list = []
    for route in routes:
        routes_list.append({"id": route.id, "name": route.name, "image_url": route.image_url})
    return jsonify(routes_list)


# 特定旅路のピン一覧取得（RoutePin）
@routes_bp.route("/api/routes/<int:route_id>/pins", methods=["GET"])
def get_route_pins(route_id):
    route = Route.query.get_or_404(route_id)
    # order順にソートして返す
    route_pins = RoutePin.query.filter_by(route_id=route.id).order_by(RoutePin.order.asc()).all()
    pins_list = []
    for rp in route_pins:
        pins_list.append(
            {
                "id": rp.pin.id,
                "title": rp.pin.title,
                "description": rp.pin.description,
                "lat": rp.pin.lat,
                "lng": rp.pin.lng,
                "image_url": rp.pin.image_url,
                "order": rp.order,
            }
        )
    return jsonify(pins_list)
