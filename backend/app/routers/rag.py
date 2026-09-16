from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Dict, Any
from app.services.rag_service import rag_service

router = APIRouter(prefix="/api/chat", tags=["rag"])

class ChatRequest(BaseModel):
    query: str
    context: Dict[str, Any]

@router.post("")
async def ask_rag(req: ChatRequest):
    answer = rag_service.ask(req.query, req.context)
    return {"answer": answer}
