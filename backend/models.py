from pydantic import BaseModel, Field, validator, conint, confloat
from typing import List, Dict, Any, Optional
from enum import Enum

# --- Frontend Configuration Models (Input to /generate) ---

class ModelType(str, Enum):
    """Supported model types for data generation."""
    FINANCIAL_PLANNING = "FinancialPlanning"
    SALES_ANALYSIS = "SalesAnalysis"
    HR_HEADCOUNT = "HR_Headcount"

class DataPattern(str, Enum):
    """Supported data patterns for measure generation."""
    SEASONAL_PEAK_Q4 = "seasonal_peak_q4"
    LINEAR_INCREASE = "linear_increase"
    RANDOM = "random"
    NORMAL_DISTRIBUTION = "normal_distribution"

class Dimension(BaseModel):
    """Represents a dimension in the EPM model."""
    name: str
    members: list = Field(default_factory=list)
    attributes: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional attributes for the dimension (e.g., data type, hierarchy)"
    )

class DependencyRule(BaseModel):
    """Represents a business rule or dependency in the EPM model."""
    type: str = Field(
        ...,
        description="Type of dependency rule",
        examples=["calculation", "allocation", "validation"]
    )
    formula: Optional[str] = Field(
        default=None,
        description="Formula or expression for the rule (e.g., 'Revenue = Price * Quantity')"
    )
    involved_dimensions: List[str] = Field(
        ...,
        description="List of dimensions/measures involved in the rule",
        min_items=1
    )
    target: Optional[str] = Field(
        default=None,
        description="Target measure or condition for the rule"
    )
    parameters: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional parameters for the rule"
    )

class DataSettings(BaseModel):
    """Settings for data generation."""
    num_records: conint(gt=0) = Field(
        default=1000,
        description="Target number of data records to generate"
    )
    sparsity: confloat(ge=0.0, le=1.0) = Field(
        default=0.0,
        description="Target sparsity (0=dense, 1=fully sparse)"
    )
    data_patterns: Optional[Dict[str, DataPattern]] = Field(
        default=None,
        description="Patterns for generating specific measures"
    )
    random_seed: Optional[int] = Field(
        default=None,
        description="Random seed for reproducibility"
    )
    measure_settings: Optional[Dict[str, Dict[str, Any]]] = Field(
        default=None,
        description="Per-measure settings: {measure_name: {distribution: 'uniform'|'normal', min, max, mean, stddev}}"
    )

class GenerationConfig(BaseModel):
    """Configuration for data generation."""
    model_type: ModelType = Field(
        ...,
        description="Type of model to generate data for"
    )
    dimensions: List[Dimension] = Field(
        ...,
        description="List of dimensions in the model",
        min_items=1
    )
    dependencies: Optional[List[DependencyRule]] = Field(
        default=None,
        description="List of business rules and dependencies"
    )
    settings: DataSettings = Field(
        ...,
        description="Data generation settings"
    )

# --- Backend Response Models ---

class GenerationResponse(BaseModel):
    """Response from data generation endpoint."""
    message: str = Field(
        ...,
        description="Status message from the generation process"
    )
    preview_data: List[Dict[str, Any]] = Field(
        ...,
        description="Sample of generated data for preview"
    )
    errors: Optional[List[str]] = Field(
        default=None,
        description="List of errors or warnings encountered during generation"
    )

# --- Internal Models (Example for LLM interaction) ---

class OllamaRequest(BaseModel):
    """Request model for Ollama API."""
    model: str = Field(..., description="Name of the model to use")
    prompt: str = Field(..., description="Prompt for the model")
    stream: bool = Field(default=False, description="Whether to stream the response")
    options: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional options for the model"
    )

class OllamaResponse(BaseModel):
    """Response model from Ollama API."""
    model: str = Field(..., description="Name of the model used")
    created_at: str = Field(..., description="Timestamp of response creation")
    response: str = Field(..., description="Generated response text")
    done: bool = Field(..., description="Whether the response is complete")
    context: Optional[List[int]] = Field(
        default=None,
        description="Context tokens for the response"
    )
    total_duration: Optional[int] = Field(
        default=None,
        description="Total duration of generation in nanoseconds"
    )
