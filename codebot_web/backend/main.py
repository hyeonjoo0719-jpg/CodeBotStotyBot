import os, sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))
sys.path.append(ROOT_DIR)

from codebot.model import GPT
from codebot.tokenizer import BPETokenizer
from codebot.utils import get_device, generate

model_path = os.path.join(ROOT_DIR, 'codebot', 'model_pretrain.pt')
tokenizer_path = os.path.join(ROOT_DIR, 'codebot', 'merg_rules.pkl')

max_new_tokens = 200
temperature = 0

state = {}

@asynccontextmanager
async def lifespan(app):
    device = get_device()
    state['tokenizer'] = BPETokenizer.load_from(tokenizer_path)
    state['model'] = GPT.load_from(model_path, device = device)
    print(f'모델 로드 완료 ({device})')
    yield
    state.clear()

app = FastAPI(lifespan = lifespan)

class GenerateRequest(BaseModel):
    code: str

class GenerateResponse(BaseModel):
    result: str

@app.post('/api/generate', response_model = GenerateResponse)
def generate_code(req: GenerateRequest):
    model = state['model']
    tokenizer = state['tokenizer']

    num_tokens = len(tokenizer.encode(req.code))
    if num_tokens < 1 or num_tokens > model.max_context_len:
        raise HTTPException(
            status_code = 400,
            detail = f'입력은 1~{model.max_context_len} 토큰이어야 합니다. (현재 {num_tokens} 토큰)'
        )

    result = generate(model, tokenizer, req.code, max_new_tokens = max_new_tokens, temperature = temperature)
    return GenerateResponse(result = result)
