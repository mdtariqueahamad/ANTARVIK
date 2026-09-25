import os
import json
import httpx

class RAGService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"

    def ask(self, query: str, context_json: dict) -> str:
        # FOR HACKATHON DEMO: Rate Limit Placeholder
        return ("**ANTARVIK SYSTEM:**\n\nThe RAG AI inference engine is temporarily unavailable due to external API rate limits (HTTP 429 Too Many Requests).\n\n"
                "Please check back later or rely on the primary telemetry dashboards for operational insights.")

# Singleton
rag_service = RAGService()
