import time
import os
import sqlite3
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
    
    # Store chat history locally via DTN buffer for synchronization if we're an Edge node
    station_code = os.environ.get("STATION_CODE", "MAITRI")
    dtn_db_file = f"dtn_buffer_{station_code}.sqlite"
    
    if os.path.exists(dtn_db_file):
        try:
            conn = sqlite3.connect(dtn_db_file)
            c = conn.cursor()
            
            # Queue User query
            now_ms = int(time.time() * 1000)
            c.execute(
                "INSERT INTO dtn_chat_queue (sender, content, timestamp_ms) VALUES (?, ?, ?)",
                ("operator", req.query, now_ms)
            )
            
            # Queue AI response
            now_ms = int(time.time() * 1000) + 1
            c.execute(
                "INSERT INTO dtn_chat_queue (sender, content, timestamp_ms) VALUES (?, ?, ?)",
                ("antarvik_ai", answer, now_ms)
            )
            
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Failed to queue chat to DTN: {e}")
            
    return {"answer": answer}
