from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Optional
from models.schemas import ExplainErrorsResponse
from llms.llm_providers import get_llm

def explain_errors(code:str, error_message:str, language:Optional[str]="python"):
    model=get_llm(provider="ollama", model="gemma:7b")
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an AI agent that reads a code snippet and the error message it generated.
            Your job is to:
            1. Clearly explain what the error message means.
            2. Suggest possible causes of the error.

            Return your output strictly in this JSON format:
            {{
            "explanation": "...",
            "possible_causes": ["...", "..."]
            }}

            Here is the code written in {language}:
            <code>
            {code}
            </code>

            And here is the error message:
            <error_message>
            {error_message}
            </error_message>

            Only return a valid JSON response in the format shown above.
        """)
    ])

    output_parser = JsonOutputParser(pydantic_object=ExplainErrorsResponse)
    
    chain = prompt_template|model|output_parser
    response = chain.invoke(input={
        "language":language, 
        "code":code,
        "error_message":error_message
    })
    
    return response

if __name__ == "__main__":
    code="print(1/0)"
    error_messages="Divide by zero error."
    print(explain_errors(code, error_messages))