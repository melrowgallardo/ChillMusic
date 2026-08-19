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
    Base.metadata.drop_all(bind=engine)
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

def test_delete_account_endpoint():
    del_user = {
        "username": "delete_me_user_999",
        "email": "deleteme999@example.com",
        "password": "password999"
    }

    # Register & Login
    res_reg = client.post("/api/auth/register", json=del_user)
    assert res_reg.status_code == 201

    res_login = client.post("/api/auth/login", json={
        "email": del_user["email"],
        "password": del_user["password"]
    })
    assert res_login.status_code == 200
    token = res_login.json()["access_token"]

    # Delete via /api/users/me
    res_del = client.delete("/api/users/me", headers={"Authorization": f"Bearer {token}"})
    assert res_del.status_code == 200
    assert res_del.json() == {"status": "success", "message": "Account successfully deleted"}

    # Verify user can no longer fetch profile
    res_prof = client.get("/api/user/profile", headers={"Authorization": f"Bearer {token}"})
    assert res_prof.status_code == 401

def test_google_auth_endpoint():
    google_payload = {
        "email": "unregistered_google_user@example.com",
        "name": "Unregistered Google User",
        "picture": "https://example.com/avatar.png"
    }

    # 1. Login attempt with unregistered user should return 404
    response_login = client.post("/api/auth/google", json=google_payload)
    assert response_login.status_code == 404
    assert "No account found" in response_login.json()["detail"]

    # 2. Register via google-register should succeed
    response_reg = client.post("/api/auth/google-register", json=google_payload)
    assert response_reg.status_code == 200
    data_reg = response_reg.json()
    assert "access_token" in data_reg
    assert data_reg["user"]["email"] == google_payload["email"]

def test_check_email_endpoint():
    res_no = client.get("/api/auth/check-email?email=non_existent_check_123@example.com")
    assert res_no.status_code == 200
    assert res_no.json()["exists"] is False

    res_yes = client.get("/api/auth/check-email?email=unregistered_google_user@example.com")
    assert res_yes.status_code == 200
    assert res_yes.json()["exists"] is True


