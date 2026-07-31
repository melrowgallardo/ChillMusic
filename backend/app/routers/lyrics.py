import httpx
from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.services.cache_service import search_cache

router = APIRouter(prefix="/api/lyrics", tags=["Lyrics"])

@router.get("", response_model=Dict[str, Any])
async def get_lyrics(
    track: str = Query(..., min_length=1),
    artist: str = Query("", description="Artist name")
):
    clean_track = track.strip()
    clean_artist = artist.strip()
    cache_key = f"lyrics:{clean_track.lower()}:{clean_artist.lower()}"
    cached = search_cache.get(cache_key)
    if cached:
        return cached

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            params = {"track_name": clean_track}
            if clean_artist:
                params["artist_name"] = clean_artist

            res = await client.get("https://lrclib.net/api/get", params=params)
            if res.status_code == 200:
                data = res.json()
                result = {
                    "plain_lyrics": data.get("plainLyrics", ""),
                    "synced_lyrics": data.get("syncedLyrics", ""),
                    "found": True
                }
                search_cache.set(cache_key, result, ttl=86400)
                return result

            # Search fallback
            search_res = await client.get("https://lrclib.net/api/search", params={"q": f"{clean_artist} {clean_track}".strip()})
            if search_res.status_code == 200:
                items = search_res.json()
                if isinstance(items, list) and items:
                    item = items[0]
                    result = {
                        "plain_lyrics": item.get("plainLyrics", ""),
                        "synced_lyrics": item.get("syncedLyrics", ""),
                        "found": True
                    }
                    search_cache.set(cache_key, result, ttl=86400)
                    return result
    except Exception as err:
        print(f"Lyrics lookup error: {err}")

    result = {
        "plain_lyrics": f"♪ {clean_track} ♪\nby {clean_artist or 'Unknown Artist'}\n\n(Instrumental / Lyrics unavailable)",
        "synced_lyrics": "",
        "found": False
    }
    return result
