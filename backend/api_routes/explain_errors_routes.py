from fastapi import APIRouter
from models.schemas import ExplainErrorsRequest, ExplainErrorsResponse

router = APIRouter()

@router.post("/explain-error", response_model=ExplainErrorsResponse)
async def explain_error(req: ExplainErrorsRequest):
    temp = ExplainErrorsResponse(
        explanation = "dummy explaination",
        possible_causes = []
    )
    return temp

