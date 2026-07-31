import asyncio
import httpx
from typing import Dict, Any, List, Optional
from app.config import settings

JAMENDO_BASE_URL = "https://api.jamendo.com/v3.0"

class JamendoService:
    @staticmethod
    def _normalize_track(track: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Jamendo track structure into standard ChillMusic track dictionary."""
        return {
            "id": str(track.get("id", "")),
            "title": track.get("name", "Unknown Title"),
            "artist_id": str(track.get("artist_id", "")),
            "artist_name": track.get("artist_name", "Unknown Artist"),
            "album_id": str(track.get("album_id", "")),
            "album_name": track.get("album_name", "Unknown Album"),
            "duration": track.get("duration", 0),
            "audio_url": track.get("audio", track.get("audiodownload", "")),
            "image_url": track.get("image", track.get("album_image", "")),
            "releasedate": track.get("releasedate", ""),
            "license_ccurl": track.get("license_ccurl", "")
        }

    @staticmethod
    async def get_trending_tracks(limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "offset": offset,
                "order": "popularity_total",
                "include": "musicinfo"
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/tracks/", params=params)
            res.raise_for_status()
            data = res.json()
            return [JamendoService._normalize_track(t) for t in data.get("results", [])]

    @staticmethod
    async def get_new_releases(limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "offset": offset,
                "order": "releasedate_desc"
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/tracks/", params=params)
            res.raise_for_status()
            data = res.json()
            return [JamendoService._normalize_track(t) for t in data.get("results", [])]

    @staticmethod
    async def get_recommendations(tag: str = "chill", limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=3.0) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "fuzzytags": tag,
                "order": "popularity_week"
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/tracks/", params=params)
            res.raise_for_status()
            data = res.json()
            return [JamendoService._normalize_track(t) for t in data.get("results", [])]

    @staticmethod
    async def search_tracks(query: str, limit: int = 20, offset: int = 0) -> List[Dict[str, Any]]:
        """Fast parallel Jamendo track search with short adaptive timeout."""
        async with httpx.AsyncClient(timeout=3.0) as client:
            p1 = {"client_id": settings.JAMENDO_CLIENT_ID, "format": "json", "limit": limit, "offset": offset, "search": query}
            p2 = {"client_id": settings.JAMENDO_CLIENT_ID, "format": "json", "limit": limit, "offset": offset, "namesearch": query}
            p3 = {"client_id": settings.JAMENDO_CLIENT_ID, "format": "json", "limit": limit, "offset": offset, "fuzzytags": query}

            try:
                responses = await asyncio.gather(
                    client.get(f"{JAMENDO_BASE_URL}/tracks/", params=p1),
                    client.get(f"{JAMENDO_BASE_URL}/tracks/", params=p2),
                    client.get(f"{JAMENDO_BASE_URL}/tracks/", params=p3),
                    return_exceptions=True
                )
            except Exception:
                return []

            results = []
            seen_ids = set()
            for r in responses:
                if not isinstance(r, Exception) and r.status_code == 200:
                    items = r.json().get("results", [])
                    for item in items:
                        item_id = str(item.get("id"))
                        if item_id and item_id not in seen_ids:
                            seen_ids.add(item_id)
                            results.append(item)

            return [JamendoService._normalize_track(t) for t in results[:limit]]

    @staticmethod
    async def search_artists(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "namesearch": query
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/artists/", params=params)
            results = []
            if res.status_code == 200:
                data = res.json()
                for item in data.get("results", []):
                    results.append({
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "image": item.get("image", ""),
                        "website": item.get("website", ""),
                        "joindate": item.get("joindate", "")
                    })
            return results

    @staticmethod
    async def search_albums(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "namesearch": query
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/albums/", params=params)
            results = []
            if res.status_code == 200:
                data = res.json()
                for item in data.get("results", []):
                    results.append({
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "artist_id": str(item.get("artist_id", "")),
                        "artist_name": item.get("artist_name", ""),
                        "image": item.get("image", ""),
                        "releasedate": item.get("releasedate", "")
                    })
            return results

    @staticmethod
    async def search_playlists(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "limit": limit,
                "namesearch": query
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/playlists/", params=params)
            results = []
            if res.status_code == 200:
                data = res.json()
                for item in data.get("results", []):
                    results.append({
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "user_id": str(item.get("user_id", "")),
                        "user_name": item.get("user_name", ""),
                        "creationdate": item.get("creationdate", ""),
                        "zip": item.get("zip", "")
                    })
            return results

    @staticmethod
    async def get_artist_details(artist_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "id": artist_id
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/artists/", params=params)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    item = results[0]
                    return {
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "image": item.get("image", ""),
                        "website": item.get("website", ""),
                        "joindate": item.get("joindate", "")
                    }
            return None

    @staticmethod
    async def get_artist_tracks(artist_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "artist_id": artist_id,
                "limit": limit,
                "order": "popularity_total"
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/tracks/", params=params)
            if res.status_code == 200:
                data = res.json()
                return [JamendoService._normalize_track(t) for t in data.get("results", [])]
            return []

    @staticmethod
    async def get_artist_albums(artist_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "artist_id": artist_id,
                "limit": limit
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/albums/", params=params)
            results = []
            if res.status_code == 200:
                data = res.json()
                for item in data.get("results", []):
                    results.append({
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "artist_id": str(item.get("artist_id", "")),
                        "artist_name": item.get("artist_name", ""),
                        "image": item.get("image", ""),
                        "releasedate": item.get("releasedate", "")
                    })
            return results

    @staticmethod
    async def get_album_details(album_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "id": album_id
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/albums/tracks/", params=params)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    item = results[0]
                    tracks = [JamendoService._normalize_track(t) for t in item.get("tracks", [])]
                    return {
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "artist_id": str(item.get("artist_id", "")),
                        "artist_name": item.get("artist_name", ""),
                        "image": item.get("image", ""),
                        "releasedate": item.get("releasedate", ""),
                        "zip": item.get("zip", ""),
                        "tracks": tracks
                    }
            return None

    @staticmethod
    async def get_jamendo_playlist(playlist_id: str) -> Optional[Dict[str, Any]]:
        async with httpx.AsyncClient(timeout=2.5) as client:
            params = {
                "client_id": settings.JAMENDO_CLIENT_ID,
                "format": "json",
                "id": playlist_id
            }
            res = await client.get(f"{JAMENDO_BASE_URL}/playlists/tracks/", params=params)
            if res.status_code == 200:
                data = res.json()
                results = data.get("results", [])
                if results:
                    item = results[0]
                    tracks = [JamendoService._normalize_track(t) for t in item.get("tracks", [])]
                    return {
                        "id": str(item.get("id", "")),
                        "name": item.get("name", ""),
                        "user_id": str(item.get("user_id", "")),
                        "user_name": item.get("user_name", ""),
                        "creationdate": item.get("creationdate", ""),
                        "tracks": tracks
                    }
            return None
