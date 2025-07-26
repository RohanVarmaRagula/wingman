from fastapi import APIRouter
from models.schemas import CodeWalkthroughRequest, CodeWalkthroughResponse
from agents.code_walkthrough_agent import code_walkthrough as code_walkthrough_

router = APIRouter()

@router.post("/code-walkthrough", response_model=CodeWalkthroughResponse)
async def code_walkthrough(req: CodeWalkthroughRequest):
    code = req.code
    focus_on = req.focus_on
    language = req.language
    llm_req = req.llm_request
    return code_walkthrough_(
        code=code,
        llm_req=llm_req,
        focus_on=focus_on,
        language=language
    )