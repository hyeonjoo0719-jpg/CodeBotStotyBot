from contextlib import asynccontextmanager

from fastapi import FastAPI

import models  # 테이블 등록
import storybot_service
from database import Base, engine, migrate
from routers import auth, stories, users

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(bind = engine)
    migrate()
    storybot_service.load()
    yield

app = FastAPI(lifespan = lifespan)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stories.router)
