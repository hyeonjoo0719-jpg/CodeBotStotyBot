# 스토리봇 웹서비스 요구사항 명세서

## 1. 개요

### 1.1 목적
로그인한 사용자가 이야기의 시작 문장을 입력하면, 직접 학습시킨 스토리봇(GPT) 모델이 뒷이야기를 이어서 만들어 준다. 만든 스토리는 자동으로 저장되고, 사용자는 자기 스토리 기록을 보고, 고치고, 지우고, 좋아요를 누를 수 있다. 공개로 설정한 스토리는 메인 화면의 "모두의 이야기"에서 다른 사용자도 읽고 좋아요를 누를 수 있다.

### 1.2 범위
- 회원가입, 로그인, 로그아웃, 회원정보 수정, 로그인 유지(JWT)
- 로그인한 사용자만 스토리 생성과 기록 기능을 쓸 수 있다.
- 스토리 기록: 페이지네이션, 내 스토리만 보기, 수정, 삭제, 좋아요 토글
- 공개 피드: 공개 설정한 스토리를 메인 화면에서 모든 사용자가 읽고 좋아요 (v2 추가)
- 스토리봇 기존 소스(`storybot/`)는 **수정하지 않고 import 하여 그대로 사용**한다.
- 화면은 **파스텔톤(핑크 + 라벤더)** 으로 꾸민다.

### 1.3 기술 스택
| 구분 | 기술 |
|---|---|
| 백엔드 | Python, FastAPI, Uvicorn |
| DB | SQLite (`storybot.db` 파일) + SQLAlchemy 2.x |
| 인증 | JWT (PyJWT), 비밀번호 해시 bcrypt |
| 모델 | PyTorch (기존 `storybot/model.py`, `storybot/tokenizer.py`, `storybot/utils.py`) |
| 프론트엔드 | React (Vite, JavaScript), react-router-dom |
| 연동 | Vite 개발 서버 프록시 (`/api` → FastAPI) |

---

## 2. 기존 코드 분석 결과

### 2.1 사용하는 기존 코드
| 파일 | 사용 대상 | 용도 |
|---|---|---|
| `storybot/model.py` | `GPT.load_from(file_path, device)` | 체크포인트에서 모델 로드 |
| `storybot/tokenizer.py` | `BPETokenizer.load_from(filepath)`, `encode()` | 토크나이저 로드, 입력 토큰 수 계산 |
| `storybot/utils.py` | `generate(model, tokenizer, prompt, max_new_tokens, temperature)`, `get_device()` | 스토리 생성, 디바이스 선택 |
| `storybot/model_pretrain.pt` | — | 사용할 모델 (10000 iter 학습, 04_storybot 평가에서 점수가 가장 높음) |
| `storybot/merge_rules.pkl` | — | BPE 병합 규칙 |

사용 패턴은 `04_storybot.ipynb`의 생성 셀(`BPETokenizer.load_from` → `GPT.load_from` → `generate`)을 따른다.

> `04_storybot.ipynb`에서 만든 `model_dpo.pt`는 `storybot/` 폴더에 없으므로 사용하지 않는다.

### 2.2 사용하지 않는 기존 코드
- `train_bpe`, `encode_file` 등 학습/전처리 함수, `GPT.save()`
- 학습 데이터(`tiny_stories_*.txt/.bin`, `tiny_stories_dpo.json`), `model_iter_500.pt`, `model_iter_5000.pt`
- 노트북의 학습 루프, DPO 학습, OpenAI 평가 코드

### 2.3 모델 설정값 (체크포인트에서 확인)
| 항목 | 값 |
|---|---|
| `vocab_size` | 10000 |
| `max_context_len` | **256** |
| `embed_dim` / `n_head` / `n_layer` / `ff_dim` / `theta` | 512 / 16 / 4 / 1344 / 10000 |
| 학습 데이터 | TinyStories (영어 어린이 동화) → **영어 입력만 의미 있는 결과** |

