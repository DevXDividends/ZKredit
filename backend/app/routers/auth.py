from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.db_models import User
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.google_auth import verify_google_token
from app.schemas import SignupRequest, LoginRequest, GoogleAuthRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        auth_provider=user.auth_provider,
    )


@router.post("/signup", response_model=TokenResponse)
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        auth_provider="local",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    idinfo = verify_google_token(payload.credential)
    google_id = idinfo["sub"]
    email = idinfo["email"]
    full_name = idinfo.get("name")

    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        # If a local-password account already exists with this email, link
        # the Google identity to it rather than creating a duplicate account.
        user = db.query(User).filter(User.email == email).first()
        if user:
            user.google_id = google_id
        else:
            user = User(email=email, full_name=full_name, google_id=google_id, auth_provider="google")
            db.add(user)
        db.commit()
        db.refresh(user)

    token = create_access_token(user.id, user.email)
    return TokenResponse(access_token=token, user=_user_response(user))


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return _user_response(current_user)