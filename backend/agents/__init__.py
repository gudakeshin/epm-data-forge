# backend/agents/__init__.py

# Import agent classes to make them available when importing the package
from .base_agent import BaseAgent
from .coordinator import CoordinatorAgent
from .model_definition import ModelDefinitionAgent
from .dependency import DependencyAgent
from .data_generation import DataGenerationAgent
from .validation_formatting import ValidationFormattingAgent
from .expert_modeler import ExpertModelerAgent

# Optionally define __all__ to control what `from .agents import *` imports
__all__ = [
    "BaseAgent",
    "CoordinatorAgent",
    "ModelDefinitionAgent",
    "DependencyAgent",
    "DataGenerationAgent",
    "ValidationFormattingAgent",
    "ExpertModelerAgent",
]
