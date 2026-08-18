from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from app.config import settings
from app.database.session import get_db
from app.models import models
from app.models.models import User, Setting
from app.schemas.schemas import UserRegister, UserLogin, Token, TokenRefresh, UserProfile
from app.auth.jwt import get_password_hash, verify_password, create_access_token, create_refresh_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserProfile, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    clean_email = user_data.email.strip().lower()
    clean_username = user_data.username.strip()

    # Check existing user
    if db.query(User).filter(User.email == clean_email).first():
        raise HTTPException(status_code=400, detail="Email address is already registered")
    if db.query(User).filter(User.username == clean_username).first():
        raise HTTPException(status_code=400, detail="Username is already taken")

    hashed_pwd = get_password_hash(user_data.password)
    user = User(
        username=clean_username,
        email=clean_email,
        hashed_password=hashed_pwd,
        avatar_url=f"https://api.dicebear.com/7.x/bottts/svg?seed={clean_username}"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Initialize default settings for user
    default_setting = Setting(user_id=user.id)
    db.add(default_setting)
    db.commit()

    return user

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }

@router.post("/refresh", response_model=Token)
def refresh_token(token_data: TokenRefresh, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token_data.refresh_token, settings.REFRESH_SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = create_access_token({"sub": str(user.id)})
    new_refresh_token = create_refresh_token({"sub": str(user.id)})

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer"
    }

@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}

@router.delete("/delete")
def delete_auth_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"status": "success", "message": "Account successfully deleted"}

@router.delete("/delete-account", status_code=200)
def delete_account(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if hasattr(models, 'Favorite'):
        db.query(models.Favorite).filter(models.Favorite.user_id == current_user.id).delete()
    if hasattr(models, 'Playlist'):
        db.query(models.Playlist).filter(models.Playlist.user_id == current_user.id).delete()
    if hasattr(models, 'History'):
        db.query(models.History).filter(models.History.user_id == current_user.id).delete()
    if hasattr(models, 'Download'):
        db.query(models.Download).filter(models.Download.user_id == current_user.id).delete()
    if hasattr(models, 'Setting'):
        db.query(models.Setting).filter(models.Setting.user_id == current_user.id).delete()

    db.delete(current_user)
    db.commit()
    return {"message": "User successfully deleted from database"}


