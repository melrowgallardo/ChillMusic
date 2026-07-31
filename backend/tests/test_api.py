import sys
import os
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app
from app.database.session import Base, engine

client = TestClient(app)

def setup_module(module):
    Base.metadata.create_all(bind=engine)

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "ChillMusic API"
    assert data["status"] == "online"

def test_register_and_login():
    test_user = {
        "username": "testuser_unique_123",
        "email": "testuser123@example.com",
        "password": "secretpassword123"
    }

    # Register
    res_reg = client.post("/api/auth/register", json=test_user)
    assert res_reg.status_code in [201, 400]

    # Login
    res_login = client.post("/api/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    assert res_login.status_code == 200
    tokens = res_login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # Profile
    access_token = tokens["access_token"]
    res_prof = client.get("/api/user/profile", headers={"Authorization": f"Bearer {access_token}"})
    assert res_prof.status_code == 200
    prof = res_prof.json()
    assert prof["email"] == test_user["email"]

def test_trending_songs_endpoint():
    response = client.get("/api/songs/trending?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        first_song = data[0]
        assert "id" in first_song
        assert "title" in first_song
        assert "audio_url" in first_song
