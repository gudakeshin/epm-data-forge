# backend/agents/dependency.py
import logging
from typing import List, Dict, Any

from .base_agent import BaseAgent
from models import DependencyRule, Dimension
# Potentially import a formula parsing library later (e.g., asteval, sympy)

logger = logging.getLogger(__name__)

class DependencyAgent(BaseAgent):
    """Manages and interprets defined dimensional dependencies and business rules."""

    async def run(self, dependencies: List[DependencyRule], dimensions: List[Dimension]) -> Dict[str, Any]:
        """Processes and validates the dependency rules.

        Args:
            dependencies: A list of DependencyRule objects.
            dimensions: The list of Dimension objects (needed for validation).

        Returns:
            A dictionary containing the processed (and potentially validated/
            parsed) rules, ready for the DataGenerationAgent. Example:
            {'rules': [{'type': 'calculation', 'target': 'Revenue', 
                        'parsed_formula': <parsed_object>, ...}]}
        """
        await self._broadcast_status("Dependency Agent: Starting dependency analysis...")
        logger.info(f"DependencyAgent processing {len(dependencies)} dependency rules.")
        dimension_map = {dim.name: dim for dim in dimensions} # For quick lookup
        processed_rules = []
        errors = []

        for i, rule in enumerate(dependencies):
            logger.debug(f"Processing rule #{i+1}: Type='{rule.type}', Formula='{rule.formula}', Target='{rule.target}'")
            is_valid = True

            # --- Validation Steps --- 
            
            # 1. Check if involved dimensions/measures exist
            for involved in rule.involved_dimensions:
                # Need a clear way to distinguish dimensions from measures mentioned in rules
                # Assuming for now they refer to dimension names or defined measures (e.g., 'Value')
                # This part needs refinement based on how measures are defined/handled
                # if involved not in dimension_map and involved != 'Value': # Example check
                #     msg = f"Rule #{i+1}: Involved item '{involved}' not found in dimensions or known measures."
                #     logger.warning(msg)
                #     errors.append(msg)
                #     is_valid = False
                pass # Placeholder for improved validation

            # 2. Validate rule structure based on type
            if rule.type == 'calculation':
                if not rule.formula or not rule.target:
                    msg = f"Rule #{i+1} (Calculation): Missing 'formula' or 'target'."
                    logger.warning(msg)
                    errors.append(msg)
                    is_valid = False
                else:
                    # TODO: Attempt to parse the formula string (Syntax Check)
                    # Example using a placeholder function `parse_formula`
                    try:
                        # parsed = self.parse_formula(rule.formula)
                        # rule.parsed_formula = parsed # Store parsed version if successful
                        pass # Placeholder for parsing logic
                    except Exception as e:
                        msg = f"Rule #{i+1}: Formula '{rule.formula}' parsing failed: {e}"
                        logger.warning(msg)
                        errors.append(msg)
                        is_valid = False
            
            # TODO: Add validation logic for 'allocation', 'validation', etc.
            elif rule.type == 'allocation':
                 if not rule.target or not rule.involved_dimensions or not rule.parameters:
                     msg = f"Rule #{i+1} (Allocation): Missing 'target', 'involved_dimensions', or 'parameters'."
                     logger.warning(msg)
                     errors.append(msg)
                     is_valid = False
            # ... other rule types

            # --- Store Processed Rule --- 
            if is_valid:
                 # Store the rule (potentially with parsed elements added)
                 processed_rules.append(rule.dict()) 
            else:
                logger.warning(f"Rule #{i+1} failed validation and was skipped.")

        # --- Return Processed Info --- 
        dependency_info = {
            "rules": processed_rules,
            "validation_errors": errors # Include errors encountered
        }

        logger.info(f"DependencyAgent finished processing. {len(processed_rules)} rules ready, {len(errors)} validation errors.")
        # logger.debug(f"Processed dependency info: {dependency_info}")
        await self._broadcast_status("Dependency Agent: Dependency analysis complete.")
        return dependency_info

    # Placeholder for a potential formula parsing method
    # def parse_formula(self, formula_str: str):
    #     """Parses a formula string into an executable structure."""
    #     # Use libraries like asteval, sympy, or custom parsing
    #     logger.debug(f"Parsing formula: {formula_str}")
    #     # Example: return some parsed object or raise error
    #     if "=" not in formula_str: raise ValueError("Invalid formula format")
    #     # Replace with actual parsing logic
    #     return {'raw': formula_str} # Placeholder

