import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app

client = TestClient(app)

def test_deezer_album_details():
    response = client.get("/api/deezer/album/302127")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert data["name"] == "Discovery"
    assert "tracks" in data
    assert len(data["tracks"]) > 0

def test_deezer_search_tracks():
    response = client.get("/api/deezer/search/track?q=Bruno%20Mars&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert data[0]["source"] == "deezer"

def test_deezer_chart():
    response = client.get("/api/deezer/chart?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "tracks" in data
    assert "albums" in data
