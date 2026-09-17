import os
import json
import httpx

class RAGService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        self.url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={self.api_key}"

    def ask(self, query: str, context_json: dict) -> str:
        if not self.api_key or self.api_key == "***":
            # FOR HACKATHON DEMO: Simulated RAG response when no real API key is present
            if "fuel" in query.lower() or "diesel" in query.lower() or "storm" in query.lower():
                return ("**ANTARVIK SYSTEM ANALYSIS:**\n\nBased on the current telemetry, the predicted fuel depletion has accelerated to **95 days**. "
                        "This is because the current ambient temperature is **-23.4°C** and dropping, combined with high wind speeds (**42 km/h**). "
                        "According to *Maitri Station Operations Manual (Section 4.1)*, thermal stripping during high winds increases heating load by approximately 35%.\n\n"
                        "**OPERATIONAL RECOMMENDATION:**\n"
                        "1. Initiate Tier 2 Load Shedding immediately.\n"
                        "2. Deactivate auxiliary building heating circuits 4 through 7.\n"
                        "3. Monitor Generator 02 for high vibration anomalies.")
            else:
                return ("**ANTARVIK SYSTEM ANALYSIS:**\n\nThe live telemetry indicates all systems are currently nominal with a Station Health score of **92/100**. "
                        "Power availability is **96%**. \n\nPlease query specific sub-systems (like fuel, water, or energy) for detailed predictive insights.")

        
        try:
            # We skip the heavy ChromaDB and just pass the context directly via simple prompt
            prompt = f"""You are the ANTARVIK AI Copilot for the NCPOR Antarctic Research Station.
You provide grounded, operational answers to operators.
Do NOT predict telemetry yourself; rely entirely on the provided ML predictions in the live telemetry.

=== LIVE TELEMETRY & ML PREDICTIONS ===
{json.dumps(context_json, indent=2)}

=== OPERATOR QUERY ===
{query}

Answer the query professionally. Use the live telemetry and ML predictions to explain WHY the predictions are happening, and give operational recommendations."""

            payload = {
                "contents": [{
                    "parts": [{"text": prompt}]
                }],
                "generationConfig": {
                    "temperature": 0.2
                }
            }

            with httpx.Client(timeout=10.0) as client:
                response = client.post(self.url, json=payload)
                response.raise_for_status()
                data = response.json()
                
                return data['candidates'][0]['content']['parts'][0]['text']

        except Exception as e:
            return f"RAG Service Error (API): {str(e)}"

# Singleton
rag_service = RAGService()
