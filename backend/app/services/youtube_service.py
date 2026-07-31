import re
import html
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

YOUTUBE_BASE_URL = "https://www.googleapis.com/youtube/v3"

class YouTubeService:
    @staticmethod
    def parse_iso_duration(duration_str: str) -> int:
        """Parse ISO 8601 duration (e.g. PT4M20S, PT1H2M10S) to seconds."""
        if not duration_str:
            return 0
        pattern = re.compile(r'PT(?:(?P<hours>\d+)H)?(?:(?P<minutes>\d+)M)?(?:(?P<seconds>\d+)S)?')
        match = pattern.match(duration_str)
        if not match:
            return 0
        parts = match.groupdict()
        hours = int(parts['hours'] or 0)
        minutes = int(parts['minutes'] or 0)
        seconds = int(parts['seconds'] or 0)
        return hours * 3600 + minutes * 60 + seconds

    @staticmethod
    def _normalize_video_item(item: Dict[str, Any], details_map: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Normalize YouTube API video resource or search result into ChillMusic track format."""
        snippet = item.get("snippet", {})

        # ID determination
        raw_id = item.get("id")
        if isinstance(raw_id, dict):
            video_id = raw_id.get("videoId", "")
        else:
            video_id = str(raw_id or "")

        track_id = f"yt_{video_id}" if video_id else ""

        # Thumbnails
        thumbnails = snippet.get("thumbnails", {})
        image_url = (
            thumbnails.get("maxres", {}).get("url") or
            thumbnails.get("high", {}).get("url") or
            thumbnails.get("medium", {}).get("url") or
            thumbnails.get("default", {}).get("url", "")
        )

        # Duration logic
        duration = 0
        if details_map and video_id in details_map:
            duration_str = details_map[video_id].get("contentDetails", {}).get("duration", "")
            duration = YouTubeService.parse_iso_duration(duration_str)
        elif "contentDetails" in item:
            duration_str = item.get("contentDetails", {}).get("duration", "")
            duration = YouTubeService.parse_iso_duration(duration_str)

        published_at = snippet.get("publishedAt", "")
        release_date = published_at[:10] if published_at else ""

        title = html.unescape(snippet.get("title", "Unknown Title"))
        channel_title = html.unescape(snippet.get("channelTitle", "YouTube Music"))

        return {
            "id": track_id,
            "youtube_id": video_id,
            "title": title,
            "artist_id": snippet.get("channelId", ""),
            "artist_name": channel_title,
            "album_id": "youtube",
            "album_name": "YouTube",
            "duration": duration,
            "audio_url": f"/api/youtube/stream/{video_id}",
            "embed_url": f"https://www.youtube.com/embed/{video_id}?autoplay=1",
            "image_url": image_url,
            "releasedate": release_date,
            "source": "youtube"
        }

    @staticmethod
    async def fetch_video_details(client: httpx.AsyncClient, video_ids: List[str]) -> Dict[str, Any]:
        """Fetch contentDetails and statistics for a list of video IDs."""
        if not video_ids:
            return {}
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return {}
        params = {
            "part": "snippet,contentDetails,statistics",
            "id": ",".join(video_ids),
            "key": api_key
        }
        res = await client.get(f"{YOUTUBE_BASE_URL}/videos", params=params)
        if res.status_code == 200:
            items = res.json().get("items", [])
            return {item["id"]: item for item in items}
        return {}

    @staticmethod
    async def search_videos(query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Search music videos on YouTube Data API."""
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return []

        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {
                "part": "snippet",
                "type": "video",
                "videoCategoryId": "10",
                "q": query,
                "maxResults": limit,
                "key": api_key
            }
            res = await client.get(f"{YOUTUBE_BASE_URL}/search", params=params)
            items = []
            if res.status_code == 200:
                items = res.json().get("items", [])

            if not items:
                params.pop("videoCategoryId", None)
                res_fallback = await client.get(f"{YOUTUBE_BASE_URL}/search", params=params)
                if res_fallback.status_code == 200:
                    items = res_fallback.json().get("items", [])

            video_ids = [
                item["id"]["videoId"] for item in items
                if isinstance(item.get("id"), dict) and "videoId" in item["id"]
            ]

            details_map = await YouTubeService.fetch_video_details(client, video_ids)

            return [
                YouTubeService._normalize_video_item(item, details_map)
                for item in items
                if isinstance(item.get("id"), dict) and "videoId" in item["id"]
            ]

    @staticmethod
    async def get_trending_music(limit: int = 20) -> List[Dict[str, Any]]:
        """Get trending/popular music videos from YouTube Data API."""
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return []

        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {
                "part": "snippet,contentDetails,statistics",
                "chart": "mostPopular",
                "videoCategoryId": "10",
                "maxResults": limit,
                "key": api_key
            }
            res = await client.get(f"{YOUTUBE_BASE_URL}/videos", params=params)
            if res.status_code == 200:
                items = res.json().get("items", [])
                return [YouTubeService._normalize_video_item(item) for item in items]
            return []

    @staticmethod
    async def get_video_details(video_id: str) -> Optional[Dict[str, Any]]:
        """Get single video details by YouTube Video ID."""
        clean_id = video_id.replace("yt_", "")
        api_key = settings.YOUTUBE_API_KEY
        if not api_key:
            return None

        async with httpx.AsyncClient(timeout=3.0) as client:
            details_map = await YouTubeService.fetch_video_details(client, [clean_id])
            if clean_id in details_map:
                return YouTubeService._normalize_video_item(details_map[clean_id])
            return None
