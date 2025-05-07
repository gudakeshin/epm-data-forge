# backend/agents/base_agent.py
import logging
from abc import ABC, abstractmethod
from typing import Optional, Callable, Awaitable

from llm.client import generate_text_async, check_ollama_connection

logger = logging.getLogger(__name__)

class BaseAgent(ABC):
    """Base class for all agents in the EPM Data Forge."""

    def __init__(self, status_callback: Optional[Callable[[str], Awaitable[None]]] = None):
        """
        Initializes the BaseAgent.

        Args:
            status_callback: An optional async function to call for broadcasting status updates.
        """
        self._status_callback = status_callback
        logger.info(f"{self.__class__.__name__} initialized.")

    async def _broadcast_status(self, message: str):
        """Sends a status update if a callback function is provided."""
        if self._status_callback:
            try:
                await self._status_callback(message)
            except Exception as e:
                logger.error(f"Error broadcasting status update: {e}", exc_info=True)
        else:
             # Log locally if no callback is provided, useful for testing/debugging agents directly
             logger.debug(f"Status Update (no callback): {message}")

    @abstractmethod
    async def run(self, *args, **kwargs):
        """Main execution method for the agent. Should be overridden by subclasses."""
        raise NotImplementedError("Subclasses must implement the 'run' method.")
