from fastapi import FastAPI
from api_routes.explain_errors_routes import router as explain_errors_router
from api_routes.suggest_fixes_routes import router as suggest_fixes_router
from api_routes.generate_testcases_routes import router as generate_testcases_router
from api_routes.code_walkthrough_routes import router as code_walkthrough_router

app = FastAPI()

@app.get("/")
async def greet():
    return {"message": "Hello, Welcome to Wingman, your personal AI Debugger."}

app.include_router(explain_errors_router)
app.include_router(suggest_fixes_router)
app.include_router(generate_testcases_router)
app.include_router(code_walkthrough_router)
