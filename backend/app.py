import os

from pathin_api import create_app

os.environ.setdefault("PATHIN_MAP_DB", "/tmp/pathin_maps.sqlite3")

app = create_app()