### 2.4 입력 제한의 근거
- `generate()`는 **KV 캐시**를 쓴다. 입력 `ids`를 256토큰으로 잘라도 캐시(`k_cache`, `v_cache`)는 계속 커진다.
- RoPE 캐시는 256개 위치만 있어서, `입력 + 생성 토큰`이 256을 넘으면 위치 정보가 틀어진다.
- 따라서 **입력 토큰 + max_new_tokens ≤ 256** 이 되도록 한다.
  - `max_new_tokens = 200` → 시작 문장은 **1 ~ 56 토큰**
- 공백만 있는 입력은 거부한다.

---

## 3. 기능 요구사항

### 3.1 회원
| ID | 기능 | 내용 |
|---|---|---|
| U-1 | 회원가입 | 아이디, 비밀번호, 닉네임을 입력해 가입한다. 아이디는 중복될 수 없다. |
| U-2 | 로그인 | 아이디와 비밀번호가 맞으면 JWT 액세스 토큰(유효기간 24시간)을 발급한다. |
| U-3 | 로그인 유지 | 프론트엔드는 토큰을 `localStorage`에 저장한다. 새로고침해도 로그인 상태가 유지된다. |
| U-4 | 로그아웃 | 프론트엔드에서 토큰을 삭제하고 로그인 화면으로 이동한다. |
| U-5 | 내 정보 조회 | 토큰으로 내 아이디, 닉네임을 조회한다. |
| U-6 | 닉네임 변경 | 새 닉네임으로 변경한다. |
| U-7 | 비밀번호 변경 | 현재 비밀번호가 맞을 때만 새 비밀번호로 변경한다. |
| U-8 | 접근 제한 | 회원가입·로그인을 뺀 모든 API는 `Authorization: Bearer <token>` 헤더가 필요하다. 토큰이 없거나 만료되면 401을 반환하고, 프론트는 토큰을 지운 뒤 로그인 화면으로 보낸다. |

**입력 규칙**
| 항목 | 규칙 |
|---|---|
| 아이디 | 영문/숫자 4~20자, 변경 불가 |
| 비밀번호 | 8~64자, bcrypt 해시로 저장 |
| 닉네임 | 1~20자 |

### 3.2 스토리 생성
| ID | 기능 | 내용 |
|---|---|---|
| S-1 | 시작 문장 입력 | 영어 시작 문장(예: `Once upon a time`)을 입력하고 "이야기 만들기" 버튼을 누른다. |
| S-2 | 입력 검증 | 백엔드에서 토큰 수가 1~56이 아니면 400을 반환한다. |
| S-3 | 생성 | `generate(model, tokenizer, prompt, max_new_tokens=200, temperature=1.0)` 호출. 매번 다른 이야기가 나온다. |
| S-4 | 자동 저장 | 생성 즉시 DB에 저장한다. 제목 = 시작 문장(최대 100자), 본문 = `generate()` 반환값 전체 |
| S-5 | 결과 표시 | 생성된 스토리를 화면에 보여 주고, 기록 상세로 이동할 수 있다. |

### 3.3 스토리 기록
| ID | 기능 | 내용 |
|---|---|---|
| H-1 | 목록 | **내 스토리만** 최신순으로 보여 준다. 카드에 제목, 본문 미리보기, 작성일, 공개 여부, 좋아요 상태/개수 표시 |
| H-2 | 페이지네이션 | 한 페이지에 **6개**, 번호 페이지 이동(이전/다음 포함) |
| H-3 | 상세 | 스토리 전체 본문과 작성자를 보여 준다. |
| H-4 | 수정 | 제목(1~100자)과 본문(1자 이상)을 수정한다. **본인 스토리만** |
| H-5 | 삭제 | 확인 창을 거쳐 삭제한다. **본인 스토리만** |
| H-6 | 좋아요 | 하트 버튼을 한 번 누르면 좋아요, 다시 누르면 취소(토글). **유저별로 기록**하고 좋아요 개수를 표시한다. 목록·피드·상세 모두에서 가능 |
| H-7 | 권한 | 다른 사람의 **비공개** 스토리를 조회/수정/삭제/좋아요 하면 **404**(존재 여부 숨김). 다른 사람의 **공개** 스토리를 수정/삭제하면 **403** |

