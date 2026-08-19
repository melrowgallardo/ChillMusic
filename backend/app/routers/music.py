import logging
from fastapi import APIRouter, Query
from typing import List, Dict, Any
from app.services.youtube_service import YouTubeService
from app.services.jamendo_service import JamendoService

logger = logging.getLogger("ChillMusic")
router = APIRouter(prefix="/api/music", tags=["Music"])

def format_track_duration(duration_sec: Any) -> str:
    try:
        if isinstance(duration_sec, str) and ":" in duration_sec:
            return duration_sec
        sec = int(duration_sec or 0)
        mins = sec // 60
        secs = sec % 60
        return f"{mins}:{secs:02d}"
    except Exception:
        return "3:45"

def format_music_track(item: Dict[str, Any]) -> Dict[str, Any]:
    raw_vid = str(item.get("youtube_id") or item.get("youtubeId") or item.get("id") or "").replace("yt_", "")
    title = item.get("title") or "Unknown Song"
    artist = item.get("artist") or item.get("artist_name") or "YouTube Music"
    image = item.get("thumbnail") or item.get("image_url") or item.get("cover_url") or (
        f"https://i.ytimg.com/vi/{raw_vid}/hqdefault.jpg" if raw_vid else "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=400&q=80"
    )
    dur_str = format_track_duration(item.get("duration"))

    return {
        "id": raw_vid or item.get("id") or "vid_default",
        "youtubeId": raw_vid,
        "youtube_id": raw_vid,
        "title": title,
        "artist": artist,
        "artist_name": artist,
        "thumbnail": image,
        "image_url": image,
        "cover_url": image,
        "duration": dur_str,
        "audio_url": item.get("audio_url") or (f"/api/youtube/stream/{raw_vid}" if raw_vid else ""),
        "source": "youtube"
    }

@router.get("/trending", response_model=List[Dict[str, Any]])
async def get_trending_music(limit: int = Query(20, ge=1, le=50)):
    try:
        yt_tracks = await YouTubeService.get_trending_music(limit=limit)
        if not yt_tracks:
            yt_tracks = await JamendoService.get_trending_tracks(limit=limit)

        formatted = [format_music_track(t) for t in (yt_tracks or [])]
        if formatted:
            return formatted

        return [
            {
                "id": "dQw4w9WgXcQ",
                "youtubeId": "dQw4w9WgXcQ",
                "youtube_id": "dQw4w9WgXcQ",
                "title": "Never Gonna Give You Up",
                "artist": "Rick Astley",
                "artist_name": "Rick Astley",
                "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "image_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "cover_url": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
                "duration": "3:33",
                "audio_url": "/api/youtube/stream/dQw4w9WgXcQ",
                "source": "youtube"
            }
        ]
    except Exception as e:
        logger.error(f"Error in /api/music/trending: {e}")
        return []

@router.get("/search", response_model=List[Dict[str, Any]])
async def search_music(q: str = Query("", description="Search query")):
    if not q.strip():
        return []
    try:
        yt_tracks = await YouTubeService.search_videos(query=q, limit=20)
        if not yt_tracks:
            yt_tracks = await JamendoService.search_tracks(query=q, limit=20)

        formatted = [format_music_track(t) for t in (yt_tracks or [])]
        return formatted
    except Exception as e:
        logger.error(f"Error in /api/music/search: {e}")
        return []
