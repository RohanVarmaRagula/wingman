from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Optional
from models.schemas import GenerateTestCasesResponse

def explain_errors(code:str, num_testcases:int, code_explanation: Optional[str] = None, language:Optional[str]="python"):
    model=ChatOllama(
        model="codellama:7b",
        temperature=0.7
    )
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an AI agent that reads a code snippet and, if provided, its explanation.
            Your task is to generate exactly {n} test cases for the given code.
            Return your output strictly in the following JSON format:
            {{
            "testcase": [
                {{
                "input": <python dictionary including all the parameters>,
                "expected_output": "<expected output for the test case>",
                "explanation": "<optional explanation for the test case>"
                }},
                ...
            ]
            }}

            Here is the code written in {language}:
            <code>
            {code}
            </code>

            And here is the code explanation (optional):
            <code_explanation>
            {code_explanation}
            </code_explanation>

            Important:
            - Return only a valid JSON object.
            - Do not add any prose or commentary outside the JSON.
        """)
    ])

    output_parser = JsonOutputParser(pydantic_object=GenerateTestCasesResponse)
    
    chain = prompt_template|model|output_parser
    response = chain.invoke(input={
        "n":num_testcases,
        "language":language, 
        "code":code,
        "code_explanation":code_explanation
    })
    
    return response

if __name__ == "__main__":
    code="""
    def func(a: int, b: int):
        return a+b
    """
    code_explanation="Addition of two numbers."
    print(explain_errors(code=code, num_testcases=5, code_explanation=code_explanation))