### 3.4 공개 설정 / 모두의 이야기 (v2 추가)
| ID | 기능 | 내용 |
|---|---|---|
| P-1 | 공개 설정 | 스토리마다 공개/비공개를 가진다. **기본은 비공개.** 만들기 화면의 토글로 생성 시 정하고, 상세 화면에서 언제든 바꿀 수 있다. |
| P-2 | 모두의 이야기 | 메인(`/`) 만들기 폼 아래에 **공개된 스토리 전체**(내 것 포함)를 최신순 카드 목록으로 보여 준다. 카드에 작성자 닉네임(내 글이면 "나" 표시)과 좋아요 개수 표시. 6개/페이지 |
| P-3 | 읽기 전용 상세 | 피드의 카드를 누르면 상세 페이지로 이동한다. 다른 사람 글은 읽기와 좋아요만 가능하고 수정/삭제/공개 설정 버튼은 보이지 않는다. |
| P-4 | 기존 데이터 | 이전 버전 DB는 서버 시작 시 자동 변환한다. 기존 스토리는 모두 비공개, 기존 좋아요는 작성자의 좋아요로 옮긴다. |

---

## 4. 데이터 모델

### users
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| username | VARCHAR(20) | UNIQUE, NOT NULL |
| password_hash | VARCHAR | NOT NULL |
| nickname | VARCHAR(20) | NOT NULL |
| created_at | DATETIME | |

### stories
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | NOT NULL |
| title | VARCHAR(100) | NOT NULL |
| prompt | TEXT | 생성에 쓴 시작 문장 |
| content | TEXT | NOT NULL |
| is_public | BOOLEAN | 기본 false |
| created_at | DATETIME | |
| updated_at | DATETIME | |

### likes (v2 추가, 기존 `stories.liked` 컬럼 대체)
| 컬럼 | 타입 | 비고 |
|---|---|---|
| id | INTEGER PK | |
| user_id | INTEGER FK → users.id | 좋아요 누른 사람 |
| story_id | INTEGER FK → stories.id | 스토리 삭제 시 함께 삭제 |
| created_at | DATETIME | |
| | | UNIQUE(user_id, story_id) |

---

## 5. API 명세

모든 경로는 `/api`로 시작한다. 🔒 표시는 토큰이 필요한 API이다.

| Method | Path | 설명 | 요청 | 응답 |
|---|---|---|---|---|
| POST | `/api/auth/signup` | 회원가입 | `{username, password, nickname}` | 201 `User` / 409 아이디 중복 |
| POST | `/api/auth/login` | 로그인 | `{username, password}` | 200 `{access_token, token_type}` / 401 |
| GET | `/api/users/me` 🔒 | 내 정보 | — | `User` |
| PATCH | `/api/users/me` 🔒 | 닉네임 변경 | `{nickname}` | `User` |
| PUT | `/api/users/me/password` 🔒 | 비밀번호 변경 | `{current_password, new_password}` | 204 / 400 현재 비밀번호 불일치 |
| POST | `/api/stories` 🔒 | 스토리 생성 + 저장 | `{prompt, is_public?}` | 201 `Story` / 400 토큰 수 범위 초과 |
| GET | `/api/stories?page=1` 🔒 | 내 스토리 목록 | — | `{items: Story[], page, size, total, total_pages}` |
| GET | `/api/stories/feed?page=1` 🔒 | 공개 스토리 목록 (v2) | — | `{items: Story[], page, size, total, total_pages}` |
| GET | `/api/stories/{id}` 🔒 | 상세 (내 것 또는 공개) | — | `Story` / 404 |
| PATCH | `/api/stories/{id}` 🔒 | 수정 (보낸 필드만) | `{title?, content?, is_public?}` | `Story` / 403 / 404 |
| DELETE | `/api/stories/{id}` 🔒 | 삭제 | — | 204 / 403 / 404 |
| POST | `/api/stories/{id}/like` 🔒 | 좋아요 토글 | — | `Story` (바뀐 `liked`, `like_count`) / 404 |

- `User`: `{id, username, nickname, created_at}`
- `Story`: `{id, title, prompt, content, is_public, author_nickname, is_mine, liked, like_count, created_at, updated_at}`
  - `liked`: 요청한 사용자가 좋아요 했는지, `like_count`: 전체 좋아요 수
