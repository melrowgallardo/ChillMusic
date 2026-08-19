from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# --- Auth & User Schemas ---
class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str

class GoogleAuthSchema(BaseModel):
    credential: Optional[str] = None
    token: Optional[str] = None
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    picture: Optional[str] = None

class UserProfile(BaseModel):
    id: int
    username: str
    email: EmailStr
    avatar_url: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    username: Optional[str] = None
    avatar_url: Optional[str] = None

# --- Setting Schemas ---
class SettingBase(BaseModel):
    theme: Optional[str] = "dark"
    auto_play: Optional[bool] = True
    high_quality: Optional[bool] = True
    crossfade: Optional[int] = 0

class SettingResponse(SettingBase):
    id: int
    user_id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Playlist Schemas ---
class PlaylistSongCreate(BaseModel):
    song_id: str
    song_title: str
    artist_name: str
    album_name: Optional[str] = None
    duration: Optional[int] = 0
    audio_url: str
    image_url: Optional[str] = None

class PlaylistSongResponse(PlaylistSongCreate):
    id: int
    playlist_id: int
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PlaylistCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: Optional[bool] = True

class PlaylistUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: Optional[bool] = None

class PlaylistResponse(BaseModel):
    id: int
    user_id: int
    title: str
    description: Optional[str] = None
    cover_url: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime
    songs: List[PlaylistSongResponse] = []

    model_config = ConfigDict(from_attributes=True)

# --- Favorite Schemas ---
class FavoriteCreate(BaseModel):
    item_type: str  # song, artist, album, playlist
    item_id: str
    title: str
    subtitle: Optional[str] = None
    image_url: Optional[str] = None
    audio_url: Optional[str] = None
    extra_data: Optional[Any] = None

class FavoriteResponse(FavoriteCreate):
    id: int
    user_id: int
    added_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- History Schemas ---
class HistoryCreate(BaseModel):
    song_id: str
    song_title: str
    artist_name: str
    album_name: Optional[str] = None
    audio_url: str
    image_url: Optional[str] = None
    duration: Optional[int] = 0

class HistoryResponse(HistoryCreate):
    id: int
    user_id: int
    played_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Download Schemas ---
class DownloadCreate(BaseModel):
    song_id: str
    song_title: str
    artist_name: str
    audio_url: str
    file_path: Optional[str] = None

class DownloadResponse(DownloadCreate):
    id: int
    user_id: int
    downloaded_at: datetime

    model_config = ConfigDict(from_attributes=True)
