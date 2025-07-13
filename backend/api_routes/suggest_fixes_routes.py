from fastapi import APIRouter
from models.schemas import SuggestFixesRequest, SuggestFixesResponse
from agents.suggest_fixes_agent import suggest_fixes as suggest_fixes_

router = APIRouter()

@router.post("/suggest-fixes", response_model=SuggestFixesResponse)
async def suggest_fixes(req: SuggestFixesRequest):
    code=req.code
    errors=req.error_message
    language=req.language
    
    return suggest_fixes_(
        code=code,
        error_message=errors,
        language=language
    )
    