- 에러 응답: `{"detail": "메시지"}`

---

## 6. 백엔드 요구사항

- **BE-1.** 서버 시작 시(lifespan) 모델과 토크나이저를 한 번만 로드하고, DB 테이블을 만든다.
- **BE-2.** 프로젝트 루트를 `sys.path`에 추가해 `from storybot.model import GPT` 형태로 import 한다. `storybot/` 파일은 수정하지 않는다.
- **BE-3.** 모델은 KV 캐시 상태를 가지고 있으므로, 동시 요청이 섞이지 않게 생성 구간을 `threading.Lock`으로 보호한다.
- **BE-4.** 생성 API는 동기 `def`로 정의해 스레드풀에서 실행한다.
- **BE-5.** JWT 비밀키는 환경변수 `STORYBOT_SECRET_KEY`에서 읽고, 없으면 개발용 기본값을 쓴다. 알고리즘 HS256, 만료 24시간.
- **BE-6.** 파일 경로는 `main.py` 위치 기준 상대경로로 계산한다.

---

## 7. 프론트엔드 요구사항

### 7.1 페이지
| 경로 | 페이지 | 접근 |
|---|---|---|
| `/login` | 로그인 | 비로그인 |
| `/signup` | 회원가입 | 비로그인 |
| `/` | 스토리 만들기 + 모두의 이야기 피드 (`?page=N`) | 🔒 |
| `/stories` | 내 스토리 기록 (`?page=N`) | 🔒 |
| `/stories/:id` | 스토리 상세 / 좋아요 (본인 글: 수정 / 삭제 / 공개 설정) | 🔒 |
| `/me` | 회원정보 수정 (닉네임, 비밀번호) | 🔒 |

- 로그인하지 않고 🔒 페이지에 들어가면 `/login`으로 이동한다.
- 로그인한 상태로 `/login`, `/signup`에 들어가면 `/`로 이동한다.
- 상단 바: 로고, 메뉴(만들기 / 내 기록 / 내 정보), 닉네임, 로그아웃 버튼

### 7.2 디자인 (파스텔톤)
| 토큰 | 색상 | 용도 |
|---|---|---|
| 핑크 | `#FFD6E7` / 진한 `#F7A8C8` | 주 버튼, 하트, 강조 |
| 라벤더 | `#E6DDFF` / 진한 `#B9A6F2` | 배경 그라데이션, 보조 버튼 |
| 크림 | `#FFF9FB` | 카드 배경 |
| 텍스트 | `#5B4B6B` | 본문 글자 |

- 배경은 핑크 → 라벤더 부드러운 그라데이션
- 둥근 모서리(16px 이상)의 카드, 은은한 그림자
- 제목 글꼴 `Jua`, 본문 `Nunito` + `Noto Sans KR` (Google Fonts)
- 생성 중에는 로딩 애니메이션 표시
- 휴대폰 너비에서도 깨지지 않게 카드 그리드가 1열로 바뀐다.

---

## 8. 폴더 구조

```
CodeBotStotyBot/
├── storybot/                 # 기존 코드 (수정하지 않음)
└── storybot_web/
    ├── REQUIREMENTS.md
    ├── backend/
    │   ├── main.py           # FastAPI 앱, lifespan
    │   ├── database.py       # SQLAlchemy 엔진/세션, 이전 DB 변환(migrate)
    │   ├── models.py         # User, Story, Like
    │   ├── schemas.py        # Pydantic 요청/응답
    │   ├── auth.py           # 비밀번호 해시, JWT, 현재 사용자
    │   ├── storybot_service.py  # 모델 로드, 토큰 검증, 생성
    │   ├── routers/
    │   │   ├── auth.py
    │   │   ├── users.py
    │   │   └── stories.py
    │   └── requirements.txt
    └── frontend/
        ├── package.json, vite.config.js, index.html
        └── src/
            ├── main.jsx, App.jsx, api.js, AuthContext.jsx, utils.js, index.css
            ├── components/ (NavBar, RouteGuards, Pagination, HeartButton, StoryCard, StoryGrid)
            └── pages/ (Login, Signup, Create, StoryList, StoryDetail, Profile)
```

