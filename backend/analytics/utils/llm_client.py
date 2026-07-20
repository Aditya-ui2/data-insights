import os
import json
import requests
import time
import threading
import hashlib

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
LLM_SQL_MODEL = os.environ.get("LLM_SQL_MODEL", "llama-3.3-70b-versatile")
LLM_CHAT_MODEL = os.environ.get("LLM_CHAT_MODEL", "llama-3.1-8b-instant")
LLM_FALLBACK_MODEL = os.environ.get("LLM_FALLBACK_MODEL", "gemini-2.5-flash")
LLM_TEMPERATURE = float(os.environ.get("LLM_TEMPERATURE", "0.1"))
LLM_MAX_RETRIES = int(os.environ.get("LLM_MAX_RETRIES", "3"))
LLM_RATE_LIMIT = int(os.environ.get("LLM_RATE_LIMIT", "120"))
LLM_RATE_WINDOW = int(os.environ.get("LLM_RATE_WINDOW", "60"))
LLM_SQL_MAX_TOKENS = int(os.environ.get("LLM_SQL_MAX_TOKENS", "500"))
LLM_CHAT_MAX_TOKENS = int(os.environ.get("LLM_CHAT_MAX_TOKENS", "300"))

# Simple LRU cache: {hash(question + schema_desc): response}
_cache = {}
_CACHE_MAX = int(os.environ.get("LLM_CACHE_SIZE", "50"))

_rate_limiter_lock = threading.Lock()
_rate_limiter_tokens = float(LLM_RATE_LIMIT)
_rate_limiter_last_refill = time.time()

_total_prompt_tokens = 0
_total_completion_tokens = 0
_total_cost_tokens = 0
_token_lock = threading.Lock()
_api_cooldown_until = 0.0

def get_token_usage() -> dict:
    global _total_prompt_tokens, _total_completion_tokens, _total_cost_tokens
    with _token_lock:
        return {
            "prompt_tokens": _total_prompt_tokens,
            "completion_tokens": _total_completion_tokens,
            "total_tokens": _total_prompt_tokens + _total_completion_tokens,
        }

def _log_token_usage(prompt_tokens: int, completion_tokens: int, model: str, endpoint: str):
    global _total_prompt_tokens, _total_completion_tokens, _total_cost_tokens
    with _token_lock:
        _total_prompt_tokens += prompt_tokens
        _total_completion_tokens += completion_tokens
    total = prompt_tokens + completion_tokens
    print(
        f"[Tokens] {endpoint} | model={model} | "
        f"prompt={prompt_tokens} completion={completion_tokens} total={total}",
        flush=True,
    )

def _check_rate_limit():
    global _rate_limiter_tokens, _rate_limiter_last_refill
    with _rate_limiter_lock:
        now = time.time()
        elapsed = now - _rate_limiter_last_refill
        rate = LLM_RATE_LIMIT / LLM_RATE_WINDOW
        _rate_limiter_tokens = min(LLM_RATE_LIMIT, _rate_limiter_tokens + elapsed * rate)
        _rate_limiter_last_refill = now
        if _rate_limiter_tokens < 1:
            sleep_time = (1 - _rate_limiter_tokens) / rate
            print(f"[Rate Limiter] Throttling for {sleep_time:.1f}s...", flush=True)
            time.sleep(sleep_time)
            _rate_limiter_tokens = 0
            _rate_limiter_last_refill = time.time()
        else:
            _rate_limiter_tokens -= 1

def _cache_key(question: str, schema_desc: str, chat_context: str, json_mode: bool) -> str:
    raw = f"{question}||{schema_desc}||{chat_context}||{json_mode}"
    return hashlib.md5(raw.encode()).hexdigest()

def _get_cached(key: str):
    if key in _cache:
        val, _ = _cache[key]
        print(f"[Cache] Hit for key {key[:8]}...", flush=True)
        return val
    return None

def _set_cached(key: str, value: str):
    if len(_cache) >= _CACHE_MAX:
        oldest_key = next(iter(_cache))
        del _cache[oldest_key]
    _cache[key] = (value, time.time())

_COUNT_SYSTEM_MSG = "You are a helpful data analyst. Answer naturally and concisely."
_SQL_SYSTEM_MSG = "You are a spreadsheet analysis engine. Return ONLY valid JSON matching the requested schema."

