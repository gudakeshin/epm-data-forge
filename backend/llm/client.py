import os
import ollama
import httpx
from dotenv import load_dotenv
from typing import Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file in the backend directory
# Construct the path relative to this file's location
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
LLM_MODEL = os.getenv("LLM_MODEL", "gemma3:4b")

# Initialize the Ollama client
# Use httpx client for potential async usage later and explicit timeout
# Handle potential initialization error if URL is malformed, etc.
try:
    client = ollama.Client(host=OLLAMA_BASE_URL, timeout=60) # 60 second timeout
    logger.info(f"Ollama client initialized for host: {OLLAMA_BASE_URL}")
except Exception as e:
    logger.error(f"Failed to initialize Ollama client: {e}", exc_info=True)
    client = None # Ensure client is None if initialization fails

def get_ollama_client():
    """Returns the initialized Ollama client, if available."""
    if client is None:
        logger.error("Ollama client was not initialized successfully.")
        # Optionally try re-initializing, but better to fix config and restart app
    return client

async def check_ollama_connection():
    """Checks if the Ollama server is accessible using the initialized client."""
    ollama_client = get_ollama_client()
    if not ollama_client:
        return False
        
    try:
        # A lightweight way to check: list local models
        ollama_client.list()
        # logger.info(f"Successfully connected to Ollama at {OLLAMA_BASE_URL}") # Reduced verbosity
        return True
    except (httpx.ConnectError, ollama.ResponseError) as e:
        # Log specific connection or response errors
        if isinstance(e, httpx.ConnectError):
            logger.error(f"Failed to connect to Ollama server at {OLLAMA_BASE_URL}: {e}")
        else:
            logger.error(f"Ollama server returned an error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error checking Ollama connection: {e}", exc_info=True)
        return False

def generate_text(prompt: str, model: Optional[str] = None) -> Optional[str]:
    """Generates text using the configured Ollama model (synchronous)."""
    ollama_client = get_ollama_client()
    if not ollama_client:
        return None
        
    target_model = model or LLM_MODEL
    # Optional: Check connection before every call, or rely on startup check + error handling
    # if not check_ollama_connection(): 
    #     return None

    try:
        logger.info(f"Sending prompt to Ollama model: {target_model}")
        # logger.debug(f"Prompt content (truncated): {prompt[:200]}...")
        response = ollama_client.generate(model=target_model, prompt=prompt, stream=False)
        logger.info(f"Received response from Ollama model: {target_model}")
        # Ensure 'response' key exists before returning
        return response.get('response') if response else None
    except ollama.ResponseError as e:
        logger.error(f"Ollama API error during generation: {e.status_code} - {e.error}")
        return None
    except httpx.RequestError as e:
        # More specific error for network/request issues
        logger.error(f"Network error communicating with Ollama at {OLLAMA_BASE_URL}: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during Ollama generation: {e}", exc_info=True)
        return None

# Example async version (if needed by agents in the future)
async def generate_text_async(prompt: str, model: Optional[str] = None) -> Optional[str]:
    """Generates text using the configured Ollama model (asynchronous)."""
    # Note: The current 'ollama' library uses httpx sync client internally.
    # For true async, would need ollama.AsyncClient or direct httpx async calls.
    # This implementation simulates async by wrapping the sync call.
    # Consider using a library like 'anyio' to run sync code in async context properly.
    # For now, keeping it simple:
    logger.warning("generate_text_async is currently wrapping the synchronous client call.")
    return generate_text(prompt, model)

# Example usage block for direct script execution
if __name__ == "__main__":
    print("Running Ollama client checks...")
    if check_ollama_connection():
        print("Ollama connection successful.")
        test_prompt = "Briefly explain the concept of Enterprise Performance Management (EPM)."
        print(f"\nTesting Ollama with prompt: '{test_prompt}'")
        result = generate_text(test_prompt)
        if result:
            print("\nOllama Response:")
            print(result)
        else:
            print("\nFailed to get response from Ollama.")
    else:
        print("\nCould not connect to Ollama. Please check configuration and ensure Ollama is running.")
