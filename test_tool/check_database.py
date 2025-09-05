from SQLAlchemy_models import db
from app import create_app
from sqlalchemy import inspect

app = create_app()
with app.app_context():
    inspector = inspect(db.engine)
    columns = inspector.get_columns("user")
    for col in columns:
        print(col["name"], col["type"])
