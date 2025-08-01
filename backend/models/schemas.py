from pydantic import BaseModel
from typing import Optional, List, Dict

#0. LLM Request
class LLMRequest(BaseModel):
    provider: str
    model: str
    api_key: str


#1. Explain Errors
class ExplainErrorsRequest(BaseModel):
    code: str
    error_message: str
    language: Optional[str] = "python"
    llm_request: LLMRequest
    
class ExplainErrorsResponse(BaseModel):
    explanation: str
    possible_causes: Optional[List[str]] = []

#2. Suggest Fixes
class SuggestFixesRequest(BaseModel):
    code: str
    error_message: str
    user_request: str
    language: Optional[str] = "python"
    llm_request: LLMRequest
    
class SuggestFixesResponse(BaseModel):
    fixed_code: str
    fixes: Optional[List[str]] = []
    differences: Optional[List[str]] = []
    
#3. Generate TestCases
class GenerateTestCasesRequest(BaseModel):
    code: str
    code_explanation: Optional[str] = None
    num_testcases: str
    language: Optional[str] = "python"
    llm_request: LLMRequest
    
class TestCase(BaseModel):
    input: Dict[str, str]
    expected_output: str
    explanation: Optional[str] = None
        
class GenerateTestCasesResponse(BaseModel):
    testcases: List[TestCase]
    
#4. Code Walkthrough
class CodeWalkthroughRequest(BaseModel):
    code: str
    focus_on: Optional[str] = None 
    language: Optional[str] = "python"
    llm_request: LLMRequest

class CodeSegmentExplanation(BaseModel):
    segment: str
    step: str

class CodeWalkthroughResponse(BaseModel):
    walkthrough: List[CodeSegmentExplanation]
    