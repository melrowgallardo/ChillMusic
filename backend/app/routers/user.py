from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.models import User, Setting
from app.schemas.schemas import UserProfile, UserUpdate, SettingBase, SettingResponse
from app.auth.jwt import get_current_user

router = APIRouter(prefix="/api/user", tags=["User"])

@router.get("/profile", response_model=UserProfile)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserProfile)
def update_profile(user_update: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if user_update.username:
        # Check if username taken by another user
        existing = db.query(User).filter(User.username == user_update.username, User.id != current_user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already in use")
        current_user.username = user_update.username
    if user_update.avatar_url:
        current_user.avatar_url = user_update.avatar_url

    db.commit()
    db.refresh(current_user)
    return current_user

@router.get("/settings", response_model=SettingResponse)
def get_settings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        setting = Setting(user_id=current_user.id)
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.put("/settings", response_model=SettingResponse)
def update_settings(setting_update: SettingBase, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    setting = db.query(Setting).filter(Setting.user_id == current_user.id).first()
    if not setting:
        setting = Setting(user_id=current_user.id)
        db.add(setting)

    if setting_update.theme is not None:
        setting.theme = setting_update.theme
    if setting_update.auto_play is not None:
        setting.auto_play = setting_update.auto_play
    if setting_update.high_quality is not None:
        setting.high_quality = setting_update.high_quality
    if setting_update.crossfade is not None:
        setting.crossfade = setting_update.crossfade

    db.commit()
    db.refresh(setting)
    return setting
