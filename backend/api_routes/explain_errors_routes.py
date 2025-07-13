from fastapi import APIRouter
from models.schemas import ExplainErrorsRequest, ExplainErrorsResponse
from agents.explain_errors_agent import explain_errors as explain_errors_

router = APIRouter()

@router.post("/explain-errors", response_model=ExplainErrorsResponse)
async def explain_errors(req: ExplainErrorsRequest):
    code=req.code
    errors=req.error_message
    language=req.language
    
    return explain_errors_(
        code=code,
        error_message=errors,
        language=language
    )

