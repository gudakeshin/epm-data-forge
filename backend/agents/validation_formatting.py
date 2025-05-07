# backend/agents/validation_formatting.py
import logging
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Tuple

from .base_agent import BaseAgent
from models import GenerationConfig

logger = logging.getLogger(__name__)

class ValidationFormattingAgent(BaseAgent):
    """Validates the generated data against constraints and formats it for output."""

    async def run(self, raw_data: List[Dict[str, Any]], config: GenerationConfig) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Performs validation checks and formats the data for preview using vectorized operations."""
        await self._broadcast_status("Validation Agent: Starting validation and formatting...")
        logger.info(f"ValidationFormattingAgent starting for {len(raw_data)} records.")
        errors: List[str] = []
        formatted_data: List[Dict[str, Any]] = raw_data

        if not raw_data:
            logger.warning("No raw data provided to validate or format.")
            return [], []

        try:
            # Convert to DataFrame for vectorized operations
            df = pd.DataFrame(raw_data)
            logger.debug(f"Data converted to DataFrame with shape: {df.shape}")

            # --- Validation Steps Using Vectorized Operations --- 

            # 1. Check for Missing/Extra Columns
            await self._broadcast_status("Validation Agent: Checking for missing/extra columns...")
            dim_names = [d.name for d in config.dimensions]
            if not df.empty:
                all_expected_columns = set(dim_names)
                potential_measures = set(df.columns) - set(dim_names)
                all_expected_columns.update(potential_measures)
                
                # Vectorized column existence check
                missing_cols = all_expected_columns - set(df.columns)
                if missing_cols:
                    msg = f"Validation Error: DataFrame is missing expected columns: {missing_cols}"
                    logger.error(msg)
                    errors.append(msg)

                extra_cols = set(df.columns) - all_expected_columns
                if extra_cols:
                    msg = f"Validation Warning: DataFrame has unexpected extra columns: {extra_cols}"
                    logger.warning(msg)
                    errors.append(msg)

            # 2. Data Type Validation and Conversion
            # Identify numeric columns (excluding dimension columns)
            await self._broadcast_status("Validation Agent: Validating and converting data types...")
            numeric_cols = df.select_dtypes(include=[np.number]).columns
            measure_cols = set(numeric_cols) - set(dim_names)
            
            for col in measure_cols:
                # Vectorized numeric validation
                invalid_mask = pd.to_numeric(df[col], errors='coerce').isna()
                if invalid_mask.any():
                    num_invalid = invalid_mask.sum()
                    msg = f"Validation Warning: Found {num_invalid} non-numeric entries in '{col}' column. They were converted to NaN."
                    logger.warning(msg)
                    errors.append(msg)
                    # Convert to numeric, replacing invalid values with NaN
                    df[col] = pd.to_numeric(df[col], errors='coerce')

            # 3. Value Range Validation
            # Example: Check for negative values in measures
            await self._broadcast_status("Validation Agent: Checking for negative values in measures...")
            for col in measure_cols:
                if (df[col] < 0).any():
                    num_negative = (df[col] < 0).sum()
                    msg = f"Validation Warning: Found {num_negative} negative values in '{col}' column."
                    logger.warning(msg)
                    errors.append(msg)

            # 4. Dependency Rule Validation
            if config.dependencies:
                for dep in config.dependencies:
                    if dep.type == 'calculation':
                        try:
                            # Parse formula and validate using vectorized operations
                            parts = dep.formula.split('=')
                            if len(parts) == 2:
                                target = parts[0].strip()
                                expr = parts[1].strip()
                                if '*' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('*')]
                                    if op1 in df.columns and op2 in df.columns and target in df.columns:
                                        expected = df[op1] * df[op2]
                                        actual = df[target]
                                        mismatches = ~np.isclose(expected, actual, rtol=1e-4, atol=1e-2)
                                        num_mismatches = mismatches.sum()
                                        if num_mismatches > 0:
                                            msg = f"Validation Error: {num_mismatches} rows do not satisfy '{dep.formula}'."
                                            logger.warning(msg)
                                            errors.append(msg)
                                elif '+' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('+')]
                                    if op1 in df.columns and op2 in df.columns and target in df.columns:
                                        expected = df[op1] + df[op2]
                                        actual = df[target]
                                        mismatches = ~np.isclose(expected, actual, rtol=1e-4, atol=1e-2)
                                        num_mismatches = mismatches.sum()
                                        if num_mismatches > 0:
                                            msg = f"Validation Error: {num_mismatches} rows do not satisfy '{dep.formula}'."
                                            logger.warning(msg)
                                            errors.append(msg)
                                elif '-' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('-')]
                                    if op1 in df.columns and op2 in df.columns and target in df.columns:
                                        expected = df[op1] - df[op2]
                                        actual = df[target]
                                        mismatches = ~np.isclose(expected, actual, rtol=1e-4, atol=1e-2)
                                        num_mismatches = mismatches.sum()
                                        if num_mismatches > 0:
                                            msg = f"Validation Error: {num_mismatches} rows do not satisfy '{dep.formula}'."
                                            logger.warning(msg)
                                            errors.append(msg)
                                elif '/' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('/')]
                                    if op1 in df.columns and op2 in df.columns and target in df.columns:
                                        # Avoid division by zero
                                        expected = df[op1] / df[op2].replace(0, np.nan)
                                        actual = df[target]
                                        mismatches = ~np.isclose(expected, actual, rtol=1e-4, atol=1e-2)
                                        num_mismatches = mismatches.sum()
                                        if num_mismatches > 0:
                                            msg = f"Validation Error: {num_mismatches} rows do not satisfy '{dep.formula}'."
                                            logger.warning(msg)
                                            errors.append(msg)
                        except Exception as e:
                            msg = f"Validation Warning: Error checking calculation rule '{dep.formula}': {str(e)}"
                            logger.warning(msg)
                            errors.append(msg)

            # --- Formatting Steps Using Vectorized Operations --- 

            # 1. Column Ordering
            if not df.empty and not missing_cols:
                ordered_columns = dim_names + sorted(list(potential_measures))
                try:
                    df = df[ordered_columns]
                    logger.debug("DataFrame columns reordered.")
                except KeyError as e:
                    msg = f"Formatting Error: Could not reorder columns. Missing expected column: {e}"
                    logger.error(msg)
                    errors.append(msg)

            # 2. Handle NaN values (optional)
            # Example: Fill NaNs with 0 for numeric columns
            if measure_cols:
                df[list(measure_cols)] = df[list(measure_cols)].fillna(0)

            # 3. Round numeric values
            await self._broadcast_status("Validation Agent: Rounding numeric values...")
            if measure_cols:
                df[list(measure_cols)] = df[list(measure_cols)].round(2)

            # Convert back to list of dictionaries
            formatted_data = df.to_dict('records')

        except Exception as e:
            logger.exception("An error occurred during validation or formatting.")
            errors.append(f"Internal error during validation/formatting: {e}")
            formatted_data = raw_data
        
        await self._broadcast_status(f"Validation Agent: Validation and formatting finished. {len(formatted_data)} records, {len(errors)} issues.")
        logger.info(f"ValidationFormattingAgent finished. Returning {len(formatted_data)} records with {len(errors)} issues.")
        return formatted_data, errors
