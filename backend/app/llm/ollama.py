import os
import httpx
from typing import List, Dict, Any
from app.llm.base import BaseLLMProvider, LLMProviderError


class OllamaProvider(BaseLLMProvider):
    """
    Local Ollama LLM Provider implementation.
    Communicates asynchronously with local Ollama API server.
    """

    def __init__(self, host: str = None, model: str = None):
        self._host = (host or os.getenv("OLLAMA_HOST") or "http://localhost:11434").rstrip("/")
        self._model = model or os.getenv("OLLAMA_MODEL") or "llama3"

    @property
    def provider_name(self) -> str:
        return "ollama"

    async def generate_response(self, messages: List[Dict[str, Any]], system_prompt: str) -> str:
        endpoint = f"{self._host}/api/chat"

        # Format messages for Ollama chat endpoint
        formatted_messages = [{"role": "system", "content": system_prompt}]
        for msg in messages:
            role = "user" if msg.get("sender") == "user" else "assistant"
            formatted_messages.append({"role": role, "content": msg.get("text", "")})

        payload = {
            "model": self._model,
            "messages": formatted_messages,
            "stream": False
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(endpoint, json=payload)
                if response.status_code != 200:
                    raise LLMProviderError(
                        f"Ollama server returned error status {response.status_code}: {response.text}"
                    )
                data = response.json()
                message_content = data.get("message", {}).get("content", "")
                if not message_content:
                    raise LLMProviderError("Received empty message from Ollama provider.")
                return message_content.strip()

        except httpx.ConnectError:
            raise LLMProviderError(
                f"Ollama server is unreachable at {self._host}. Please ensure Ollama is running locally."
            )
        except Exception as e:
            if isinstance(e, LLMProviderError):
                raise e
            raise LLMProviderError(f"Ollama provider execution failed: {str(e)}")
