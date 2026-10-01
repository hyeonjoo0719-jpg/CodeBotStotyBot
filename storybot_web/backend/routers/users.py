from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from auth import get_current_user, hash_password, verify_password
from database import get_db
from models import User
from schemas import NicknameUpdate, PasswordUpdate, UserResponse

router = APIRouter(prefix = '/api/users', tags = ['users'])

@router.get('/me', response_model = UserResponse)
def read_me(user: User = Depends(get_current_user)):
    return user

@router.patch('/me', response_model = UserResponse)
def update_nickname(req: NicknameUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    user.nickname = req.nickname
    db.commit()
    db.refresh(user)
    return user

@router.put('/me/password', status_code = status.HTTP_204_NO_CONTENT)
def update_password(req: PasswordUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.current_password, user.password_hash):
        raise HTTPException(status_code = status.HTTP_400_BAD_REQUEST, detail = '현재 비밀번호가 올바르지 않습니다.')
    user.password_hash = hash_password(req.new_password)
    db.commit()
    return Response(status_code = status.HTTP_204_NO_CONTENT)
