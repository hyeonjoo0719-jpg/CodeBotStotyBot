from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

class SignupRequest(BaseModel):
    username: str = Field(pattern = r'^[A-Za-z0-9]{4,20}$')
    password: str = Field(min_length = 8, max_length = 64)
    nickname: str = Field(min_length = 1, max_length = 20)

class LoginRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = 'bearer'

class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes = True)

    id: int
    username: str
    nickname: str
    created_at: datetime

class NicknameUpdate(BaseModel):
    nickname: str = Field(min_length = 1, max_length = 20)

class PasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(min_length = 8, max_length = 64)

class StoryCreate(BaseModel):
    prompt: str
    is_public: bool = False

class StoryUpdate(BaseModel):
    title: str | None = Field(default = None, min_length = 1, max_length = 100)
    content: str | None = Field(default = None, min_length = 1)
    is_public: bool | None = None

class StoryResponse(BaseModel):
    id: int
    title: str
    prompt: str
    content: str
    is_public: bool
    author_nickname: str
    is_mine: bool
    liked: bool
    like_count: int
    created_at: datetime
    updated_at: datetime

class StoryPage(BaseModel):
    items: list[StoryResponse]
    page: int
    size: int
    total: int
    total_pages: int
