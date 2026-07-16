from fastapi import APIRouter
router = APIRouter(prefix="/outreach", tags=["outreach"])

@router.get("/")
async def list_outreach():
    return {"message": "outreach coming soon"}
