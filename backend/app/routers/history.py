from fastapi import APIRouter, Depends, status
from typing import List
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import History, User
from app.schemas.schemas import HistoryCreate, HistoryResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/history", tags=["History"])

@router.get("", response_model=List[HistoryResponse])
def get_history(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(History).filter(History.user_id == current_user.id).order_by(History.played_at.desc()).limit(50).all()

@router.post("", response_model=HistoryResponse, status_code=status.HTTP_201_CREATED)
def record_history(
    history_data: HistoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    entry = History(
        user_id=current_user.id,
        song_id=history_data.song_id,
        song_title=history_data.song_title,
        artist_name=history_data.artist_name,
        album_name=history_data.album_name,
        audio_url=history_data.audio_url,
        image_url=history_data.image_url,
        duration=history_data.duration or 0
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
