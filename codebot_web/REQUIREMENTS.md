# 코드봇 웹서비스 요구사항 명세서

## 1. 개요

### 1.1 목적
사용자가 입력창에 파이썬 코드의 앞부분을 작성하고 버튼을 누르면, 기존에 직접 학습시킨 코드봇(GPT) 모델이 뒷부분을 이어서 생성하고 그 결과를 화면에 출력하는 웹서비스를 만든다.

### 1.2 범위
- **최소 기능 확인(MVP)** 이 목적이다. 아래 명시된 기능 외에는 만들지 않는다.
- 회원가입/로그인 없이 누구나 사용한다.
- 코드봇의 기존 소스(`codebot/`)를 **수정 없이 import 하여 그대로 사용**한다.

### 1.3 기술 스택
| 구분 | 기술 |
|---|---|
| 백엔드 | Python, FastAPI, Uvicorn |
| 모델 | PyTorch (기존 `codebot/model.py`, `codebot/tokenizer.py`, `codebot/utils.py`) |
| 프론트엔드 | React (Vite, JavaScript) |
| 연동 | Vite 개발 서버 프록시 (`/api` → FastAPI) |

---

## 2. 기존 코드 분석 결과

### 2.1 사용하는 기존 코드
| 파일 | 사용 대상 | 용도 |
|---|---|---|
| `codebot/model.py` | `GPT.load_from(file_path, device)` | 체크포인트에서 모델 로드 |
| `codebot/tokenizer.py` | `BPETokenizer.load_from(filepath)`, `encode()`, `end_token_id` | 토크나이저 로드, 입력 토큰 수 계산 |
| `codebot/utils.py` | `generate(model, tokenizer, prompt, max_new_tokens, temperature)`, `get_device()` | 코드 생성, 디바이스 선택 |
| `codebot/model_pretrain.pt` | — | 사용할 모델 체크포인트 |
| `codebot/merg_rules.pkl` | — | BPE 병합 규칙 (`merg_ruled.pkl`과 내용 동일) |

사용 패턴은 `3.ipynb`의 방식(`GPT.load_from` / `BPETokenizer.load_from` / `get_device` → `generate`)을 따른다.

### 2.2 사용하지 않는 기존 코드 (웹서비스에서 제외)
- `tokenizer.py`의 `train_bpe`, `count_pairs` 등 학습용 함수
- `model.py`의 `save()`
- 학습 데이터(`tiny_codes.txt`, `tiny_code.bin`, `tiny_codes_sft.json`)
- `model_sft.pt`, `model_grpo.pt`
- `3.ipynb`의 학습 루프(`get_lr`, `get_batch`, `evaluate`)

### 2.3 모델 설정값 (체크포인트에서 확인)
| 항목 | 값 |
|---|---|
| `vocab_size` | 1000 (end token id = 999, `<\|endoftext\|>`) |
| `max_context_len` | **256** |
| `embed_dim` / `n_head` / `n_layer` / `ff_dim` | 384 / 6 / 6 / 1536 |

### 2.4 입력 제한의 근거
- 모델의 위치 임베딩(`pos_embed`)은 `max_context_len = 256`개만 존재한다.
- `generate()`는 입력이 256토큰을 넘으면 `ids[:, -256:]`로 **앞부분을 잘라** 사용하므로, 256토큰을 초과한 입력은 사용자 의도와 다르게 앞부분이 무시된다.
- 입력이 0토큰(빈 문자열)이면 모델 입력 길이가 0이 되어 생성이 불가능하다.
- 따라서 **입력은 토크나이저 기준 1 ~ 256 토큰**으로 제한한다. (글자 수가 아닌 토큰 수 기준)

---

## 3. 기능 요구사항

### FR-1. 코드 입력
- 화면에 여러 줄 입력이 가능한 텍스트 입력창(textarea)을 제공한다.
- 공백·들여쓰기·줄바꿈은 그대로 서버에 전달한다. (trim 하지 않음)

### FR-2. 생성 요청
- "생성" 버튼을 클릭하면 입력 내용을 백엔드 API로 전송한다.
- 요청 처리 중에는 버튼을 비활성화하고 "생성 중..." 상태를 표시한다.

### FR-3. 입력 검증 (백엔드)
- 백엔드는 `tokenizer.encode(code)`로 토큰 수를 계산한다.
- 토큰 수가 0이거나 256을 초과하면 생성하지 않고 **HTTP 400** 에러를 반환한다.
- 프론트엔드는 토큰 수를 계산하지 않으며, 백엔드 에러 메시지를 화면에 표시만 한다.

### FR-4. 코드 생성
- 검증을 통과하면 기존 `generate()`를 다음 고정 파라미터로 호출한다.

| 파라미터 | 값 | 비고 |
|---|---|---|
| `max_new_tokens` | 200 | 서버 고정, 사용자 조절 UI 없음 |
| `temperature` | 0 | 그리디 디코딩 — 같은 입력이면 항상 같은 결과 |

- 생성은 `<|endoftext|>` 토큰이 나오거나 200토큰에 도달하면 종료된다. (기존 `generate()` 동작)

### FR-5. 결과 출력
- `generate()`의 반환값(**입력 + 생성된 뒷부분 전체**)을 가공 없이 화면에 출력한다.
- 코드 형태가 유지되도록 고정폭 글꼴, 공백/줄바꿈 보존(`<pre>`)으로 표시한다.

### FR-6. 에러 표시
- 입력 검증 실패(400) 또는 서버 오류(500) 시 에러 메시지를 결과 영역 대신 표시한다.