---

## 9. 실행 방법

| 구분 | 명령 | 주소 |
|---|---|---|
| 백엔드 | `cd storybot_web/backend` → `..\..\.venv\Scripts\python -m uvicorn main:app --port 8001` | http://localhost:8001 |
| 프론트엔드 | `cd storybot_web/frontend` → `npm install` → `npm run dev` | http://localhost:5174 |

- 코드봇 웹서비스(8000/5173)와 동시에 띄울 수 있도록 포트를 다르게 쓴다.
- 기존 `.venv`에 `fastapi`, `uvicorn`, `sqlalchemy`, `pyjwt`, `bcrypt`를 설치한다.

---

## 10. 제외 범위

- 이메일 인증, 비밀번호 찾기, 소셜 로그인, 회원탈퇴
- 리프레시 토큰, 서버 측 토큰 폐기(로그아웃은 클라이언트에서 토큰 삭제)
- 댓글, 팔로우, 좋아요순 정렬, 좋아요 누른 사람 목록
- 생성 파라미터(temperature, 길이) 조절 UI, 모델 선택, 스트리밍 출력
- 검색, 정렬 변경, 좋아요 필터
- 배포 설정

---

## 11. 완료 기준

1. 회원가입 → 로그인 → 새로고침해도 로그인이 유지된다.
2. 로그인하지 않으면 스토리 기능 화면/API에 접근할 수 없다(401 → 로그인 화면).
3. 시작 문장을 입력하면 스토리가 생성되어 화면에 나오고, 기록 목록에 자동으로 추가된다.
4. 57토큰 이상이거나 빈 입력은 에러 메시지가 나오고 생성되지 않는다.
5. 기록 목록이 6개씩 나뉘어 페이지 이동이 된다.
6. 내 기록에는 내 스토리만 나온다. 다른 사용자의 비공개 스토리에 직접 접근하면 404가 나온다.
7. 스토리 제목/본문 수정, 삭제가 된다. 다른 사람의 공개 스토리는 수정/삭제할 수 없다(403, 버튼 없음).
8. 하트를 한 번 누르면 좋아요, 다시 누르면 취소된다. 여러 사람이 누르면 개수가 늘어난다.
9. 닉네임 변경, 비밀번호 변경(현재 비밀번호 확인)이 된다.
10. 로그아웃하면 로그인 화면으로 이동하고 보호된 페이지에 들어갈 수 없다.
11. 공개로 만든 스토리는 다른 사용자의 메인 화면 "모두의 이야기"에 작성자 닉네임과 함께 나오고, 비공개로 바꾸면 사라진다.

---

## 12. 결정사항 기록

| 항목 | 결정 |
|---|---|
| 모델 | `storybot/model_pretrain.pt` |
| 생성 설정 | 시작 문장 1~56토큰, `max_new_tokens=200`, `temperature=1.0` |
| 저장 | 생성 즉시 자동 저장 |
| 좋아요 | ~~내 스토리에 내가 누르는 토글~~ → (v2) 누구나 볼 수 있는 스토리에 좋아요, 유저별 `likes` 테이블 + 개수 표시 |
| 공개 범위 (v2) | 공개 설정한 스토리만, 기본 비공개 |
| 피드 위치 (v2) | 메인(`/`) 만들기 폼 아래 "모두의 이야기", 6개/페이지 |
| 다른 사람 글 상세 (v2) | 읽기 전용 상세 페이지 (좋아요만 가능) |
| 토큰 | JWT 액세스 토큰, 24시간, `localStorage` |
| 회원정보 | 아이디/비밀번호/닉네임, 닉네임·비밀번호 변경 가능, 아이디 변경 불가 |
| 스토리 수정 | 제목 + 본문 |
| DB | SQLite + SQLAlchemy, bcrypt |
| 디자인 | 파스텔 핑크 + 라벤더, 기록 6개/페이지 |
| 위치 / 프론트 | `storybot_web/`, Vite + JS + react-router-dom, `/api` 프록시 |
