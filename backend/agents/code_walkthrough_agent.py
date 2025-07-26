from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from typing import Optional
from models.schemas import CodeWalkthroughResponse, LLMRequest
from llms.llm_providers import get_llm

def code_walkthrough(code:str, llm_req:LLMRequest, focus_on:Optional[str]=None , language:Optional[str]="python"):
    model=get_llm(provider=llm_req.provider, model=llm_req.model, api_key=llm_req.api_key)
    prompt_template = ChatPromptTemplate.from_messages([
        ("system", """
            You are an AI agent that reads a code snippet and explains its functionality in a structured walkthrough format.
            Your task is to divide the code into meaningful segments and explain each segment step-by-step.
            Focus especially on: {focus_on}

            Return your output strictly in the following JSON format:
            {{
            "walkthrough": [
            {{
                "segment": "<the portion of the code you're explaining>",
                "step": "<explanation of what's happening in this segment>",
            }},
            ...
            ]
            }}

            Here is the code written in {language}:
            <code>
            {code}
            </code>

            Important:
            - Do not include any extra text outside the JSON.
            - If a segment doesn't require explanation, you can skip it.
            - Ensure the JSON is valid and adheres to the format above.

        """),
        ("human", "Give a structured walkthrough of the provided code.")
    ])

    output_parser = JsonOutputParser(pydantic_object=CodeWalkthroughResponse)
    
    chain = prompt_template|model|output_parser
    response = chain.invoke(input={
        "language":language, 
        "code":code,
        "focus_on":focus_on
    })
    
    return response

if __name__ == "__main__":
    code="""
    def print_fibonacci(n):
        a, b = 0, 1
        for _ in range(n):
            print(a, end=" ")
            a, b = b, a + b
    """
    print(code_walkthrough(code))