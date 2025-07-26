from fastapi import APIRouter
from models.schemas import GenerateTestCasesRequest, GenerateTestCasesResponse, TestCase
from agents.generate_testcases_agent import generate_testcases as generate_testcases_

router = APIRouter()

@router.post("/generate-testcases", response_model=GenerateTestCasesResponse)
async def generate_testcases(req: GenerateTestCasesRequest):
    code=req.code
    code_explanation=req.code_explanation
    num_testcases=req.num_testcases
    language=req.language
    llm_req = req.llm_request
    return generate_testcases_(
        code=code,
        num_testcases=num_testcases,
        llm_req=llm_req,
        code_explanation=code_explanation,
        language=language
    )
