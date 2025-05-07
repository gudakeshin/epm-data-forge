# backend/main.py
import logging
from fastapi import FastAPI, HTTPException, Request, UploadFile, File, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.openapi.utils import get_openapi
from contextlib import asynccontextmanager
import os
import asyncio
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
import traceback
from pydantic import BaseModel, Field, validator
from models import GenerationConfig, GenerationResponse
from agents import CoordinatorAgent, ExpertModelerAgent, DataGenerationAgent, ModelDefinitionAgent
from llm.client import check_ollama_connection, OLLAMA_BASE_URL, get_ollama_client
from fastapi.exception_handlers import RequestValidationError

# Load environment variables from .env file FIRST
# This ensures environment variables are set before other modules are imported
dotenv_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(dotenv_path=dotenv_path)

# Import necessary components AFTER loading .env

# --- Logging Configuration --- 
# Set level from ENV var or default to INFO
log_level = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('app.log')  # Add file logging
    ]
)
logger = logging.getLogger(__name__)

# --- Application State --- 
# Store resource-intensive objects like the agent here
app_state = {"coordinator_agent": None} # Initialize state

# --- WebSocket Connection Manager --- 

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket client connected: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket client disconnected: {websocket.client}")

    async def broadcast(self, message: str):
        # Create a copy of the list to avoid issues if connections change during broadcast
        connections = self.active_connections[:]
        disconnected_sockets = []
        for connection in connections:
            try:
                await connection.send_text(message)
            except WebSocketDisconnect:
                logger.warning(f"WebSocket client {connection.client} disconnected during broadcast. Removing.")
                disconnected_sockets.append(connection)
            except Exception as e: # Catch other potential send errors
                 logger.error(f"Error sending message to WebSocket {connection.client}: {e}", exc_info=True)
                 # Optionally disconnect on other errors too
                 # disconnected_sockets.append(connection)
                 
        # Clean up disconnected sockets after broadcast loop
        for socket in disconnected_sockets:
            self.disconnect(socket)

manager = ConnectionManager()

# Helper function to be passed around
async def broadcast_status(message: str):
    await manager.broadcast(message)

