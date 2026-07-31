from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Download, User
from app.schemas.schemas import DownloadCreate, DownloadResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/downloads", tags=["Downloads"])

@router.get("", response_model=List[DownloadResponse])
def get_downloads(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Download).filter(Download.user_id == current_user.id).order_by(Download.downloaded_at.desc()).all()

@router.post("", response_model=DownloadResponse, status_code=status.HTTP_201_CREATED)
def record_download(
    download_data: DownloadCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.query(Download).filter(Download.user_id == current_user.id, Download.song_id == download_data.song_id).first()
    if existing:
        return existing

    download = Download(
        user_id=current_user.id,
        song_id=download_data.song_id,
        song_title=download_data.song_title,
        artist_name=download_data.artist_name,
        audio_url=download_data.audio_url,
        file_path=download_data.file_path
    )
    db.add(download)
    db.commit()
    db.refresh(download)
    return download

@router.delete("/{download_id}")
def delete_download(
    download_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    download = None
    if download_id.isdigit():
        download = db.query(Download).filter(Download.id == int(download_id), Download.user_id == current_user.id).first()
    if not download:
        download = db.query(Download).filter(Download.song_id == download_id, Download.user_id == current_user.id).first()

    if not download:
        raise HTTPException(status_code=404, detail="Download record not found")

    db.delete(download)
    db.commit()
    return {"message": "Download record removed"}
