import asyncio
import urllib.parse
import yt_dlp
from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import RedirectResponse
from typing import List, Dict, Any
from app.services.youtube_service import YouTubeService
from app.services.cache_service import search_cache

router = APIRouter(prefix="/api/youtube", tags=["YouTube"])

@router.get("/stream-by-query")
async def stream_youtube_audio_by_query(q: str = Query(..., min_length=1)):
    clean_q = q.lower().strip()
    cache_key = f"yt_query_stream:{clean_q}"
    cached_url = search_cache.get(cache_key)
    if cached_url:
        return RedirectResponse(url=cached_url, status_code=307)

    # Search for video on YouTube
    tracks = await YouTubeService.search_videos(query=q, limit=1)
    if tracks and tracks[0].get("youtube_id"):
        video_id = tracks[0]["youtube_id"]
        # Extract audio stream for video_id
        return await stream_youtube_audio(video_id=video_id)

    raise HTTPException(status_code=404, detail="Audio stream not found for query")

@router.get("/stream/{video_id}")
async def stream_youtube_audio(video_id: str):
    clean_id = video_id.replace("yt_", "")
    cache_key = f"yt_stream:{clean_id}"
    cached_url = search_cache.get(cache_key)
    if cached_url:
        return RedirectResponse(url=cached_url, status_code=307)

    def extract_url():
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'quiet': True,
            'skip_download': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={clean_id}", download=False)
            return info.get('url')

    try:
        loop = asyncio.get_event_loop()
        stream_url = await loop.run_in_executor(None, extract_url)
        if stream_url:
            search_cache.set(cache_key, stream_url, ttl=10800)
            return RedirectResponse(url=stream_url, status_code=307)
    except Exception as e:
        print(f"Error extracting YouTube audio stream for {clean_id}: {e}")

    return RedirectResponse(url=f"https://www.youtube.com/watch?v={clean_id}", status_code=307)

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_youtube(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0)
):
    return await YouTubeService.search_videos(query=q, limit=limit, offset=offset)

@router.get("/trending", response_model=List[Dict[str, Any]])
async def get_youtube_trending(limit: int = Query(20, ge=1, le=50)):
    return await YouTubeService.get_trending_music(limit=limit)

@router.get("/video/{video_id}", response_model=Dict[str, Any])
async def get_youtube_video_details(video_id: str):
    details = await YouTubeService.get_video_details(video_id=video_id)
    if not details:
        raise HTTPException(status_code=404, detail="YouTube video not found")
    return details
