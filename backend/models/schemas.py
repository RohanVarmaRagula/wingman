from pydantic import BaseModel
from typing import Optional, List

#1. Explain Errors
class ExplainErrorsRequest(BaseModel):
    code: str
    error_message: str
    language: Optional[str] = "python"
    
class ExplainErrorsResponse(BaseModel):
    explanation: str
    possible_causes: Optional[List[str]] = []

#2. Suggest Fixes
class SuggestFixesRequest(BaseModel):
    code: str
    error_message: str
    language: Optional[str] = "python"
    
class SuggestFixesResponse(BaseModel):
    fixed_code: str
    fixes: Optional[List[str]] = []
    differences: Optional[List[str]] = []
    
#3. Generate TestCases
class GenerateTestCasesRequest(BaseModel):
    code: str
    code_explanation: Optional[str] = None
    language: Optional[str] = "python"
    
class TestCase(BaseModel):
    input: str
    expected_output: str
    explanation: Optional[str] = None
        
class GenerateTestCasesResponse(BaseModel):
    test_cases: List[TestCase]
    
#4. Code Walkthrough
class CodeWalkthroughRequest(BaseModel):
    code: str
    focus_on: Optional[str] = None 
    language: Optional[str] = "python"

class CodeSegmentExplanation(BaseModel):
    segment: str
    step: List[str]

class CodeWalkthroughResponse(BaseModel):
    walkthrough: List[CodeSegmentExplanation]
    