import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from app.database.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    playlists = relationship("Playlist", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    history = relationship("History", back_populates="user", cascade="all, delete-orphan")
    downloads = relationship("Download", back_populates="user", cascade="all, delete-orphan")
    user_setting = relationship("Setting", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Playlist(Base):
    __tablename__ = "playlists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    cover_url = Column(String(255), nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="playlists")
    songs = relationship("PlaylistSong", back_populates="playlist", cascade="all, delete-orphan")

class PlaylistSong(Base):
    __tablename__ = "playlist_songs"

    id = Column(Integer, primary_key=True, index=True)
    playlist_id = Column(Integer, ForeignKey("playlists.id"), nullable=False)
    song_id = Column(String(100), nullable=False)  # Jamendo track ID
    song_title = Column(String(255), nullable=False)
    artist_name = Column(String(255), nullable=False)
    album_name = Column(String(255), nullable=True)
    duration = Column(Integer, default=0)  # seconds
    audio_url = Column(String(500), nullable=False)
    image_url = Column(String(500), nullable=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    playlist = relationship("Playlist", back_populates="songs")

class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    item_type = Column(String(20), nullable=False)  # song, artist, album, playlist
    item_id = Column(String(100), nullable=False)  # Jamendo or local ID
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=True)
    audio_url = Column(String(500), nullable=True)
    extra_data = Column(JSON, nullable=True)
    added_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="favorites")

class History(Base):
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    song_id = Column(String(100), nullable=False)
    song_title = Column(String(255), nullable=False)
    artist_name = Column(String(255), nullable=False)
    album_name = Column(String(255), nullable=True)
    audio_url = Column(String(500), nullable=False)
    image_url = Column(String(500), nullable=True)
    duration = Column(Integer, default=0)
    played_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="history")

class Download(Base):
    __tablename__ = "downloads"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    song_id = Column(String(100), nullable=False)
    song_title = Column(String(255), nullable=False)
    artist_name = Column(String(255), nullable=False)
    audio_url = Column(String(500), nullable=False)
    file_path = Column(String(500), nullable=True)
    downloaded_at = Column(DateTime, default=datetime.datetime.utcnow)

    user = relationship("User", back_populates="downloads")

class Setting(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    theme = Column(String(20), default="dark")  # dark / light
    auto_play = Column(Boolean, default=True)
    high_quality = Column(Boolean, default=True)
    crossfade = Column(Integer, default=0)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    user = relationship("User", back_populates="user_setting")
