import httpx
from typing import Dict, Any, List, Optional

DEEZER_BASE_URL = "https://api.deezer.com"

class DeezerService:
    @staticmethod
    def _normalize_track(track: Dict[str, Any], album_cover: str = "") -> Dict[str, Any]:
        """Normalize Deezer track structure into ChillMusic track dictionary."""
        track_id = str(track.get("id", ""))
        album = track.get("album", {})
        artist = track.get("artist", {})

        image = (
            album.get("cover_medium") or
            album.get("cover_big") or
            album.get("cover_small") or
            album_cover or
            ""
        )

        return {
            "id": f"dz_{track_id}" if track_id and not track_id.startswith("dz_") else track_id,
            "deezer_id": track_id.replace("dz_", ""),
            "title": track.get("title", track.get("title_short", "Unknown Title")),
            "artist_id": str(artist.get("id", "")),
            "artist_name": artist.get("name", "Unknown Artist"),
            "album_id": str(album.get("id", "")),
            "album_name": album.get("title", "Unknown Album"),
            "duration": track.get("duration", 0),
            "audio_url": track.get("preview", ""),
            "image_url": image,
            "releasedate": track.get("release_date", ""),
            "source": "deezer"
        }

    @staticmethod
    def _normalize_album(album: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize Deezer album structure into ChillMusic album dictionary."""
        album_id = str(album.get("id", ""))
        artist = album.get("artist", {})
        title = album.get("title", "Unknown Album")
        artist_name = artist.get("name", "Unknown Artist")
        cover = album.get("cover_medium") or album.get("cover_big") or album.get("cover_xl") or ""
        release_date = album.get("release_date", "")
        track_count = album.get("nb_tracks", 0)

        return {
            "id": f"dz_{album_id}" if album_id and not album_id.startswith("dz_") else album_id,
            "deezer_id": album_id.replace("dz_", ""),
            "name": title,
            "title": title,
            "artist_id": str(artist.get("id", "")),
            "artist": artist_name,
            "artist_name": artist_name,
            "image": cover,
            "coverUrl": cover,
            "cover_url": cover,
            "image_url": cover,
            "releaseDate": release_date,
            "release_date": release_date,
            "trackCount": track_count,
            "track_count": track_count,
            "source": "deezer"
        }

    @staticmethod
    async def get_album_details(album_id: str) -> Optional[Dict[str, Any]]:
        """Fetch album details and tracklist from Deezer API: https://api.deezer.com/album/{album_id}"""
        clean_id = album_id.replace("dz_", "")
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{DEEZER_BASE_URL}/album/{clean_id}")
            if res.status_code == 200:
                data = res.json()
                if "error" in data:
                    return None

                cover = data.get("cover_medium") or data.get("cover_big") or ""
                tracks_data = data.get("tracks", {}).get("data", [])

                normalized_tracks = []
                for t in tracks_data:
                    if "album" not in t:
                        t["album"] = {"id": data.get("id"), "title": data.get("title"), "cover_medium": cover}
                    normalized_tracks.append(DeezerService._normalize_track(t, cover))

                artist_info = data.get("artist", {})
                return {
                    "id": f"dz_{data.get('id')}",
                    "name": data.get("title", ""),
                    "artist_id": str(artist_info.get("id", "")),
                    "artist_name": artist_info.get("name", ""),
                    "image": cover,
                    "releasedate": data.get("release_date", ""),
                    "upc": data.get("upc", ""),
                    "genres": [g.get("name") for g in data.get("genres", {}).get("data", [])],
                    "tracks": normalized_tracks,
                    "source": "deezer"
                }
            return None

    @staticmethod
    async def search_albums(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search albums on Deezer API: https://api.deezer.com/search/album?q={query}"""
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{DEEZER_BASE_URL}/search/album", params={"q": query, "limit": limit})
            if res.status_code == 200:
                data = res.json()
                items = data.get("data", [])
                return [DeezerService._normalize_album(a) for a in items]
            return []

    @staticmethod
    async def search_tracks(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search tracks on Deezer API: https://api.deezer.com/search?q={query}"""
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{DEEZER_BASE_URL}/search", params={"q": query, "limit": limit})
            if res.status_code == 200:
                data = res.json()
                items = data.get("data", [])
                return [DeezerService._normalize_track(t) for t in items]
            return []

    @staticmethod
    async def search_artists(query: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Search artists on Deezer API: https://api.deezer.com/search/artist?q={query}"""
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{DEEZER_BASE_URL}/search/artist", params={"q": query, "limit": limit})
            results = []
            if res.status_code == 200:
                data = res.json()
                for a in data.get("data", []):
                    artist_id = str(a.get("id", ""))
                    results.append({
                        "id": f"dz_{artist_id}",
                        "name": a.get("name", ""),
                        "image": a.get("picture_medium") or a.get("picture_big") or "",
                        "nb_fan": a.get("nb_fan", 0),
                        "source": "deezer"
                    })
            return results

    @staticmethod
    async def get_chart(limit: int = 20) -> Dict[str, Any]:
        """Fetch top chart tracks & albums from Deezer: https://api.deezer.com/chart"""
        async with httpx.AsyncClient(timeout=2.5) as client:
            res = await client.get(f"{DEEZER_BASE_URL}/chart")
            if res.status_code == 200:
                data = res.json()
                tracks = [DeezerService._normalize_track(t) for t in data.get("tracks", {}).get("data", [])[:limit]]
                albums = [DeezerService._normalize_album(a) for a in data.get("albums", {}).get("data", [])[:limit]]
                return {"tracks": tracks, "albums": albums}
            return {"tracks": [], "albums": []}
