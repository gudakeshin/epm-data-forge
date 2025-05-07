import logging
import json
from typing import Dict, Any, Optional, List

# Ensure Pydantic models are correctly imported
from models import Dimension, DependencyRule 
from .base_agent import BaseAgent
from llm.client import generate_text_async # Import the async function

logger = logging.getLogger(__name__)

class ModelDefinitionAgent(BaseAgent):
    """
    Uses an LLM to suggest initial dimensions and dependencies based on a 
    high-level EPM model type.
    """

    async def suggest_structure(self, model_type: str) -> Dict[str, Any]:
        """Suggest a model structure based on the model type.
        
        Args:
            model_type: Type of model to generate structure for.
        """
        await self._broadcast_status("Model Definition Agent: Starting model structure suggestion...")
        logger.info(f"ModelDefinitionAgent suggesting structure for model type: {model_type}")
        prompt = self._build_suggestion_prompt(model_type)
        
        suggested_dimensions = []
        suggested_dependencies = []

        try:
            logger.debug(f"Sending prompt to LLM:\n{prompt}")
            # Use the imported function directly
            raw_response = await generate_text_async(prompt)
            logger.debug(f"Raw LLM response received:\n{raw_response}")

            if raw_response:
                # Attempt to parse the LLM response as JSON
                parsed_response = self._parse_llm_json_response(raw_response)
                
                if parsed_response:
                    # Validate and extract dimensions 
                    # (Basic check; relies on Pydantic validation elsewhere if needed)
                    if isinstance(parsed_response.get('dimensions'), list):
                        suggested_dimensions = [
                            d for d in parsed_response['dimensions'] 
                            if isinstance(d, dict) and 'name' in d and 'members' in d and isinstance(d['members'], list)
                        ]
                        logger.info(f"Successfully parsed {len(suggested_dimensions)} suggested dimensions.")
                    else:
                         logger.warning("LLM response JSON did not contain a valid 'dimensions' list.")

                    # Validate and extract dependencies
                    if isinstance(parsed_response.get('dependencies'), list):
                        suggested_dependencies = [
                             dep for dep in parsed_response['dependencies']
                             if isinstance(dep, dict) and 'type' in dep and 'involved_dimensions' in dep and isinstance(dep['involved_dimensions'], list) 
                             # Add more checks based on DependencyRule required fields if needed
                        ]
                        logger.info(f"Successfully parsed {len(suggested_dependencies)} suggested dependencies.")
                    else:
                        logger.warning("LLM response JSON did not contain a valid 'dependencies' list.")
                else:
                    logger.warning("Failed to parse structured JSON from LLM response.")
            else:
                logger.warning("LLM did not return a response.")

        except Exception as e:
            logger.error(f"Error during LLM interaction or parsing in ModelDefinitionAgent: {e}", exc_info=True)
            # Keep suggested lists empty on error

        await self._broadcast_status("Model Definition Agent: LLM suggestion complete.")
        return {
            "suggested_dimensions": suggested_dimensions,
            "suggested_dependencies": suggested_dependencies
        }

    def _build_suggestion_prompt(self, model_type: str) -> str:
        """Build a prompt for suggesting model structure."""
        model_context = f"a {model_type} model"
        return f"""Suggest a comprehensive structure for {model_context} in EPM/CPM systems.

        Instructions:
        1. Suggest 3-5 typical Dimensions commonly found in this type of model.
        2. For each Dimension, provide its 'name' and a small list ('members') of 3-5 example members. Example: {{"name": "Region", "members": ["North", "South", "East", "West"]}}
        3. Suggest 1-3 common Dependency Rules (calculations, allocations, or validations) relevant to this model type.
        4. For each Dependency Rule, provide its 'type', the 'formula' (if applicable, keep it simple like 'X = Y * Z'), the 'involved_dimensions' (list of relevant dimension names), and the 'target' dimension/member (if applicable). Example: {{"type": "calculation", "formula": "Margin = Revenue - COGS", "involved_dimensions": ["Account"], "target": "Margin"}}
        5. Format your entire response STRICTLY as a single JSON object enclosed in triple backticks (```json ... ```). The JSON object must have exactly two keys: "dimensions" and "dependencies".
           - "dimensions" must be a JSON list of dimension objects.
           - "dependencies" must be a JSON list of dependency rule objects.
        6. Ensure the JSON is valid and complete. Do not include any explanations, apologies, or text outside the ```json ... ``` block.

        Example JSON Output Format:
        ```json
        {{
          "dimensions": [
            {{ "name": "Time", "members": ["Jan", "Feb", "Mar", "Apr"] }},
            {{ "name": "Product", "members": ["P100", "P200", "P300"] }},
            {{ "name": "Account", "members": ["Revenue", "COGS", "Margin"] }},
            {{ "name": "Scenario", "members": ["Actual", "Budget", "Forecast"] }}
          ],
          "dependencies": [
            {{ "type": "calculation", "formula": "Margin = Revenue - COGS", "involved_dimensions": ["Account"], "target": "Margin" }}
          ]
        }}
        ```

        Now, provide the JSON structure for the '{model_type}' model type:
        """
        # Using strip() might remove leading/trailing whitespace helpful for model parsing
        return prompt 


    def _parse_llm_json_response(self, response_text: str) -> Optional[Dict[str, Any]]:
        """Attempts to parse the LLM response text expecting a ```json ... ``` block."""
        try:
            # Look for the JSON block enclosed in triple backticks
            json_block_start = response_text.find("```json")
            json_block_end = response_text.rfind("```") # Find the last triple backticks

            if json_block_start != -1 and json_block_end != -1 and json_block_end > json_block_start:
                # Extract the content between the markers
                json_str = response_text[json_block_start + len("```json") : json_block_end].strip()
                
                # Basic check if it looks like a JSON object
                if not json_str.startswith('{') or not json_str.endswith('}'):
                    logger.warning("Extracted string doesn't look like a JSON object.")
                    # Try finding the first '{' and last '}' as a fallback
                    json_start_fallback = response_text.find('{')
                    json_end_fallback = response_text.rfind('}')
                    if json_start_fallback != -1 and json_end_fallback != -1:
                         json_str = response_text[json_start_fallback : json_end_fallback + 1]
                    else:
                         logger.error("Could not extract valid JSON content from response.")
                         return None

                parsed_data = json.loads(json_str)
                if isinstance(parsed_data, dict):
                    # Further check if it contains the expected keys
                    if 'dimensions' in parsed_data and 'dependencies' in parsed_data:
                        return parsed_data
                    else:
                        logger.warning("Parsed JSON dictionary is missing 'dimensions' or 'dependencies' key.")
                        return None
                else:
                    logger.warning(f"Parsed JSON is not a dictionary: {type(parsed_data)}")
                    return None
            else:
                logger.warning("Could not find ```json ... ``` block in LLM response.")
                 # Fallback: try finding the first '{' and last '}'
                json_start_fallback = response_text.find('{')
                json_end_fallback = response_text.rfind('}')
                if json_start_fallback != -1 and json_end_fallback != -1:
                     json_str = response_text[json_start_fallback : json_end_fallback + 1]
                     try:
                         parsed_data = json.loads(json_str)
                         if isinstance(parsed_data, dict) and 'dimensions' in parsed_data and 'dependencies' in parsed_data:
                              return parsed_data
                     except json.JSONDecodeError:
                         logger.error("Fallback JSON parsing failed.")
                         return None
                logger.error("Could not extract JSON object from response using any method.")
                return None
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON from LLM response: {e}")
            logger.debug(f"Response text causing error:\n{response_text}")
            return None
        except Exception as e:
            logger.error(f"An unexpected error occurred during JSON parsing: {e}", exc_info=True)
            return None
            
    async def run(self, **kwargs) -> Dict[str, Any]:
        """Run the model definition process."""
        await self._broadcast_status("Model Definition Agent: Starting model structure suggestion...")
        result = await self.suggest_structure(model_type=kwargs['model_type'])
        await self._broadcast_status("Model Definition Agent: Model structure suggestion finished.")
        return result