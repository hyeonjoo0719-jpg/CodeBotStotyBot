import os, sys
import threading

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.abspath(os.path.join(BASE_DIR, '..', '..'))
sys.path.append(ROOT_DIR)

from storybot.model import GPT
from storybot.tokenizer import BPETokenizer
from storybot.utils import get_device, generate

model_path = os.path.join(ROOT_DIR, 'storybot', 'model_pretrain.pt')
tokenizer_path = os.path.join(ROOT_DIR, 'storybot', 'merge_rules.pkl')

max_new_tokens = 200
temperature = 1.0

state = {}
# 모델이 KV 캐시 상태를 가지므로 생성은 한 번에 하나씩만 한다
generate_lock = threading.Lock()

def load():
    device = get_device()
    state['tokenizer'] = BPETokenizer.load_from(tokenizer_path)
    state['model'] = GPT.load_from(model_path, device = device)
    print(f'스토리봇 모델 로드 완료 ({device})', flush = True)

def max_prompt_tokens():
    # KV 캐시를 쓰므로 입력 + 생성 토큰이 max_context_len을 넘으면 안 된다
    return state['model'].max_context_len - max_new_tokens

def count_tokens(text):
    return len(state['tokenizer'].encode(text))

def generate_story(prompt):
    with generate_lock:
        return generate(state['model'], state['tokenizer'], prompt, max_new_tokens, temperature)
