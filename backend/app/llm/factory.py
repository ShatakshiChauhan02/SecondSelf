import os
from app.llm.base import BaseLLMProvider, LLMConfigurationError
from app.llm.gemini import GeminiProvider
from app.llm.ollama import OllamaProvider


def get_llm_provider(provider_name: str = None) -> BaseLLMProvider:
    """
    Factory function returning the configured LLM provider instance.
    
    :param provider_name: Optional explicit provider override ('gemini' | 'ollama').
                          Defaults to LLM_PROVIDER env variable or 'gemini'.
    """
    selected = (provider_name or os.getenv("LLM_PROVIDER") or "gemini").lower().strip()

    if selected == "gemini":
        return GeminiProvider()
    elif selected == "ollama":
        return OllamaProvider()
    else:
        raise LLMConfigurationError(
            f"Unsupported LLM_PROVIDER '{selected}'. Supported options are 'gemini' and 'ollama'."
        )
