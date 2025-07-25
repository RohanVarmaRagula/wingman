from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Optional
from models.schemas import SuggestFixesResponse
from llms.llm_providers import get_llm
from typing import List
import difflib

def suggest_fixes(code:str, error_message:str, user_request:str, language:Optional[str]="python"):
    model=get_llm(provider="ollama", model="gemma:7b")
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an AI agent that reads a code snippet and the error message it generated. If it is free of errors, you are given user's request.
            Your job is to:
            1. Generate a new code by fixing the errors in the code or completing the users request.
            2. Explain the fixes you made.

            Return your output strictly in this JSON format:
            {{
            "fixed_code": "...",
            "fixes": ["...", "..."]
            }}

            Here is the code written in {language}:
            <code>
            {code}
            </code>

            And here is the error message (if any errors):
            <error_message>
            {error_message}
            </error_message>
            
            And here is the user's request (if any):
            <user_request>
            {user_request}
            </user_request>

            Only return a valid JSON response in the format shown above.
        """)
    ])

    
    output_parser = JsonOutputParser(
        pydantic_object={
            "fixed_code": str,
            "fixes": Optional[List[str]]
            }
        )
    
    chain = prompt_template|model|output_parser
    response = chain.invoke(input={
        "language":language, 
        "code":code,
        "error_message":error_message,
        "user_request":user_request
    })
    new_code=response["fixed_code"]
    response = SuggestFixesResponse(
        fixed_code=new_code,
        fixes=response["fixes"],
        differences=list(difflib.unified_diff(a=code.splitlines(), 
                                            b=str(new_code).splitlines(),
                                            lineterm=""))
    )
    
    return response

if __name__ == "__main__":
    code="print(1/0)"
    error_messages="Divide by zero error."
    print(suggest_fixes(code, error_messages))