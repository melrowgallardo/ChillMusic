from fastapi import APIRouter, Query, HTTPException
from typing import List, Dict, Any
from app.services.jamendo_service import JamendoService
from app.services.youtube_service import YouTubeService

import asyncio

router = APIRouter(prefix="/api/songs", tags=["Songs"])

@router.get("", response_model=List[Dict[str, Any]])
async def get_songs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str = Query("jamendo", description="Music source: jamendo, youtube, or all")
):
    if source == "youtube":
        return await YouTubeService.get_trending_music(limit=limit)
    elif source == "all":
        jamendo_task = asyncio.create_task(JamendoService.get_trending_tracks(limit=max(1, limit // 2), offset=offset))
        youtube_task = asyncio.create_task(YouTubeService.get_trending_music(limit=max(1, limit // 2)))
        j_res, y_res = await asyncio.gather(jamendo_task, youtube_task, return_exceptions=True)
        j_list = j_res if not isinstance(j_res, Exception) and j_res else []
        y_list = y_res if not isinstance(y_res, Exception) and y_res else []
        return y_list + j_list
    return await JamendoService.get_trending_tracks(limit=limit, offset=offset)

@router.get("/trending", response_model=List[Dict[str, Any]])
async def get_trending_songs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str = Query("jamendo", description="Music source: jamendo, youtube, or all")
):
    if source == "youtube":
        return await YouTubeService.get_trending_music(limit=limit)
    elif source == "all":
        jamendo_task = asyncio.create_task(JamendoService.get_trending_tracks(limit=max(1, limit // 2), offset=offset))
        youtube_task = asyncio.create_task(YouTubeService.get_trending_music(limit=max(1, limit // 2)))
        j_res, y_res = await asyncio.gather(jamendo_task, youtube_task, return_exceptions=True)
        j_list = j_res if not isinstance(j_res, Exception) and j_res else []
        y_list = y_res if not isinstance(y_res, Exception) and y_res else []
        return y_list + j_list
    return await JamendoService.get_trending_tracks(limit=limit, offset=offset)

@router.get("/new-releases", response_model=List[Dict[str, Any]])
async def get_new_releases(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str = Query("jamendo")
):
    if source == "youtube":
        return await YouTubeService.get_trending_music(limit=limit)
    return await JamendoService.get_new_releases(limit=limit, offset=offset)

@router.get("/recommendations", response_model=List[Dict[str, Any]])
async def get_recommendations(
    tag: str = Query("chill"),
    limit: int = Query(20, ge=1, le=100),
    source: str = Query("jamendo")
):
    if source == "youtube":
        return await YouTubeService.search_videos(query=tag, limit=limit)
    return await JamendoService.get_recommendations(tag=tag, limit=limit)

from app.services.deezer_service import DeezerService
from app.services.cache_service import search_cache

@router.get("/unified-search", response_model=Dict[str, Any])
async def unified_search(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str = Query("all", description="Music source: jamendo, youtube, deezer, or all")
):
    clean_q = q.lower().strip()
    cache_key = f"unified:{source}:{clean_q}:{limit}:{offset}"
    cached_data = search_cache.get(cache_key)
    if cached_data:
        return cached_data

    songs_task = asyncio.create_task(search_songs(q=q, limit=limit, offset=offset, source=source))

    async def fetch_artists():
        if source == "jamendo":
            return await JamendoService.search_artists(query=q, limit=12)
        elif source == "deezer":
            return await DeezerService.search_artists(query=q, limit=12)
        dz_t = asyncio.create_task(DeezerService.search_artists(query=q, limit=12))
        jm_t = asyncio.create_task(JamendoService.search_artists(query=q, limit=12))
        dz_res, jm_res = await asyncio.gather(dz_t, jm_t, return_exceptions=True)
        dz = dz_res if not isinstance(dz_res, Exception) and dz_res else []
        jm = jm_res if not isinstance(jm_res, Exception) and jm_res else []
        return dz + jm

    async def fetch_albums():
        if source == "jamendo":
            return await JamendoService.search_albums(query=q, limit=12)
        elif source == "deezer":
            return await DeezerService.search_albums(query=q, limit=12)
        dz_t = asyncio.create_task(DeezerService.search_albums(query=q, limit=12))
        jm_t = asyncio.create_task(JamendoService.search_albums(query=q, limit=12))
        dz_res, jm_res = await asyncio.gather(dz_t, jm_t, return_exceptions=True)
        dz = dz_res if not isinstance(dz_res, Exception) and dz_res else []
        jm = jm_res if not isinstance(jm_res, Exception) and jm_res else []
        return dz + jm

    artists_task = asyncio.create_task(fetch_artists())
    albums_task = asyncio.create_task(fetch_albums())
    playlists_task = asyncio.create_task(JamendoService.search_playlists(query=q, limit=12))

    songs_res, artists_res, albums_res, playlists_res = await asyncio.gather(
        songs_task, artists_task, albums_task, playlists_task, return_exceptions=True
    )

    result = {
        "songs": songs_res if not isinstance(songs_res, Exception) and songs_res else [],
        "artists": artists_res if not isinstance(artists_res, Exception) and artists_res else [],
        "albums": albums_res if not isinstance(albums_res, Exception) and albums_res else [],
        "playlists": playlists_res if not isinstance(playlists_res, Exception) and playlists_res else []
    }

    search_cache.set(cache_key, result, ttl=300)
    return result

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_songs(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    source: str = Query("all", description="Music source: jamendo, youtube, deezer, or all")
):
    clean_q = q.lower().strip()
    cache_key = f"songs:{source}:{clean_q}:{limit}:{offset}"
    cached_data = search_cache.get(cache_key)
    if cached_data:
        return cached_data

    if source == "youtube":
        res = await YouTubeService.search_videos(query=q, limit=limit, offset=offset)
    elif source == "deezer":
        res = await DeezerService.search_tracks(query=q, limit=limit)
    elif source == "jamendo":
        res = await JamendoService.search_tracks(query=q, limit=limit, offset=offset)
    elif source == "all":
        yt_task = asyncio.create_task(YouTubeService.search_videos(query=q, limit=limit, offset=offset))
        dz_task = asyncio.create_task(DeezerService.search_tracks(query=q, limit=limit))
        jm_task = asyncio.create_task(JamendoService.search_tracks(query=q, limit=limit, offset=offset))

        yt_res, dz_res, jm_res = await asyncio.gather(yt_task, dz_task, jm_task, return_exceptions=True)

        youtube_tracks = yt_res if not isinstance(yt_res, Exception) and yt_res else []
        deezer_tracks = dz_res if not isinstance(dz_res, Exception) and dz_res else []
        jamendo_tracks = jm_res if not isinstance(jm_res, Exception) and jm_res else []

        res = youtube_tracks + deezer_tracks + jamendo_tracks
    else:
        res = await JamendoService.search_tracks(query=q, limit=limit, offset=offset)

    search_cache.set(cache_key, res, ttl=300)
    return res

