import asyncio
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.jamendo_service import JamendoService
from app.services.deezer_service import DeezerService

router = APIRouter(prefix="/api/albums", tags=["Albums"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_albums(
    q: str = Query("chill", min_length=1),
    limit: int = Query(20, ge=1, le=100),
    source: str = Query("all", description="jamendo, deezer, or all")
):
    if source == "deezer":
        return await DeezerService.search_albums(query=q, limit=limit)
    elif source == "jamendo":
        return await JamendoService.search_albums(query=q, limit=limit)

    dz_task = asyncio.create_task(DeezerService.search_albums(query=q, limit=limit))
    jm_task = asyncio.create_task(JamendoService.search_albums(query=q, limit=limit))
    dz_res, jm_res = await asyncio.gather(dz_task, jm_task, return_exceptions=True)

    dz_list = dz_res if not isinstance(dz_res, Exception) and dz_res else []
    jm_list = jm_res if not isinstance(jm_res, Exception) and jm_res else []
    return dz_list + jm_list

@router.get("/{album_id}")
async def get_album_details(album_id: str):
    if album_id.startswith("dz_") or (album_id.isdigit() and len(album_id) >= 6):
        album = await DeezerService.get_album_details(album_id=album_id)
        if album:
            return album

    album = await JamendoService.get_album_details(album_id=album_id)
    if not album:
        album = await DeezerService.get_album_details(album_id=album_id)

    if not album:
        raise HTTPException(status_code=404, detail="Album not found")
    return album
