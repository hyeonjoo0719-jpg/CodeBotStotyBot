import os

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'storybot.db')

engine = create_engine(f'sqlite:///{DB_PATH}', connect_args = {'check_same_thread': False})
SessionLocal = sessionmaker(bind = engine, autoflush = False)

class Base(DeclarativeBase):
    pass

def migrate():
    # 이전 버전 DB(stories.liked 컬럼)를 공개 설정 + likes 테이블 구조로 바꾼다.
    # create_all 이후에 호출해야 likes 테이블이 존재한다.
    columns = {c['name'] for c in inspect(engine).get_columns('stories')}
    with engine.begin() as conn:
        if 'is_public' not in columns:
            conn.execute(text('ALTER TABLE stories ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT 0'))
        if 'liked' in columns:
            conn.execute(text(
                'INSERT OR IGNORE INTO likes (user_id, story_id, created_at) '
                'SELECT user_id, id, updated_at FROM stories WHERE liked = 1'
            ))
            conn.execute(text('ALTER TABLE stories DROP COLUMN liked'))

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
