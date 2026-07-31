import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database.session import engine, Base
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
