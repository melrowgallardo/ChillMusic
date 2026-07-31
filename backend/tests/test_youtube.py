import sys
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.config import settings

client = TestClient(app)

def test_youtube_config():
    assert settings.YOUTUBE_API_KEY == "AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA"

def test_youtube_search_endpoint():
    response = client.get("/api/youtube/search?q=chill&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        item = data[0]
        assert "id" in item
        assert "title" in item
        assert "source" in item
        assert item["source"] == "youtube"

def test_youtube_trending_endpoint():
    response = client.get("/api/youtube/trending?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_songs_multisource_endpoint():
    response = client.get("/api/songs/search?q=chill&source=youtube&limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
