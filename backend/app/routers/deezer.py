from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.deezer_service import DeezerService

router = APIRouter(prefix="/api/deezer", tags=["Deezer"])

@router.get("/album/{album_id}")
async def get_deezer_album(album_id: str):
    album = await DeezerService.get_album_details(album_id=album_id)
    if not album:
        raise HTTPException(status_code=404, detail="Deezer album not found")
    return album

@router.get("/search/album", response_model=List[Dict[str, Any]])
async def search_deezer_albums(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    return await DeezerService.search_albums(query=q, limit=limit)

@router.get("/search/track", response_model=List[Dict[str, Any]])
async def search_deezer_tracks(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    return await DeezerService.search_tracks(query=q, limit=limit)

@router.get("/search/artist", response_model=List[Dict[str, Any]])
async def search_deezer_artists(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50)
):
    return await DeezerService.search_artists(query=q, limit=limit)

@router.get("/chart", response_model=Dict[str, Any])
async def get_deezer_chart(limit: int = Query(20, ge=1, le=50)):
    return await DeezerService.get_chart(limit=limit)
