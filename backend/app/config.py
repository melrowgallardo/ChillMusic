import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str = "ChillMusic API"
    JAMENDO_CLIENT_ID: str = "aee77fe5"
    JAMENDO_CLIENT_SECRET: str = "aec8afccc478b45b2a9f7687d6781a1"
    YOUTUBE_API_KEY: str = "AIzaSyAVW_86xvVRgRWu25NFhyiPGBSpuHx_BvA"
    DATABASE_URL: str = "sqlite:///./chillmusic.db"
    SECRET_KEY: str = "chillmusic_super_secret_jwt_key_2026_antigravity"
    REFRESH_SECRET_KEY: str = "chillmusic_super_secret_refresh_key_2026_antigravity"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    model_config = SettingsConfigDict(env_file=".env", extra="allow")

settings = Settings()
