from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base

class User(Base):
    __tablename__ = 'users'

    id: Mapped[int] = mapped_column(primary_key = True)
    username: Mapped[str] = mapped_column(String(20), unique = True, index = True)
    password_hash: Mapped[str] = mapped_column(String(100))
    nickname: Mapped[str] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.now)

    stories: Mapped[list['Story']] = relationship(back_populates = 'user', cascade = 'all, delete-orphan')

class Story(Base):
    __tablename__ = 'stories'

    id: Mapped[int] = mapped_column(primary_key = True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index = True)
    title: Mapped[str] = mapped_column(String(100))
    prompt: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    is_public: Mapped[bool] = mapped_column(Boolean, default = False, index = True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.now, onupdate = datetime.now)

    user: Mapped[User] = relationship(back_populates = 'stories')
    likes: Mapped[list['Like']] = relationship(cascade = 'all, delete-orphan')

class Like(Base):
    __tablename__ = 'likes'
    __table_args__ = (UniqueConstraint('user_id', 'story_id'),)

    id: Mapped[int] = mapped_column(primary_key = True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id'), index = True)
    story_id: Mapped[int] = mapped_column(ForeignKey('stories.id'), index = True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default = datetime.now)
