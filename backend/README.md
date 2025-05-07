# EPM Data Forge - Backend

This directory contains the Python FastAPI backend for the EPM Data Forge application.

## Setup

1.  **Ensure Python 3.9+ is installed.**
2.  **Install Ollama:** Make sure you have Ollama installed and running. Download it from [https://ollama.com/](https://ollama.com/).
3.  **Pull a Gemma model:** Run `ollama pull gemma3:4b` (or your preferred model, update `.env` accordingly).
4.  **Create a virtual environment (recommended):**
    ```bash
    # Navigate to the 'backend' directory first
    cd backend 
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```
5.  **Install dependencies:**
    ```bash
    # Make sure your virtual environment is active
    pip install -r requirements.txt
    ```
6.  **Configure environment variables:**
    *   Copy `.env.example` to `.env`.
    *   Edit `.env` and update `OLLAMA_BASE_URL` if your Ollama instance is not running on the default `http://localhost:11434`.
    *   Update `LLM_MODEL` if you are using a different model than `gemma:2b`.
    *   Uncomment and set `FRONTEND_URL` if your frontend runs on a different port/address.

## Running the Backend

```bash
# Make sure you are in the 'backend' directory and your venv is active
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`. You can access the interactive API documentation (Swagger UI) at `http://localhost:8000/docs`.
