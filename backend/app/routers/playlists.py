from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Playlist, PlaylistSong, User
from app.schemas.schemas import PlaylistCreate, PlaylistUpdate, PlaylistResponse, PlaylistSongCreate, PlaylistSongResponse
from app.auth.jwt import get_current_user
from app.services.jamendo_service import JamendoService

router = APIRouter(prefix="/api", tags=["Playlists"])

@router.get("/playlists")
async def get_playlists(
    q: str = Query("chill", min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    # Fetch public user playlists
    user_playlists = db.query(Playlist).filter(Playlist.is_public == True).limit(limit).all()
    # Fetch Jamendo playlists
    jamendo_playlists = await JamendoService.search_playlists(query=q, limit=limit)
    
    return {
        "user_playlists": [PlaylistResponse.model_validate(p) for p in user_playlists],
        "jamendo_playlists": jamendo_playlists
    }

@router.get("/playlists/me", response_model=List[PlaylistResponse])
def get_user_playlists(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Playlist).filter(Playlist.user_id == current_user.id).all()

@router.post("/playlist", response_model=PlaylistResponse, status_code=status.HTTP_201_CREATED)
def create_playlist(
    playlist_data: PlaylistCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = Playlist(
        user_id=current_user.id,
        title=playlist_data.title,
        description=playlist_data.description,
        cover_url=playlist_data.cover_url or "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
        is_public=playlist_data.is_public if playlist_data.is_public is not None else True
    )
    db.add(playlist)
    db.commit()
    db.refresh(playlist)
    return playlist

@router.get("/playlist/{playlist_id}")
async def get_playlist_by_id(playlist_id: str, db: Session = Depends(get_db)):
    # Check if numeric user playlist
    if playlist_id.isdigit():
        playlist = db.query(Playlist).filter(Playlist.id == int(playlist_id)).first()
        if playlist:
            return PlaylistResponse.model_validate(playlist)
    
    # Try fetching Jamendo playlist
    jam_playlist = await JamendoService.get_jamendo_playlist(playlist_id)
    if jam_playlist:
        return jam_playlist

    raise HTTPException(status_code=404, detail="Playlist not found")

@router.put("/playlist/{playlist_id}", response_model=PlaylistResponse)
def update_playlist(
    playlist_id: int,
    playlist_update: PlaylistUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    if playlist_update.title is not None:
        playlist.title = playlist_update.title
    if playlist_update.description is not None:
        playlist.description = playlist_update.description
    if playlist_update.cover_url is not None:
        playlist.cover_url = playlist_update.cover_url
    if playlist_update.is_public is not None:
        playlist.is_public = playlist_update.is_public

    db.commit()
    db.refresh(playlist)
    return playlist

@router.delete("/playlist/{playlist_id}")
def delete_playlist(
    playlist_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    db.delete(playlist)
    db.commit()
    return {"message": "Playlist deleted successfully"}

@router.post("/playlist/{playlist_id}/songs", response_model=PlaylistSongResponse)
def add_song_to_playlist(
    playlist_id: int,
    song_data: PlaylistSongCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    # Avoid duplicate in same playlist
    existing = db.query(PlaylistSong).filter(PlaylistSong.playlist_id == playlist_id, PlaylistSong.song_id == song_data.song_id).first()
    if existing:
        return existing

    playlist_song = PlaylistSong(
        playlist_id=playlist.id,
        song_id=song_data.song_id,
        song_title=song_data.song_title,
        artist_name=song_data.artist_name,
        album_name=song_data.album_name,
        duration=song_data.duration or 0,
        audio_url=song_data.audio_url,
        image_url=song_data.image_url
    )
    db.add(playlist_song)
    db.commit()
    db.refresh(playlist_song)
    return playlist_song

@router.delete("/playlist/{playlist_id}/songs/{song_id}")
def remove_song_from_playlist(
    playlist_id: int,
    song_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    playlist = db.query(Playlist).filter(Playlist.id == playlist_id, Playlist.user_id == current_user.id).first()
    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found or permission denied")

    song_entry = db.query(PlaylistSong).filter(PlaylistSong.playlist_id == playlist_id, PlaylistSong.song_id == song_id).first()
    if not song_entry:
        raise HTTPException(status_code=404, detail="Song not found in playlist")

    db.delete(song_entry)
    db.commit()
    return {"message": "Song removed from playlist"}
