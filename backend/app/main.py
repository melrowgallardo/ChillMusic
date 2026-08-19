import logging
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.config import settings
from app.database.session import engine, Base, get_db
from app.models.models import User
from app.auth.jwt import get_current_user
from app.routers import auth, user, songs, artists, albums, playlists, favorites, history, downloads, youtube, deezer, lyrics


# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger("ChillMusic")

# Create database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="FastAPI Backend for ChillMusic Streaming Application powered by Jamendo, YouTube & Deezer APIs",
    version="1.2.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend & mobile integration
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",  # Allows any origin with credentials for native app & web
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(user.router)
app.include_router(songs.router)
app.include_router(artists.router)
app.include_router(albums.router)
app.include_router(playlists.router)
app.include_router(favorites.router)
app.include_router(history.router)
app.include_router(downloads.router)
app.include_router(youtube.router)
app.include_router(deezer.router)
app.include_router(lyrics.router)

from app.services.jamendo_service import JamendoService
from app.services.youtube_service import YouTubeService

@app.get("/api/tracks")
async def get_tracks(limit: int = 20):
    try:
        tracks = await YouTubeService.get_trending_music(limit=limit)
        if not tracks:
            tracks = await JamendoService.get_trending_tracks(limit=limit)
        return tracks or []
    except Exception as e:
        logger.warn(f"Error fetching /api/tracks: {e}")
        return []

@app.get("/api/search")
async def search_tracks(q: str = ""):
    if not q.strip():
        return []
    try:
        results = await YouTubeService.search_videos(query=q, limit=20)
        if not results:
            results = await JamendoService.search_tracks(query=q, limit=20)
        return results or []
    except Exception as e:
        logger.warn(f"Error fetching /api/search: {e}")
        return []

@app.delete("/api/users/me")
def delete_users_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account successfully deleted"}

@app.get("/")
def root():

    return {
        "app": settings.APP_NAME,
        "status": "online",
        "docs": "/docs",
        "jamendo_client_id": settings.JAMENDO_CLIENT_ID,
        "youtube_api_configured": bool(settings.YOUTUBE_API_KEY)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
