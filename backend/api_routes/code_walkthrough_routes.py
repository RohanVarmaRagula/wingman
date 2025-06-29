from fastapi import APIRouter
from models.schemas import CodeSegmentExplanation, CodeWalkthroughRequest, CodeWalkthroughResponse

router = APIRouter()

@router.post("/code-walkthrough", response_model=CodeWalkthroughResponse)
async def code_walkthrough(req: CodeWalkthroughRequest):
    temp_explaination = [CodeSegmentExplanation(
        segment="dummy segment",
        step=[]
    )]
    temp = CodeWalkthroughResponse(
        walkthrough=temp_explaination
    )
    return temp