"""Minimal OpenRouter client. Supports non-streaming completions with fallbacks."""
import os
import json
import httpx
from typing import List, Dict, Any, Optional


# Curated free/paid models (Jan 2026). `openrouter/free` is a meta-router
# that auto-selects any available free model, giving best reliability.
FREE_MODELS = [
    {"id": "openrouter/free", "name": "Auto (Free Router)", "tier": "free", "hint": "picks any available free model"},
    {"id": "qwen/qwen3-next-80b-a3b-instruct:free", "name": "Qwen3 Next 80B", "tier": "free"},
    {"id": "openai/gpt-oss-20b:free", "name": "GPT-OSS 20B", "tier": "free"},
    {"id": "google/gemma-4-31b-it:free", "name": "Gemma 4 31B", "tier": "free"},
    {"id": "nvidia/nemotron-3-super-120b-a12b:free", "name": "Nemotron 3 Super 120B", "tier": "free"},
    {"id": "meta-llama/llama-3.3-70b-instruct:free", "name": "Llama 3.3 70B", "tier": "free"},
    {"id": "qwen/qwen3-coder:free", "name": "Qwen3 Coder", "tier": "free"},
]
PAID_MODELS = [
    {"id": "anthropic/claude-sonnet-4.5", "name": "Claude Sonnet 4.5", "tier": "paid"},
    {"id": "openai/gpt-4o", "name": "GPT-4o", "tier": "paid"},
    {"id": "google/gemini-2.5-flash", "name": "Gemini 2.5 Flash", "tier": "paid"},
    {"id": "meta-llama/llama-3.3-70b-instruct", "name": "Llama 3.3 70B (Paid)", "tier": "paid"},
    {"id": "deepseek/deepseek-chat-v3.1", "name": "DeepSeek V3.1 (Paid)", "tier": "paid"},
]
DEFAULT_MODEL = "openrouter/free"

# Fallback cascade — used automatically when the requested model errors/rate-limits.
FALLBACK_CASCADE = [
    "openrouter/free",
    "openai/gpt-oss-20b:free",
    "qwen/qwen3-next-80b-a3b-instruct:free",
    "google/gemma-4-31b-it:free",
]


class OpenRouterClient:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        self.base_url = "https://openrouter.ai/api/v1"

    async def _call(self, payload: Dict[str, Any]) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://lumen-runtime.app",
            "X-Title": "Lumen Runtime",
        }
        async with httpx.AsyncClient(timeout=120.0) as http:
            r = await http.post(f"{self.base_url}/chat/completions", headers=headers, json=payload)
            if r.status_code != 200:
                raise RuntimeError(f"OpenRouter {r.status_code}: {r.text[:220]}")
            data = r.json()
            choice = data.get("choices", [{}])[0]
            return choice.get("message", {}).get("content", "") or ""

    async def chat(
        self,
        messages: List[Dict[str, str]],
        model: str = DEFAULT_MODEL,
        temperature: float = 0.4,
        max_tokens: int = 1400,
    ) -> str:
        if not self.api_key:
            raise RuntimeError("OPENROUTER_API_KEY not configured")
        # Try requested model, then cascade.
        errors = []
        tried = []
        for m in [model] + [x for x in FALLBACK_CASCADE if x != model]:
            tried.append(m)
            payload = {"model": m, "messages": messages, "temperature": temperature, "max_tokens": max_tokens}
            try:
                text = await self._call(payload)
                if text.strip():
                    return text
                errors.append(f"{m}: empty response")
            except Exception as e:
                errors.append(f"{m}: {str(e)[:120]}")
        raise RuntimeError(f"All models failed. Tried {tried}. Errors: {' | '.join(errors)}")

    async def chat_json(self, messages: List[Dict[str, str]], model: str = DEFAULT_MODEL, **kwargs) -> Any:
        """Chat and parse JSON, tolerating markdown fences and stray prose."""
        text = await self.chat(messages, model=model, **kwargs)
        text = text.strip()
        if text.startswith("```"):
            lines = text.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
        try:
            return json.loads(text)
        except Exception:
            for opener, closer in [("{", "}"), ("[", "]")]:
                i = text.find(opener)
                j = text.rfind(closer)
                if i != -1 and j != -1 and j > i:
                    try:
                        return json.loads(text[i:j + 1])
                    except Exception:
                        pass
            raise RuntimeError(f"Model returned non-JSON: {text[:200]}")


def list_models() -> List[Dict[str, str]]:
    return FREE_MODELS + PAID_MODELS
