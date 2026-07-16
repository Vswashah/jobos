from fastapi import APIRouter
router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/")
async def list_profile():
    return {"message": "profile coming soon"}
