import os
import json
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_core.prompts import PromptTemplate
from langchain_core.documents import Document
from chromadb import Client, Settings
import chromadb

class RAGService:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")
        
        if self.api_key:
            # Initialize Gemini Chat Model
            self.llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash", 
                google_api_key=self.api_key, 
                temperature=0.2
            )
            
            # Initialize Embeddings
            self.embeddings = GoogleGenerativeAIEmbeddings(
                model="models/embedding-001", 
                google_api_key=self.api_key
            )
            
            # Initialize Chroma Vector DB (In-memory for Hackathon)
            self.chroma_client = chromadb.Client(Settings(is_persistent=False))
            self.collection = self.chroma_client.get_or_create_collection("antarvik_manuals")
            self._ingest_dummy_data()

    def _ingest_dummy_data(self):
        """Load standard operational procedures into Chroma to demonstrate RAG."""
        dummy_docs = [
            "STANDARD OPERATING PROCEDURE: Diesel Generator Failure. In the event of primary generator failure in winter, immediately switch to standby generator 2. Tier 2 load shedding must be initiated. Non-essential heating in auxiliary buildings must be shut down within 15 minutes.",
            "WINTER-OVER FUEL MANAGEMENT: Average daily diesel burn rate at Maitri is 400-450 liters. If wind speeds exceed 60 km/h, the thermal load increases dramatically due to heat stripping from building envelopes. During storms, expect fuel burn to increase by 35-45%.",
            "LOGISTICS & RESUPPLY: Resupply vessels can only dock between November and January. If fuel is projected to run out before November 15, an emergency airlift request must be filed 60 days in advance.",
            "SOLAR IRRADIANCE: During polar night (May to July), solar generation drops to absolute zero. Battery SoC must be maintained by diesel gensets. In summer (December), solar can cover up to 40% of daytime base load."
        ]
        
        # In a real app we use the embedding function, but chromadb + langchain needs a wrapper or we do it manually.
        # We'll use langchain's Chroma integration in a real app, but for simplicity we manually add it using the embedding model.
        if self.api_key:
            try:
                vectors = self.embeddings.embed_documents(dummy_docs)
                self.collection.add(
                    documents=dummy_docs,
                    embeddings=vectors,
                    ids=[f"doc_{i}" for i in range(len(dummy_docs))]
                )
            except Exception as e:
                print(f"Failed to ingest dummy data: {e}")

    def ask(self, query: str, context_json: dict) -> str:
        if not self.api_key:
            return "ERROR: GEMINI_API_KEY is not set in the environment. Please add it to the .env file and restart the backend."
        
        try:
            # 1. Retrieve relevant documents (Top K = 2)
            query_embedding = self.embeddings.embed_query(query)
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=2
            )
            
            retrieved_docs = "\n".join(results['documents'][0]) if results['documents'] else "No relevant manuals found."
            
            # 2. Construct Grounded Prompt
            prompt_template = PromptTemplate(
                input_variables=["query", "live_data", "retrieved_docs"],
                template="""You are the ANTARVIK AI Copilot for the NCPOR Antarctic Research Station.
You provide grounded, operational answers to operators.
Do NOT predict telemetry yourself; rely entirely on the provided ML predictions in the live telemetry.

=== RETRIEVED STATION MANUALS & LOGS ===
{retrieved_docs}

=== LIVE TELEMETRY & ML PREDICTIONS ===
{live_data}

=== OPERATOR QUERY ===
{query}

Answer the query professionally. Use the retrieved manuals to explain WHY the predictions are happening, and give operational recommendations."""
            )
            
            formatted_prompt = prompt_template.format(
                query=query,
                live_data=json.dumps(context_json, indent=2),
                retrieved_docs=retrieved_docs
            )
            
            # 3. Generate Answer
            response = self.llm.invoke(formatted_prompt)
            return response.content
        except Exception as e:
            return f"RAG Service Error: {str(e)}"

# Singleton
rag_service = RAGService()
