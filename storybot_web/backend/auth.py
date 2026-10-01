import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User

SECRET_KEY = os.environ.get('STORYBOT_SECRET_KEY', 'storybot-dev-secret-key-change-me')
ALGORITHM = 'HS256'
ACCESS_TOKEN_EXPIRE_HOURS = 24

bearer_scheme = HTTPBearer(auto_error = False)

def hash_password(password):
    # bcrypt는 72바이트까지만 처리한다
    return bcrypt.hashpw(password.encode('utf-8')[:72], bcrypt.gensalt()).decode('utf-8')

def verify_password(password, password_hash):
    return bcrypt.checkpw(password.encode('utf-8')[:72], password_hash.encode('utf-8'))

def create_access_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(hours = ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {'sub': str(user_id), 'exp': expire}
    return jwt.encode(payload, SECRET_KEY, algorithm = ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
):
    unauthorized = HTTPException(
        status_code = status.HTTP_401_UNAUTHORIZED,
        detail = '로그인이 필요합니다.',
        headers = {'WWW-Authenticate': 'Bearer'},
    )
    if credentials is None:
        raise unauthorized
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms = [ALGORITHM])
        user_id = int(payload['sub'])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)
    if user is None:
        raise unauthorized
    return user
