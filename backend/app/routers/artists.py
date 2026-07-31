from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.jamendo_service import JamendoService

router = APIRouter(prefix="/api/artists", tags=["Artists"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_artists(q: str = Query("chill", min_length=1), limit: int = Query(20, ge=1, le=100)):
    return await JamendoService.search_artists(query=q, limit=limit)

@router.get("/{artist_id}")
async def get_artist_details(artist_id: str):
    artist = await JamendoService.get_artist_details(artist_id=artist_id)
    if not artist:
        raise HTTPException(status_code=404, detail="Artist not found")
    return artist

@router.get("/{artist_id}/tracks")
async def get_artist_tracks(artist_id: str, limit: int = Query(20, ge=1, le=100)):
    return await JamendoService.get_artist_tracks(artist_id=artist_id, limit=limit)

@router.get("/{artist_id}/albums")
async def get_artist_albums(artist_id: str, limit: int = Query(20, ge=1, le=100)):
    return await JamendoService.get_artist_albums(artist_id=artist_id, limit=limit)
