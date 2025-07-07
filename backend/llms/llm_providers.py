from langchain_ollama import ChatOllama
from langchain_google_genai import ChatGoogleGenerativeAI
import os
import getpass

class UnsupportedLLMProviderError(Exception):
    def __init__(self, provider: str):
        super().__init__(f"LLM Provided {provider} not supported.")

def get_llm(provider: str, model: str):
    provider = provider.lower()
    
    if provider == "google":
        os.environ["GOOGLE_API_KEY"] = getpass.getpass("Enter your gemini API key: ")

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