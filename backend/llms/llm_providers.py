from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import getpass

class UnsupportedLLMProviderError(Exception):
    def __init__(self, provider: str):
        super().__init__(f"LLM Provider {provider} not supported.")

def get_llm(provider: str, model: str, api_key: str = ""):
    provider = provider.lower()
    
    if provider == "google":
        if not api_key:
            raise ValueError("API key required for Google provider.")
        
        os.environ["GOOGLE_API_KEY"] = api_key
        return ChatGoogleGenerativeAI(
            model=model,
            temperature=0.7
        )
    
    elif provider == "ollama":
        return ChatOllama(
            model=model,
            temperature=0.7
        )
    else:
        raise UnsupportedLLMProviderError(provider=provider)