import logging
import time
from typing import List, Dict, Any, Optional, Callable, Awaitable

# Ensure correct imports
from models import GenerationConfig, GenerationResponse, Dimension, DependencyRule
from llm.client import check_ollama_connection # Import necessary functions
from .base_agent import BaseAgent
from .model_definition import ModelDefinitionAgent
from .dependency import DependencyAgent
from .data_generation import DataGenerationAgent
from .validation_formatting import ValidationFormattingAgent

logger = logging.getLogger(__name__)

class CoordinatorAgent(BaseAgent):
    """Manages the overall data generation workflow, orchestrating other agents."""

    def __init__(self, status_callback: Optional[Callable[[str], Awaitable[None]]] = None):
        """Initialize the coordinator and all sub-agents."""
        super().__init__(status_callback=status_callback)
        
        # Initialize specialized agents, passing the status_callback if they need it
        try:
            # Ensure agent classes accept status_callback in their __init__
            self.model_def_agent = ModelDefinitionAgent(status_callback=status_callback)
            self.dependency_agent = DependencyAgent(status_callback=status_callback) 
            self.data_gen_agent = DataGenerationAgent(status_callback=status_callback) 
            self.validation_agent = ValidationFormattingAgent(status_callback=status_callback) 
            logger.info("CoordinatorAgent initialized successfully with all specialized agents.")
        except TypeError as te:
            logger.error(f"Initialization error: An agent's __init__ might be missing 'status_callback'. Error: {te}", exc_info=True)
            raise RuntimeError(f"Failed to initialize coordinator's sub-agents due to TypeError: {te}") from te
        except Exception as e:
            logger.error(f"Error initializing specialized agents within CoordinatorAgent: {e}", exc_info=True)
            raise RuntimeError("Failed to initialize coordinator's sub-agents.") from e

    async def run(self, config: GenerationConfig) -> GenerationResponse:
        """Orchestrates the data generation process step-by-step."""
        start_time_total = time.time()
        await self._broadcast_status(f"Coordinator Agent: Starting generation process for model type: {config.model_type}...")
        logger.info(f"Coordinator starting generation process for model: {config.model_type}")
        errors: List[str] = []
        preview_data: List[Dict[str, Any]] = []
        message = "Data generation initiated."

        try:
            # === Pre-Step: Check LLM Connection ===
            start_time_step = time.time()
            await self._broadcast_status("Coordinator Agent: Checking LLM connection...")
            logger.info("Coordinator [Step 0/4]: Checking LLM connection...")
            is_connected = await check_ollama_connection()
            if not is_connected:
                raise RuntimeError("Failed to connect to Ollama server. Please ensure it is running.")
            step_duration = time.time() - start_time_step
            logger.info(f"Coordinator [Step 0/4] completed in {step_duration:.2f} seconds.")
            await self._broadcast_status("Coordinator Agent: LLM connection checked.")

            # Step 1: Process Provided Model Definition (Placeholder/Refinement Stage)
            start_time_step = time.time()
            await self._broadcast_status("Coordinator Agent: Step 1/4: Processing model definition...")
            logger.info("Coordinator [Step 1/4]: Using provided model definition (dimensions, etc.).")
            # Example: Create a processed structure based *only* on input config for now
            processed_model = {
                 "model_type": config.model_type,
                 "dimensions": config.dimensions, # Use directly from input for now
                 "identified_roles": {} # Role identification could be another LLM call or heuristic
             } 
            step_duration = time.time() - start_time_step
            logger.info(f"Coordinator [Step 1/4] completed in {step_duration:.2f} seconds.")

            # Step 2: Process Dependencies
            start_time_step = time.time()
            await self._broadcast_status("Coordinator Agent: Step 2/4: Analyzing dependencies...")
            logger.info("Coordinator [Step 2/4]: Processing dependencies...")
            processed_dependencies = await self.dependency_agent.run(config.dependencies or [], config.dimensions)
            logger.info(f"Coordinator [Step 2/4]: Dependencies processed.")
            step_duration = time.time() - start_time_step
            logger.info(f"Coordinator [Step 2/4] completed in {step_duration:.2f} seconds.")
            await self._broadcast_status("Coordinator Agent: Step 2/4: Dependencies processed.")
            # logger.debug(f"Processed Dependencies: {processed_dependencies}")

            # Step 3: Generate Data
            start_time_step = time.time()
            await self._broadcast_status("Coordinator Agent: Step 3/4: Generating synthetic data records...")
            logger.info("Coordinator [Step 3/4]: Generating data...")
            generated_data = await self.data_gen_agent.run(
                processed_model=processed_model,
                processed_dependencies=processed_dependencies,
                settings=config.settings
            )
            logger.info(f"Coordinator [Step 3/4]: Data generation complete. Generated {len(generated_data)} raw records.")
            step_duration = time.time() - start_time_step
            logger.info(f"Coordinator [Step 3/4] completed in {step_duration:.2f} seconds.")
            await self._broadcast_status("Coordinator Agent: Step 3/4: Data generation complete.")

            # Step 4: Validate and Format
            start_time_step = time.time()
            await self._broadcast_status("Coordinator Agent: Step 4/4: Validating and formatting data...")
            logger.info("Coordinator [Step 4/4]: Validating and formatting data...")
            final_data, validation_errors = await self.validation_agent.run(
                raw_data=generated_data,
                config=config
            )
            errors.extend(validation_errors)
            logger.info(f"Coordinator [Step 4/4]: Validation and formatting complete. {len(final_data)} final records. Found {len(validation_errors)} issues.")

            # Prepare preview data (e.g., first 100 rows or a sample)
            preview_limit = 100 # Consider making this configurable via settings
            preview_data = final_data[:preview_limit]
            logger.info(f"Prepared preview with {len(preview_data)} records.")

            step_duration = time.time() - start_time_step
            logger.info(f"Coordinator [Step 4/4] (incl. preview prep) completed in {step_duration:.2f} seconds.")
            await self._broadcast_status("Coordinator Agent: Step 4/4: Validation and formatting complete.")

            message = "Data generation completed successfully." if not errors else "Data generation completed with warnings/errors."
            await self._broadcast_status(f"Coordinator Agent: Status: {message}")

        except NotImplementedError as nie:
            logger.error(f"A required agent method is not implemented: {nie}", exc_info=True)
            await self._broadcast_status(f"Error: Feature not implemented - {nie}")
            message = f"Generation failed: Feature not implemented ({nie})"
            errors.append(message)
        except Exception as e:
            logger.exception("Coordinator encountered an unexpected error during the generation process.") # Log full traceback
            await self._broadcast_status(f"Error: An unexpected error occurred.")
            message = "An unexpected error occurred during data generation."
            # Avoid exposing internal error details directly in the response for security
            errors.append("An internal error stopped the generation process.") 

        total_duration = time.time() - start_time_total
        logger.info(f"Coordinator finished generation process in {total_duration:.2f} seconds.")
        await self._broadcast_status("Coordinator Agent: Process finished.")
        return GenerationResponse(
            message=message,
            preview_data=preview_data,
            errors=errors if errors else None # Return None if errors list is empty
        )
