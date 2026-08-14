import asyncio
from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.jamendo_service import JamendoService
from app.services.deezer_service import DeezerService

router = APIRouter(prefix="/api/albums", tags=["Albums"])

import httpx

async def fetch_itunes_albums(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get("https://itunes.apple.com/search", params={"term": query, "entity": "album", "limit": limit})
            if res.status_code == 200:
                data = res.json()
                items = data.get("results", [])
                albums = []
                for item in items:
                    cover = (item.get("artworkUrl100") or "").replace("100x100bb", "600x600bb") or "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80"
                    release_date = (item.get("releaseDate") or "")[:4] or "2024"
                    title = item.get("collectionName", "Unknown Album")
                    artist_name = item.get("artistName", "Unknown Artist")
                    albums.append({
                        "id": f"it_{item.get('collectionId')}",
                        "title": title,
                        "name": title,
                        "artist": artist_name,
                        "artist_name": artist_name,
                        "coverUrl": cover,
                        "image": cover,
                        "cover_url": cover,
                        "image_url": cover,
                        "releaseDate": release_date,
                        "release_date": release_date,
                        "trackCount": item.get("trackCount", 10),
                        "track_count": item.get("trackCount", 10),
                        "source": "itunes"
                    })
                return albums
    except Exception:
        pass
    return []

@router.get("", response_model=List[Dict[str, Any]])
async def get_albums(
    q: str = Query("chill", min_length=1),
    limit: int = Query(20, ge=1, le=100),
    source: str = Query("all", description="jamendo, deezer, itunes, or all")
):
    if source == "deezer":
        return await DeezerService.search_albums(query=q, limit=limit)
    elif source == "jamendo":
        return await JamendoService.search_albums(query=q, limit=limit)
    elif source == "itunes":
        return await fetch_itunes_albums(query=q, limit=limit)

    it_task = asyncio.create_task(fetch_itunes_albums(query=q, limit=limit))
    dz_task = asyncio.create_task(DeezerService.search_albums(query=q, limit=limit))
    jm_task = asyncio.create_task(JamendoService.search_albums(query=q, limit=limit))
    it_res, dz_res, jm_res = await asyncio.gather(it_task, dz_task, jm_task, return_exceptions=True)

    it_list = it_res if not isinstance(it_res, Exception) and it_res else []
    dz_list = dz_res if not isinstance(dz_res, Exception) and dz_res else []
    jm_list = jm_res if not isinstance(jm_res, Exception) and jm_res else []
    return it_list + dz_list + jm_list

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
