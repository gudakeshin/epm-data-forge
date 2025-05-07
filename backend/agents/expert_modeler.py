# backend/agents/expert_modeler.py
import logging
from typing import Dict, Any, List, Optional, Callable, Awaitable
import pandas as pd
import numpy as np
from fastapi import UploadFile
import io
import asyncio

from .base_agent import BaseAgent
from models import Dimension # Assuming we'll suggest Dimension objects
from llm.client import generate_text_async # Import the async function

logger = logging.getLogger(__name__)

class ExpertModelerAgent(BaseAgent):
    """
    Analyzes uploaded files (CSV/Excel) to extract potential model dimensions
    and provide initial insights using vectorized operations.
    """

    def __init__(self, status_callback: Optional[Callable[[str], Awaitable[None]]] = None):
        # LLM might be optional initially, depending on whether we use it
        # for commentary immediately.
        super().__init__(status_callback=status_callback)
        logger.info("ExpertModelerAgent initialized.")

    async def analyze_upload(self, file: UploadFile) -> Dict[str, Any]:
        """
        Reads an uploaded file, extracts headers, and potentially sample data.

        Args:
            file: The uploaded file object (from FastAPI).

        Returns:
            A dictionary containing extracted dimensions and any commentary.
            Example:
            {
                "extracted_dimensions": [{"name": "Col1", "members": ["a", "b"]}, ...],
                "commentary": "File read successfully. Found 5 columns.",
                "errors": []
            }
        """
        await self._broadcast_status("Expert Modeler Agent: Starting file analysis...")
        logger.info(f"ExpertModelerAgent analyzing uploaded file: {file.filename} ({file.content_type})")
        extracted_dimensions: List[Dict[str, Any]] = []
        commentary = ""
        errors: List[str] = []

        try:
            # Read file content into memory
            content = await file.read()
            
            # Determine file type and read using pandas with optimized settings
            df = None
            if file.filename.endswith('.csv'):
                # Use optimized CSV reading with chunking for large files
                df = pd.read_csv(
                    io.BytesIO(content),
                    engine='c',  # Use C engine for better performance
                    dtype_backend='numpy_nullable',  # Use numpy backend for better memory efficiency
                    low_memory=True  # Enable low memory mode for large files
                )
                commentary = f"Successfully read CSV file '{file.filename}'. Found {len(df.columns)} columns."
            elif file.filename.endswith(('.xlsx', '.xls')):
                # Read Excel with optimized settings
                df = pd.read_excel(
                    io.BytesIO(content),
                    sheet_name=0,
                    engine='openpyxl',
                    dtype_backend='numpy_nullable'
                )
                commentary = f"Successfully read Excel file '{file.filename}' (first sheet). Found {len(df.columns)} columns."
            else:
                errors.append(f"Unsupported file type: {file.filename}. Please upload a CSV or Excel file.")
                logger.warning(f"Unsupported file type received: {file.filename}")

            if df is not None:
                # Vectorized column analysis
                for col_name in df.columns:
                    # Get unique values efficiently using numpy
                    unique_values = df[col_name].dropna().unique()
                    
                    # Calculate basic statistics for numeric columns
                    is_numeric = pd.api.types.is_numeric_dtype(df[col_name])
                    stats = {}
                    if is_numeric:
                        stats = {
                            'min': float(df[col_name].min()),
                            'max': float(df[col_name].max()),
                            'mean': float(df[col_name].mean()),
                            'std': float(df[col_name].std())
                        }
                    
                    # Get sample members efficiently
                    sample_size = min(10, len(unique_values))
                    if len(unique_values) > sample_size:
                        # Use numpy's random choice for efficient sampling
                        sample_members = np.random.choice(unique_values, size=sample_size, replace=False)
                    else:
                        sample_members = unique_values
                    
                    # Create dimension info
                    dimension_info = {
                        "name": str(col_name),
                        "members": [str(m) for m in sample_members],
                        "type": "numeric" if is_numeric else "categorical",
                        "unique_count": len(unique_values),
                        "null_count": int(df[col_name].isna().sum())
                    }
                    
                    if stats:
                        dimension_info["statistics"] = stats
                    
                    extracted_dimensions.append(dimension_info)
                
                await self._broadcast_status(f"Expert Modeler Agent: Extracted {len(extracted_dimensions)} potential dimensions from headers.")
                
                # Add file-level statistics
                file_stats = {
                    "total_rows": len(df),
                    "total_columns": len(df.columns),
                    "memory_usage": df.memory_usage(deep=True).sum() / 1024 / 1024,  # MB
                    "null_percentage": (df.isna().sum().sum() / (df.shape[0] * df.shape[1])) * 100
                }
                commentary += f"\nFile statistics: {len(df)} rows, {len(df.columns)} columns, {file_stats['memory_usage']:.2f} MB, {file_stats['null_percentage']:.1f}% null values."

        except pd.errors.EmptyDataError:
            errors.append(f"The uploaded file '{file.filename}' appears to be empty.")
            logger.warning(f"Uploaded file '{file.filename}' is empty.")
        except Exception as e:
            error_msg = f"Error analyzing file '{file.filename}': {str(e)}"
            errors.append(error_msg)
            logger.exception(error_msg)

        # Ensure filename is closed if necessary (FastAPI handles this with UploadFile context)
        # await file.close() # Usually not needed with FastAPI's UploadFile

        await self._broadcast_status("Expert Modeler Agent: File analysis finished.")

        return {
            "extracted_dimensions": extracted_dimensions,
            "commentary": commentary,
            "errors": errors
        }

    async def run(self, file: UploadFile) -> Dict[str, Any]:
        """Analyzes the uploaded file to extract dimensions and provide insights."""
        await self._broadcast_status("Expert Modeler Agent: Starting file analysis...")
        logger.info(f"Starting analysis of file: {file.filename}")
        extracted_dimensions: List[Dict[str, Any]] = []
        errors: List[str] = []
        commentary: str = ""

        try:
            # Read file content into memory
            content = await file.read()
            
            # Determine file type and read using pandas with optimized settings
            df = None
            if file.filename.endswith('.csv'):
                # Use optimized CSV reading with chunking for large files
                df = pd.read_csv(
                    io.BytesIO(content),
                    engine='c',  # Use C engine for better performance
                    dtype_backend='numpy_nullable',  # Use numpy backend for better memory efficiency
                    low_memory=True  # Enable low memory mode for large files
                )
                commentary = f"Successfully read CSV file '{file.filename}'. Found {len(df.columns)} columns."
            elif file.filename.endswith(('.xlsx', '.xls')):
                # Read Excel with optimized settings
                df = pd.read_excel(
                    io.BytesIO(content),
                    sheet_name=0,
                    engine='openpyxl',
                    dtype_backend='numpy_nullable'
                )
                commentary = f"Successfully read Excel file '{file.filename}' (first sheet). Found {len(df.columns)} columns."
            else:
                errors.append(f"Unsupported file type: {file.filename}. Please upload a CSV or Excel file.")
                logger.warning(f"Unsupported file type received: {file.filename}")

            if df is not None:
                # Vectorized column analysis
                for col_name in df.columns:
                    # Get unique values efficiently using numpy
                    unique_values = df[col_name].dropna().unique()
                    
                    # Calculate basic statistics for numeric columns
                    is_numeric = pd.api.types.is_numeric_dtype(df[col_name])
                    stats = {}
                    if is_numeric:
                        stats = {
                            'min': float(df[col_name].min()),
                            'max': float(df[col_name].max()),
                            'mean': float(df[col_name].mean()),
                            'std': float(df[col_name].std())
                        }
                    
                    # Get sample members efficiently
                    sample_size = min(10, len(unique_values))
                    if len(unique_values) > sample_size:
                        # Use numpy's random choice for efficient sampling
                        sample_members = np.random.choice(unique_values, size=sample_size, replace=False)
                    else:
                        sample_members = unique_values
                    
                    # Create dimension info
                    dimension_info = {
                        "name": str(col_name),
                        "members": [str(m) for m in sample_members],
                        "type": "numeric" if is_numeric else "categorical",
                        "unique_count": len(unique_values),
                        "null_count": int(df[col_name].isna().sum())
                    }
                    
                    if stats:
                        dimension_info["statistics"] = stats
                    
                    extracted_dimensions.append(dimension_info)
                
                await self._broadcast_status(f"Expert Modeler Agent: Extracted {len(extracted_dimensions)} potential dimensions from headers.")
                
                # Add file-level statistics
                file_stats = {
                    "total_rows": len(df),
                    "total_columns": len(df.columns),
                    "memory_usage": df.memory_usage(deep=True).sum() / 1024 / 1024,  # MB
                    "null_percentage": (df.isna().sum().sum() / (df.shape[0] * df.shape[1])) * 100
                }
                commentary += f"\nFile statistics: {len(df)} rows, {len(df.columns)} columns, {file_stats['memory_usage']:.2f} MB, {file_stats['null_percentage']:.1f}% null values."

        except pd.errors.EmptyDataError:
            errors.append(f"The uploaded file '{file.filename}' appears to be empty.")
            logger.warning(f"Uploaded file '{file.filename}' is empty.")
        except Exception as e:
            error_msg = f"Error analyzing file '{file.filename}': {str(e)}"
            errors.append(error_msg)
            logger.exception(error_msg)

        await self._broadcast_status("Expert Modeler Agent: File analysis finished.")

        return {
            "dimensions": extracted_dimensions,
            "commentary": commentary,
            "errors": errors
        }

    def _create_analysis_prompt(self, headers: List[str], sample_data: pd.DataFrame) -> str:
        """Creates a prompt for the LLM to analyze the extracted headers and sample data."""
        
        header_str = ", ".join(headers)
        sample_str = sample_data.to_string(index=False)
        
        prompt = f"""Analyze the following data structure extracted from an uploaded file, likely intended for an EPM (Enterprise Performance Management) model.

Extracted Headers (Potential Dimensions):
{header_str}

Sample Data Rows (first 3):
{sample_str}

Task:
1. Briefly comment on the suitability of these headers as dimensions for an EPM model.
2. Identify any headers that seem unsuitable or might require renaming (e.g., generic names like 'Column1', empty headers).
3. Suggest the most likely 'DimensionType' (time, version, business, measure) for headers that look like standard EPM dimensions (e.g., 'Year', 'Scenario', 'Product', 'Sales', 'Units'). If unsure, suggest 'business'.
4. Keep the commentary concise (2-3 sentences).

Example Commentary:
"The headers 'Year', 'Scenario', 'Product', 'Units', and 'Revenue' seem suitable for an EPM model. 'Year' is likely 'time', 'Scenario' is 'version', 'Product' is 'business', and 'Units'/'Revenue' are 'measure' type dimensions. Header 'Unnamed: 0' should likely be ignored or removed."

Provide your commentary:
"""
        return prompt
