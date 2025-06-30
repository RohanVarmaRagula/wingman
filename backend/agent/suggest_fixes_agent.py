from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Optional
from models.schemas import SuggestFixesResponse
from typing import List
import difflib

def suggest_fixes(code:str, error_message:str, language:Optional[str]="python"):
    model=ChatOllama(
        model="codellama:7b",
        temperature=0.7
    )
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an AI agent that reads a code snippet and the error message it generated.
            Your job is to:
            1. Generate a new code by fixing the errors in the code.
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

            And here is the error message:
            <error_message>
            {error_message}
            </error_message>

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
        "error_message":error_message
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