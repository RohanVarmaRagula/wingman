from fastapi import APIRouter
from models.schemas import GenerateTestCasesRequest, GenerateTestCasesResponse, TestCase

router = APIRouter()

@router.post("/generate-testcases", response_model=GenerateTestCasesResponse)
async def generate_testcases(req: GenerateTestCasesRequest):
    temp_tcs = [TestCase(
        input="dummy input",
        expected_output="dummy output",
        explanation=None
    )]
    temp = GenerateTestCasesResponse(
        test_cases=temp_tcs
    )
    
    return temp