# --- Lifespan Management (Startup/Shutdown) --- 
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handles application startup and shutdown events."""
    logger.info("Application startup sequence beginning...")
    
    # 1. Check Ollama Connection
    logger.info(f"Checking Ollama connection at {OLLAMA_BASE_URL}...")
    if not get_ollama_client(): # Check if client initialized
         logger.error("Ollama client failed to initialize (check URL/config). Cannot proceed with agent initialization.")
         # Optionally raise a critical error here if LLM is essential for startup
    elif not await check_ollama_connection():
        # Warn if connection fails, but allow app to start (agent might still work without LLM?)
        logger.warning("Ollama connection check failed on startup. Generation tasks requiring LLM might fail.")
    else:
        logger.info("Ollama connection successful.")
        
    # 2. Initialize Coordinator Agent
    logger.info("Initializing Coordinator Agent...")
    try:
        # Only initialize if Ollama client seems okay (or if designed to work without it)
        if get_ollama_client(): # Or adjust logic if agent can partially function without LLM
            # Pass the LLM client to the CoordinatorAgent constructor
            app_state['coordinator_agent'] = CoordinatorAgent(status_callback=broadcast_status)
            logger.info("Coordinator Agent initialized successfully.")
        else:
             logger.warning("Skipping Coordinator Agent initialization due to Ollama client issues.")
    except Exception as e:
        logger.error(f"CRITICAL: Failed to initialize Coordinator Agent: {e}", exc_info=True)
        app_state['coordinator_agent'] = None 
        # Depending on requirements, could prevent app start here
        
    yield # Application runs here
    
    # --- Shutdown Sequence ---
    logger.info("Application shutdown sequence beginning...")
    app_state.clear()
    logger.info("Application state cleared. Shutdown complete.")

# --- FastAPI App Initialization --- 
app = FastAPI(
    title="EPM Data Forge Backend",
    description="""API for generating synthetic EPM data using a multi-agent system and LLM.
    
    ## Features
    - Generate synthetic EPM data based on configuration
    - Upload and analyze model files
    - Real-time status updates via WebSocket
    - Multi-agent coordination for data generation
    
    ## Authentication
    Currently, the API is open and does not require authentication.
    """,
    version="0.1.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    
    openapi_schema = get_openapi(
        title="EPM Data Forge API",
        version="0.1.0",
        description="API for generating synthetic EPM data",
        routes=app.routes,
    )
    
    # Add security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    }
    
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# --- CORS Middleware --- 
class AppConfig(BaseModel):
    """Application configuration model with validation."""
    frontend_url: str = Field(default="http://localhost:5173")
    ollama_base_url: str = Field(default="http://localhost:11434")
    debug_mode: bool = Field(default=False)
    log_level: str = Field(default="INFO")
    cors_origins: List[str] = Field(default=["http://localhost:5173", "http://localhost:8080", "http://localhost:8081", "http://localhost:8085"])
    
    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"]
        if v.upper() not in valid_levels:
            raise ValueError(f"Invalid log level. Must be one of {valid_levels}")
        return v.upper()

# Load and validate configuration
def load_config() -> AppConfig:
    """Load and validate application configuration."""
    try:
        # Get CORS origins from environment or use default list
        cors_origins_str = os.getenv("CORS_ORIGINS", "")
        cors_origins = cors_origins_str.split(",") if cors_origins_str else [
            "http://localhost:5173",
            "http://localhost:8080",
            "http://localhost:8081",
            "http://localhost:8082",
            "http://localhost:8083",
            "http://localhost:8084",
            "http://localhost:8085"
        ]
        
        config = AppConfig(
            frontend_url=os.getenv("FRONTEND_URL", "http://localhost:5173"),
            ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
            debug_mode=os.getenv("DEBUG_MODE", "false").lower() == "true",
            log_level=os.getenv("LOG_LEVEL", "INFO"),
            cors_origins=cors_origins
        )
        logger.info("Configuration loaded successfully")
        return config
    except Exception as e:
        logger.error(f"Configuration validation failed: {e}")
        raise

# Load configuration
config = load_config()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8085"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API Endpoints --- 

@app.get("/", 
         tags=["Status"], 
         summary="Health Check",
         description="Provides a basic health check endpoint indicating the server is running.",
         responses={
             200: {
                 "description": "Successful response",
                 "content": {
                     "application/json": {
                         "example": {"message": "EPM Data Forge Backend is alive!"}
                     }
                 }
             }
         })
async def read_root():
    return {"message": "EPM Data Forge Backend is alive!"}

@app.post("/generate", 
          response_model=GenerationResponse, 
          tags=["Data Generation"], 
          summary="Generate Synthetic EPM Data",
          description="""Receives data generation configuration and triggers the agent workflow.
          
          The endpoint accepts a configuration object specifying:
          - Model type (e.g., 'FinancialPlanning', 'SalesAnalysis')
          - Dimensions and their members
          - Dependencies and rules
          - Data generation settings
          
          Returns a response containing:
          - Status message
          - Preview data
          - Any errors encountered
          """,
          responses={
              200: {
                  "description": "Successful generation",
                  "content": {
                      "application/json": {
                          "example": {
                              "message": "Data generated successfully",
                              "preview_data": [{"dim1": "value1", "dim2": "value2", "measure": 100}],
                              "errors": None
                          }
                      }
                  }
              },
              503: {
                  "description": "LLM service unavailable",
                  "content": {
                      "application/json": {
                          "example": {"detail": "LLM service connection not established."}
                      }
                  }
              },
              500: {
                  "description": "Internal server error",
                  "content": {
                      "application/json": {
                          "example": {"detail": "Internal Server Error during data generation."}
                      }
                  }
              }
          })
async def generate_data(config: GenerationConfig, request: Request):
    """Receives data generation configuration and triggers the agent workflow."""
    logger.info(f"Received /generate request for model type: {config.model_type}")
    await broadcast_status("Received generation request. Initializing coordinator...") # Initial status
    try:
        # Get the Ollama client instance
        ollama_client = get_ollama_client()
        if not ollama_client:
            logger.error("Ollama client is not available.")
            await broadcast_status("Error: Ollama client not available.")
            raise HTTPException(status_code=503, detail="LLM service connection not established.")

        # Instantiate the coordinator, potentially passing the broadcast function
        coordinator = CoordinatorAgent(status_callback=broadcast_status)

        # Run the generation process
        response_data = await coordinator.run(config)
        logger.info(f"Generation process finished for model type: {config.model_type}. Message: {response_data.message}")
        logger.info(f"Response data to be returned: {response_data}")
        await broadcast_status("Generation process finished.") # Final status
        return response_data.model_dump()

    except HTTPException: # Re-raise HTTPExceptions
        raise
    except Exception as e:
        logger.exception("Unhandled exception during /generate request.")
        await broadcast_status(f"Error: Internal server error during generation.") # Error status
        # Return a generic 500 error to the client
        raise HTTPException(status_code=500, detail="Internal Server Error during data generation.")

@app.post("/upload-analyze", 
          tags=["File Upload"], 
          summary="Upload & Analyze Model File")
async def upload_and_analyze(file: UploadFile = File(...)):
    logger.info(f"Received /upload-analyze request for file: {file.filename}")
    # --- REAL FILE ANALYSIS LOGIC ---
    if not file.content_type in ["text/csv", 
                                "application/vnd.ms-excel", 
                                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
        logger.warning(f"Invalid file content type received: {file.content_type} for file {file.filename}")
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Please upload CSV or Excel.")
    try:
        agent = ExpertModelerAgent(status_callback=broadcast_status)
        analysis_result = await agent.run(file=file)
        logger.info(f"File analysis complete for: {file.filename}. Errors: {len(analysis_result.get('errors', []))}")
        return analysis_result
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unhandled exception during /upload-analyze for file {file.filename}.")
        raise HTTPException(status_code=500, detail="Internal Server Error during file analysis.")
    finally:
        pass

@app.post("/generate-stream")
async def generate_stream(config: GenerationConfig, request: Request):
    coordinator = CoordinatorAgent(status_callback=broadcast_status)
    processed_model = {
        "model_type": config.model_type,
        "dimensions": config.dimensions,
        "identified_roles": {}
    }
    agent = DataGenerationAgent()
    stream_gen = agent.stream_data(processed_model, {}, config.settings)
    return StreamingResponse(stream_gen, media_type="application/json")

# --- WebSocket Endpoint ---
@app.websocket("/ws/status")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Send a ping message every 30 seconds to keep the connection alive
            await websocket.send_text("ping")
            logger.debug(f"Sent ping to WebSocket client: {websocket.client}")
            await asyncio.sleep(30)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        logger.info(f"WebSocket client disconnected: {websocket.client}")
    except Exception as e:
        logger.error(f"WebSocket error for client {websocket.client}: {e}", exc_info=True)
        manager.disconnect(websocket)

# Custom exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "error": str(exc),
            "traceback": traceback.format_exc() if os.getenv("DEBUG_MODE") == "true" else None
        }
    )

# Custom HTTP exception handler
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Custom handler for HTTP exceptions."""
    logger.warning(f"HTTP Exception: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Convert all error objects to strings for JSON serialization
    def serialize_error(err):
        err = dict(err)
        if 'ctx' in err and 'error' in err['ctx']:
            err['ctx']['error'] = str(err['ctx']['error'])
        return err
    errors = [serialize_error(e) for e in exc.errors()]
    return JSONResponse(
        status_code=422,
        content={"detail": errors, "body": exc.body},
    )

class SuggestStructureRequest(BaseModel):
    model_type: str

@app.post("/suggest-structure", tags=["Model Suggestion"], summary="Suggest model structure for a given model type")
async def suggest_structure(request: SuggestStructureRequest):
    """Suggests a default dimension/measures/dependencies structure for a given model type using the LLM."""
    try:
        agent = ModelDefinitionAgent()
        result = await agent.suggest_structure(request.model_type)
        return {"suggested_structure": result}
    except Exception as e:
        logger.exception(f"Error in /suggest-structure: {e}")
        return JSONResponse(status_code=500, content={"detail": "Failed to suggest structure", "error": str(e)})

# --- Run Instruction (for local development) --- 
# In your terminal:
# 1. Navigate to the project root: `cd /Users/pallavchaturvedi/PycharmProjects/epm-data-forge`
# 2. Activate virtual env (if created): `source backend/venv/bin/activate` (or `backend\venv\Scripts\activate` on Windows)
# 3. Run uvicorn: `uvicorn backend.main:app --reload --port 8000 --host 0.0.0.0`
#    (Use `--host 0.0.0.0` to make it accessible from other devices on your network if needed)
