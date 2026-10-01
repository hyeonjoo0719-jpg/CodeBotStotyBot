from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import create_access_token, hash_password, verify_password
from database import get_db
from models import User
from schemas import LoginRequest, SignupRequest, TokenResponse, UserResponse

router = APIRouter(prefix = '/api/auth', tags = ['auth'])

@router.post('/signup', response_model = UserResponse, status_code = status.HTTP_201_CREATED)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    if db.scalar(select(User).where(User.username == req.username)):
        raise HTTPException(status_code = status.HTTP_409_CONFLICT, detail = '이미 사용 중인 아이디입니다.')

    user = User(username = req.username, password_hash = hash_password(req.password), nickname = req.nickname)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.post('/login', response_model = TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == req.username))
    if user is None or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code = status.HTTP_401_UNAUTHORIZED, detail = '아이디 또는 비밀번호가 올바르지 않습니다.')
    return TokenResponse(access_token = create_access_token(user.id))
