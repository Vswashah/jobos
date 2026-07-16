from fastapi import APIRouter
router = APIRouter(prefix="/interviews", tags=["interviews"])

@router.get("/")
async def list_interviews():
    return {"message": "interviews coming soon"}
