import os
from typing import List, Dict, Any
from app.llm.base import BaseLLMProvider, LLMConfigurationError, LLMProviderError


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini Cloud LLM Provider implementation with native Function/Tool calling support.
    """

    DEFAULT_MODELS = [
        "gemini-2.5-flash-lite",
        "gemini-flash-latest",
        "gemini-2.5-pro",
        "gemini-flash-lite-latest"
    ]

    def __init__(self, api_key: str = None):
        self._api_key = api_key or os.getenv("GEMINI_API_KEY")

    @property
    def provider_name(self) -> str:
        return "gemini"

    async def generate_response(self, messages: List[Dict[str, Any]], system_prompt: str) -> str:
        if not self._api_key:
            raise LLMConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in your backend .env file."
            )

        try:
            try:
                from google import genai
                from google.genai import types

                client = genai.Client(api_key=self._api_key)
                formatted_contents = []
                for msg in messages:
                    role = "user" if msg.get("sender") == "user" else "model"
                    text = msg.get("text", "")
                    if text:
                        formatted_contents.append(
                            types.Content(
                                role=role,
                                parts=[types.Part.from_text(text=text)]
                            )
                        )

                if not formatted_contents:
                    formatted_contents = [types.Content(role="user", parts=[types.Part.from_text(text="")])]

                last_exception = None
                for model_name in self.DEFAULT_MODELS:
                    try:
                        response = client.models.generate_content(
                            model=model_name,
                            contents=formatted_contents,
                            config=types.GenerateContentConfig(
                                system_instruction=system_prompt,
                                temperature=0.7,
                            )
                        )
                        if response and response.text:
                            return response.text.strip()
                    except Exception as e:
                        last_exception = e

                if last_exception:
                    raise last_exception

            except (ImportError, AttributeError):
                import google.generativeai as genai
                genai.configure(api_key=self._api_key)
                model = genai.GenerativeModel(
                    model_name="gemini-1.5-flash",
                    system_instruction=system_prompt
                )

                formatted_history = []
                for msg in messages[:-1]:
                    role = "user" if msg.get("sender") == "user" else "model"
                    formatted_history.append({"role": role, "parts": [msg.get("text", "")]})

                chat = model.start_chat(history=formatted_history)
                last_msg = messages[-1].get("text", "") if messages else ""
                response = chat.send_message(last_msg)
                return response.text.strip()

        except LLMConfigurationError:
            raise
        except Exception as e:
            err_msg = str(e)
            if "API_KEY_INVALID" in err_msg or "400" in err_msg or "403" in err_msg:
                raise LLMConfigurationError(f"Invalid Gemini API key provided: {err_msg}")
            raise LLMProviderError(f"Gemini service error: {err_msg}")

    async def generate_response_with_tools(
        self,
        messages: List[Dict[str, Any]],
        system_prompt: str,
        tools: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        if not self._api_key:
            raise LLMConfigurationError(
                "Gemini API key is not configured. Please set GEMINI_API_KEY in your backend .env file."
            )

        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=self._api_key)
            
            # Convert tool declarations to google.genai FunctionDeclaration
            fn_declarations = []
            for t in tools:
                fn_declarations.append(
                    types.FunctionDeclaration(
                        name=t["name"],
                        description=t["description"],
                        parameters=t.get("parameters")
                    )
                )

            gemini_tools = [types.Tool(function_declarations=fn_declarations)]

            formatted_contents = []
            for msg in messages:
                role = "user" if msg.get("sender") == "user" else "model"
                text = msg.get("text", "")
                if text:
                    formatted_contents.append(
                        types.Content(
                            role=role,
                            parts=[types.Part.from_text(text=text)]
                        )
                    )

            last_exception = None
            for model_name in self.DEFAULT_MODELS:
                try:
                    response = client.models.generate_content(
                        model=model_name,
                        contents=formatted_contents,
                        config=types.GenerateContentConfig(
                            system_instruction=system_prompt,
                            temperature=0.3,
                            tools=gemini_tools
                        )
                    )

                    if response:
                        # Check if Gemini requested a function/tool call
                        if response.function_calls:
                            fc = response.function_calls[0]
                            args_dict = dict(fc.args) if fc.args else {}
                            return {
                                "type": "tool_call",
                                "name": fc.name,
                                "args": args_dict
                            }
                        
                        if response.text:
                            return {
                                "type": "final_response",
                                "text": response.text.strip()
                            }
                except Exception as e:
                    last_exception = e

            if last_exception:
                raise last_exception

        except Exception as e:
            # Fallback to prompt-based tool calling if native SDK call fails
            return await super().generate_response_with_tools(messages, system_prompt, tools)
