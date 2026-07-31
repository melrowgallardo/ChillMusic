from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import Favorite, User
from app.schemas.schemas import FavoriteCreate, FavoriteResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/favorites", tags=["Favorites"])

@router.get("", response_model=List[FavoriteResponse])
def get_favorites(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(Favorite).filter(Favorite.user_id == current_user.id).order_by(Favorite.added_at.desc()).all()

@router.post("", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
def add_favorite(
    fav_data: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check if already favorited
    existing = db.query(Favorite).filter(
        Favorite.user_id == current_user.id,
        Favorite.item_type == fav_data.item_type,
        Favorite.item_id == fav_data.item_id
    ).first()
    if existing:
        return existing

    favorite = Favorite(
        user_id=current_user.id,
        item_type=fav_data.item_type,
        item_id=fav_data.item_id,
        title=fav_data.title,
        subtitle=fav_data.subtitle,
        image_url=fav_data.image_url,
        audio_url=fav_data.audio_url,
        extra_data=fav_data.extra_data
    )
    db.add(favorite)
    db.commit()
    db.refresh(favorite)
    return favorite

@router.delete("/{fav_id}")
def remove_favorite(
    fav_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Support deletion by numeric database ID or by Jamendo item_id
    favorite = None
    if fav_id.isdigit():
        favorite = db.query(Favorite).filter(Favorite.id == int(fav_id), Favorite.user_id == current_user.id).first()
    
    if not favorite:
        favorite = db.query(Favorite).filter(Favorite.item_id == fav_id, Favorite.user_id == current_user.id).first()

    if not favorite:
        raise HTTPException(status_code=404, detail="Favorite item not found")

    db.delete(favorite)
    db.commit()
    return {"message": "Item removed from favorites"}