---

## 4. API 명세

### `POST /api/generate`

**Request Body**
```json
{
  "code": "def add(a, b):\n"
}
```

**Response 200**
```json
{
  "result": "def add(a, b):\n    return a + b\n"
}
```

**Response 400** (입력 토큰 수 범위 초과)
```json
{
  "detail": "입력은 1~256 토큰이어야 합니다. (현재 312 토큰)"
}
```

이외의 API는 만들지 않는다.

---

## 5. 백엔드 요구사항

- **BE-1. 모델 1회 로드**: 서버 시작 시(FastAPI lifespan) 모델과 토크나이저를 한 번만 로드하여 메모리에 유지한다. 요청마다 로드하지 않는다.
  - 디바이스: 기존 `get_device()` 사용 (CUDA 가능 시 GPU, 아니면 CPU)
- **BE-2. 기존 코드 import**: 프로젝트 루트를 `sys.path`에 추가하여 `from codebot.model import GPT` 형태로 import 한다. `codebot/` 내부 파일은 수정하지 않는다.
- **BE-3. 경로**: 모델/토크나이저 경로는 `codebot_web/backend/main.py` 파일 위치 기준 상대경로로 계산한다. (실행 위치와 무관하게 동작)
- **BE-4. 동기 엔드포인트**: `generate()`는 동기 함수이므로 엔드포인트를 `def`로 정의하여 FastAPI 스레드풀에서 실행한다.
- **BE-5. 요청 검증**: Pydantic 모델로 `code: str` 필드를 받는다. 토큰 수 검증은 FR-3을 따른다.

---

## 6. 프론트엔드 요구사항

- **FE-1.** 단일 페이지, 단일 컴포넌트(`App.jsx`)로 구성한다. 라우팅 없음.
- **FE-2.** 화면 구성 (위 → 아래)
  1. 제목: "CodeBot"
  2. 코드 입력창 (textarea, 고정폭 글꼴)
  3. "생성" 버튼
  4. 결과 출력 영역 (`<pre>`) 또는 에러 메시지
- **FE-3.** API 호출은 브라우저 내장 `fetch`를 사용한다. (axios 등 추가 라이브러리 없음)
- **FE-4.** Vite 개발 서버의 `server.proxy`로 `/api` 요청을 `http://localhost:8000`으로 전달한다. (CORS 설정 불필요)

---

## 7. 폴더 구조

```
CodeBotStotyBot/
├── codebot/                  # 기존 코드 (수정하지 않음)
│   ├── model.py
│   ├── tokenizer.py
│   ├── utils.py
│   ├── model_pretrain.pt
│   └── merg_rules.pkl
└── codebot_web/
    ├── REQUIREMENTS.md       # 본 문서
    ├── backend/
    │   ├── main.py           # FastAPI 앱
    │   └── requirements.txt  # fastapi, uvicorn, torch, regex, tqdm
    └── frontend/
        ├── package.json
        ├── vite.config.js    # /api 프록시 설정
        ├── index.html
        └── src/
            ├── main.jsx
            └── App.jsx
```

---

## 8. 실행 방법

| 구분 | 명령 | 주소 |
|---|---|---|
| 백엔드 | `cd codebot_web/backend` → `uvicorn main:app --port 8000` | http://localhost:8000 |
| 프론트엔드 | `cd codebot_web/frontend` → `npm install` → `npm run dev` | http://localhost:5173 |

- 백엔드는 기존 `.venv` 가상환경을 사용하고, `fastapi`, `uvicorn`만 추가 설치한다. (torch, regex, tqdm은 설치되어 있음)

---

## 9. 비기능 요구사항

- 인증/인가 없음 (누구나 접근)
- 데이터베이스, 생성 이력 저장 없음
- 동시 요청 처리 최적화, 요청 큐, 속도 제한(rate limit) 없음
- 배포 설정 없음 — 로컬 실행만 대상

---

## 10. 제외 범위 (만들지 않는 것)

- 회원가입 / 로그인
- 모델 선택(pretrain / sft / grpo 전환)
- `max_new_tokens`, `temperature` 조절 UI
- 실시간 토큰 수 표시
- 스트리밍 출력(토큰 단위 표시)
- 문법 하이라이팅, 결과 복사 버튼, 생성 이력
- SFT 형식(instruction/response) 대화 기능
- 모델 학습 / 토크나이저 학습 기능

---

## 11. 완료 기준 (최소 기능 확인)

1. 백엔드 실행 시 모델이 오류 없이 로드된다.
2. 입력창에 코드 앞부분(예: `for i in range(`)을 입력하고 "생성"을 누르면 입력 + 이어진 코드가 화면에 출력된다.
3. 같은 입력으로 다시 생성하면 같은 결과가 나온다. (temperature 0)
4. 빈 입력 또는 256토큰 초과 입력 시 에러 메시지가 표시되고 생성되지 않는다.

---

## 12. 결정사항 기록

| 항목 | 결정 |
|---|---|
| 모델 체크포인트 | `model_pretrain.pt` |
| 입력 제한 | 1~256 토큰, 초과 시 백엔드에서 400 거부 (프론트는 메시지만 표시) |
| 생성 파라미터 | `max_new_tokens=200`, `temperature=0` (서버 고정) |
| 출력 형태 | `generate()` 반환값 그대로 (입력 + 생성 전체) |
| 프로젝트 위치 | `codebot_web/` |
| 프론트엔드 | Vite + JavaScript, `/api` 프록시 방식 |
