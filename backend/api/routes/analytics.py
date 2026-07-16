from fastapi import APIRouter
router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/")
async def list_analytics():
    return {"message": "analytics coming soon"}
