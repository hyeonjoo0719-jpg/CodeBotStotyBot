import math
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

import storybot_service
from auth import get_current_user
from database import get_db
from models import Like, Story, User
from schemas import StoryCreate, StoryPage, StoryResponse, StoryUpdate

router = APIRouter(prefix = '/api/stories', tags = ['stories'])

PAGE_SIZE = 6

def to_responses(stories, user, db):
    # 좋아요 수와 내가 좋아요 했는지를 한 번에 조회
    ids = [s.id for s in stories]
    counts = dict(db.execute(
        select(Like.story_id, func.count()).where(Like.story_id.in_(ids)).group_by(Like.story_id)
    ).all()) if ids else {}
    my_likes = set(db.scalars(
        select(Like.story_id).where(Like.story_id.in_(ids), Like.user_id == user.id)
    ).all()) if ids else set()

    return [
        StoryResponse(
            id = s.id,
            title = s.title,
            prompt = s.prompt,
            content = s.content,
            is_public = s.is_public,
            author_nickname = s.user.nickname,
            is_mine = s.user_id == user.id,
            liked = s.id in my_likes,
            like_count = counts.get(s.id, 0),
            created_at = s.created_at,
            updated_at = s.updated_at,
        )
        for s in stories
    ]

def to_response(story, user, db):
    return to_responses([story], user, db)[0]

def get_visible_story(story_id, user, db):
    story = db.get(Story, story_id)
    # 다른 사람의 비공개 스토리는 존재 여부를 숨기기 위해 404
    if story is None or (story.user_id != user.id and not story.is_public):
        raise HTTPException(status_code = status.HTTP_404_NOT_FOUND, detail = '스토리를 찾을 수 없습니다.')
    return story

def get_my_story(story_id, user, db):
    story = get_visible_story(story_id, user, db)
    if story.user_id != user.id:
        raise HTTPException(status_code = status.HTTP_403_FORBIDDEN, detail = '내 스토리만 수정/삭제할 수 있습니다.')
    return story

def paginate(query, count_query, page, user, db):
    total = db.scalar(count_query)
    items = db.scalars(
        query.options(joinedload(Story.user))
        .order_by(Story.created_at.desc(), Story.id.desc())
        .offset((page - 1) * PAGE_SIZE)
        .limit(PAGE_SIZE)
    ).all()
    return StoryPage(items = to_responses(items, user, db), page = page, size = PAGE_SIZE, total = total,
                     total_pages = max(1, math.ceil(total / PAGE_SIZE)))

@router.post('', response_model = StoryResponse, status_code = status.HTTP_201_CREATED)
def create_story(req: StoryCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    max_tokens = storybot_service.max_prompt_tokens()
    num_tokens = storybot_service.count_tokens(req.prompt) if req.prompt.strip() else 0
    if num_tokens < 1 or num_tokens > max_tokens:
        raise HTTPException(
            status_code = status.HTTP_400_BAD_REQUEST,
            detail = f'시작 문장은 1~{max_tokens} 토큰이어야 합니다. (현재 {num_tokens} 토큰)',
        )

    content = storybot_service.generate_story(req.prompt)
    now = datetime.now()
    story = Story(user_id = user.id, title = req.prompt.strip()[:100], prompt = req.prompt, content = content,
                  is_public = req.is_public, created_at = now, updated_at = now)
    db.add(story)
    db.commit()
    db.refresh(story)
    return to_response(story, user, db)

@router.get('', response_model = StoryPage)
def list_my_stories(page: int = Query(1, ge = 1), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    condition = Story.user_id == user.id
    return paginate(select(Story).where(condition),
                    select(func.count()).select_from(Story).where(condition), page, user, db)

@router.get('/feed', response_model = StoryPage)
def list_public_stories(page: int = Query(1, ge = 1), user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    condition = Story.is_public.is_(True)
    return paginate(select(Story).where(condition),
                    select(func.count()).select_from(Story).where(condition), page, user, db)

@router.get('/{story_id}', response_model = StoryResponse)
def read_story(story_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return to_response(get_visible_story(story_id, user, db), user, db)

@router.patch('/{story_id}', response_model = StoryResponse)
def update_story(story_id: int, req: StoryUpdate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_my_story(story_id, user, db)
    if req.title is not None:
        story.title = req.title
    if req.content is not None:
        story.content = req.content
    if req.is_public is not None:
        story.is_public = req.is_public
    db.commit()
    db.refresh(story)
    return to_response(story, user, db)

@router.delete('/{story_id}', status_code = status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_my_story(story_id, user, db)
    db.delete(story)
    db.commit()
    return Response(status_code = status.HTTP_204_NO_CONTENT)

@router.post('/{story_id}/like', response_model = StoryResponse)
def toggle_like(story_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    story = get_visible_story(story_id, user, db)
    like = db.scalar(select(Like).where(Like.story_id == story.id, Like.user_id == user.id))
    if like:
        db.delete(like)
    else:
        db.add(Like(user_id = user.id, story_id = story.id))
    db.commit()
    return to_response(story, user, db)
