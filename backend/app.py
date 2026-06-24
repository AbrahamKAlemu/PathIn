import os

from pathin_api import create_app

os.environ.setdefault("PATHIN_MAP_DB", "/tmp/pathin_maps.sqlite3")
os.environ.setdefault("PATHIN_PROFILE_DB", "/tmp/pathin_profiles.sqlite3")

app = create_app()
