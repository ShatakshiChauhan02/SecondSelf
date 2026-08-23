from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional


class LLMConfigurationError(Exception):
    """Raised when an LLM provider is missing required configuration (e.g. API keys)."""
    pass


class LLMProviderError(Exception):
    """Raised when an error occurs during LLM inference/communication."""
    pass


class BaseLLMProvider(ABC):
    """Abstract Base Class for LLM Providers (Gemini, Ollama, etc.)."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier name."""
        pass

    @abstractmethod
    async def generate_response(self, messages: List[Dict[str, Any]], system_prompt: str) -> str:
        """Generate a text response given conversation history and system prompt."""
        pass

    async def generate_response_with_tools(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: str,
        tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate response with tool/function calling support.
        
        Default fallback implementation formats tools into system prompt and parses JSON tool calls.
        Providers may override with native function calling API.
        
        Returns:
          {'type': 'tool_call', 'name': str, 'args': dict} OR
          {'type': 'final_response', 'text': str}
        """
        # Default prompt-based tool calling fallback for providers without native SDK function calling
        tool_desc = "\n".join([f"- {t['name']}: {t['description']} Parameters: {t['parameters']}" for t in tools])
        enhanced_prompt = (
            f"{system_prompt}\n\n"
            f"AVAILABLE TOOLS:\n{tool_desc}\n\n"
            "If you need to call a tool to answer the user's request, respond ONLY with a JSON block:\n"
            '{"tool": "tool_name", "arguments": {...}}\n'
            "If no tool is needed, answer normally in plain text."
        )

        response_text = await self.generate_response(messages=messages, system_prompt=enhanced_prompt)
        
        # Check if response is a JSON tool call
        import json
        import re
        
        json_match = re.search(r'\{\s*"tool"\s*:\s*"([^"]+)"\s*,\s*"arguments"\s*:\s*(\{.*?\})\s*\}', response_text, re.DOTALL)
        if json_match:
            try:
                tool_name = json_match.group(1)
                args_dict = json.loads(json_match.group(2))
                return {"type": "tool_call", "name": tool_name, "args": args_dict}
            except Exception:
                pass

        return {"type": "final_response", "text": response_text}