def call_groq_completions(
    prompt: str,
    json_mode: bool = False,
    model: str = None,
    max_tokens: int = None,
    endpoint: str = "unknown",
) -> str:
    global _api_cooldown_until
    model = model or LLM_SQL_MODEL
    url = "https://api.groq.com/openai/v1/chat/completions"
    active_key = os.environ.get("GROQ_API_KEY") or GROQ_API_KEY
    headers = {
        "Authorization": f"Bearer {active_key}",
        "Content-Type": "application/json",
    }
    system_msg = _SQL_SYSTEM_MSG if json_mode else _COUNT_SYSTEM_MSG
    max_tokens = max_tokens or (LLM_SQL_MAX_TOKENS if json_mode else LLM_CHAT_MAX_TOKENS)
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt},
        ],
        "temperature": LLM_TEMPERATURE,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}
    _check_rate_limit()
    for attempt in range(LLM_MAX_RETRIES):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30.0)
            if response.status_code != 200:
                print(f"[Groq] Status {response.status_code}: {response.text[:300]}", flush=True)
                if response.status_code == 429:
                    _api_cooldown_until = time.time() + 60.0
                    if attempt < LLM_MAX_RETRIES - 1:
                        wait = 2 ** (attempt + 1)
                        print(f"[Groq] Retrying in {wait}s (attempt {attempt+1}/{LLM_MAX_RETRIES})", flush=True)
                        time.sleep(wait)
                        continue
                    raise RuntimeError("Groq rate limit exceeded.")
                response.raise_for_status()
            res_json = response.json()
            usage = res_json.get("usage", {})
            _log_token_usage(
                usage.get("prompt_tokens", 0),
                usage.get("completion_tokens", 0),
                model,
                endpoint,
            )
            return res_json["choices"][0]["message"]["content"]
        except requests.exceptions.HTTPError as e:
            if response.status_code == 429 and attempt < LLM_MAX_RETRIES - 1:
                wait = 2 ** (attempt + 1)
                print(f"[Groq] Retrying in {wait}s (attempt {attempt+1}/{LLM_MAX_RETRIES})", flush=True)
                time.sleep(wait)
                continue
            raise
    raise RuntimeError("Groq rate limit exceeded.")

def generate_content_safe(
    client,
    prompt: str,
    json_mode: bool = False,
    model: str = None,
    max_tokens: int = None,
    endpoint: str = "unknown",
    cache_key: str = None,
) -> str:
    global _api_cooldown_until
    if time.time() < _api_cooldown_until:
        print(f"[LLM Client] API in cooldown state for {int(_api_cooldown_until - time.time())}s, skipping LLM call to save time", flush=True)
        raise RuntimeError("API keys are temporarily cooled down due to rate limits.")

    # Automatically generate md5 hash as cache key if not provided
    cache_key = cache_key or hashlib.md5((prompt + f"||{json_mode}").encode()).hexdigest()

    if cache_key:
        cached = _get_cached(cache_key)
        if cached is not None:
            return cached
    model = model or LLM_CHAT_MODEL
    max_tokens = max_tokens or LLM_CHAT_MAX_TOKENS
    result = None
    active_groq_key = os.environ.get("GROQ_API_KEY") or GROQ_API_KEY
    if active_groq_key:
        try:
            result = call_groq_completions(
                prompt,
                json_mode=json_mode,
                model=model,
                max_tokens=max_tokens,
                endpoint=endpoint,
            )
        except Exception as e:
            print(f"[LLM Client] Groq failed: {e}. Falling back to Gemini...", flush=True)
        if result is not None:
            if cache_key:
                _set_cached(cache_key, result)
            return result
    active_gemini_key = os.environ.get("GEMINI_API_KEY") or GEMINI_API_KEY
    if client and active_gemini_key:
        config = {"max_output_tokens": max_tokens}
        if json_mode:
            config["response_mime_type"] = "application/json"
        for attempt in range(2):
            try:
                res = client.models.generate_content(
                    model=LLM_FALLBACK_MODEL,
                    contents=prompt,
                    config=config,
                )
                prompt_tok = 0
                completion_tok = 0
                if hasattr(res, "usage"):
                    prompt_tok = getattr(res.usage, "prompt_tokens", 0)
                    completion_tok = getattr(res.usage, "completion_tokens", 0)
                _log_token_usage(prompt_tok, completion_tok, LLM_FALLBACK_MODEL, endpoint)
                txt = res.text
                result = txt.strip() if txt is not None else ""
                if cache_key:
                    _set_cached(cache_key, result)
                return result
            except Exception as e:
                err_str = str(e).lower()
                is_rate_limit = "429" in err_str or "resource_exhausted" in err_str
                if is_rate_limit:
                    _api_cooldown_until = time.time() + 60.0
                    if attempt == 0:
                        print(f"[{LLM_FALLBACK_MODEL}] Rate limited. Retrying in 3s...", flush=True)
                        time.sleep(3)
                        continue
                print(f"[{LLM_FALLBACK_MODEL}] Failed: {e}", flush=True)
                break
    raise RuntimeError("Both Groq and Gemini API keys are unavailable or failed.")
