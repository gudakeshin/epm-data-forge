# backend/agents/data_generation.py
import logging
import random
import itertools
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Callable, Awaitable, AsyncGenerator
import json
import asyncio

from .base_agent import BaseAgent
from models import DataSettings
from llm.client import generate_text, generate_text_async # Use appropriate one

logger = logging.getLogger(__name__)

class DataGenerationAgent(BaseAgent):
    """Generates the core data based on model, dependencies, and settings."""

    def __init__(self, status_callback: Optional[Callable[[str], Awaitable[None]]] = None):
        """Initializes the DataGenerationAgent."""
        super().__init__(status_callback=status_callback)
        # Initialize any state needed for generation, e.g., calculation cache
        self.calculation_cache = {}

    async def run(self, processed_model: Dict[str, Any], processed_dependencies: Dict[str, Any], settings: DataSettings) -> List[Dict[str, Any]]:
        """Generates data points according to the specification."""
        logger.info(f"DataGenerationAgent starting generation. Target records: {settings.num_records}, Sparsity: {settings.sparsity}")
        
        if settings.random_seed is not None:
            logger.info(f"Setting random seed to: {settings.random_seed}")
            random.seed(settings.random_seed)
            np.random.seed(settings.random_seed)

        dimensions = processed_model.get('dimensions', [])
        dimension_names = [d.name for d in dimensions]
        dimension_members = {d.name: d.members for d in dimensions}
        rules = processed_dependencies.get('rules', [])
        calculation_rules = [r for r in rules if r.get('type') == 'calculation']

        if not dimension_names or not dimension_members or all(len(members) == 0 for members in dimension_members.values()):
            # Header-only mode: generate data for headers as fields
            logger.warning("No dimension members provided. Generating data based on headers only.")
            await self._broadcast_status("Data Generation Agent: No dimension members provided. Generating data based on headers only.")
            # Use header names as columns
            num_rows = settings.num_records
            df = pd.DataFrame(index=range(num_rows))
            for header in dimension_names:
                lname = header.lower()
                if any(x in lname for x in ["date", "period", "month", "year"]):
                    df[header] = pd.date_range(start="2020-01-01", periods=num_rows, freq="D").strftime("%Y-%m-%d")
                elif any(x in lname for x in ["price", "value", "amount", "cost", "revenue", "volume"]):
                    df[header] = np.random.uniform(100, 10000, size=num_rows).round(2)
                elif any(x in lname for x in ["region", "area", "zone"]):
                    df[header] = np.random.choice(["North", "South", "East", "West"], size=num_rows)
                elif any(x in lname for x in ["sku", "product", "item"]):
                    df[header] = [f"SKU{str(i%10+1).zfill(2)}" for i in range(num_rows)]
                elif any(x in lname for x in ["customer name", "name"]):
                    # Generate realistic person names
                    first_names = ["John", "Jane", "Alex", "Emily", "Chris", "Olivia", "Michael", "Sophia", "David", "Emma"]
                    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Wilson"]
                    df[header] = [f"{np.random.choice(first_names)} {np.random.choice(last_names)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["transaction id", "txn id", "order id", "invoice id"]):
                    # Generate realistic transaction IDs
                    df[header] = [f"TXN{np.random.randint(100000, 999999)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["email"]):
                    # Generate realistic emails
                    domains = ["example.com", "test.com", "mail.com"]
                    df[header] = [f"user{np.random.randint(1000,9999)}@{np.random.choice(domains)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["phone", "mobile"]):
                    # Generate realistic phone numbers
                    df[header] = [f"+1-202-{np.random.randint(100,999)}-{np.random.randint(1000,9999)}" for _ in range(num_rows)]
                else:
                    df[header] = np.random.choice(["A", "B", "C", "D"], size=num_rows)
            # If calculation rules exist, apply them
            if calculation_rules:
                for rule in calculation_rules:
                    target = rule.get('target')
                    formula = rule.get('formula')
                    if target and formula:
                        try:
                            parts = formula.split('=')
                            if len(parts) == 2:
                                expr = parts[1].strip()
                                if '*' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('*')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] * df[op2]).round(2)
                                elif '+' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('+')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] + df[op2]).round(2)
                                elif '-' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('-')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] - df[op2]).round(2)
                                elif '/' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('/')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] / df[op2].replace(0, np.nan)).round(2)
                        except Exception as calc_e:
                            logger.error(f"Error applying calculation rule '{formula}' for target '{target}': {calc_e}", exc_info=True)
            generated_data = df.to_dict('records')
            logger.info(f"Header-only mode: Generated {len(generated_data)} records.")
            await self._broadcast_status(f"Data Generation Agent: Header-only mode: Generated {len(generated_data)} records.")
            return generated_data

        # --- Generate Base Intersections --- 
        await self._broadcast_status("Data Generation Agent: Generating all possible dimension combinations...")
        member_lists = [dimension_members[name] for name in dimension_names]
        all_combinations = list(itertools.product(*member_lists))
        total_possible = len(all_combinations)
        logger.info(f"Total possible combinations/intersections: {total_possible}")
        await self._broadcast_status(f"Data Generation Agent: Total possible combinations: {total_possible}")

        # --- Select Intersections to Populate --- 
        target_records = settings.num_records
        effective_sparsity = settings.sparsity
        if total_possible > 0:
            density = 1.0 - effective_sparsity
            if (target_records / total_possible) > density:
                implied_density = target_records / total_possible
                logger.warning(f"Requested num_records ({target_records}) implies density ({implied_density:.2f}) higher than allowed by sparsity ({density:.2f}). Using implied density.")
                await self._broadcast_status(f"Data Generation Agent: Requested records ({target_records}) > allowed by sparsity ({density:.2f}). Using implied density.")
            else:
                target_records = min(target_records, int(total_possible * density))
                logger.info(f"Applying sparsity: target records adjusted to {target_records}")
                await self._broadcast_status(f"Data Generation Agent: Applying sparsity: target records adjusted to {target_records}")
        else:
            target_records = 0

        if target_records <= 0:
            logger.warning("Target number of records is zero or less. No data will be generated.")
            await self._broadcast_status("Data Generation Agent: No data will be generated (target records <= 0)")
            return []

        # --- Generate Data Values Using Vectorized Operations ---
        await self._broadcast_status("Data Generation Agent: Generating data values using vectorized operations...")
        
        # Create DataFrame with selected combinations
        if target_records >= total_possible:
            selected_combinations = all_combinations
        else:
            selected_combinations = random.sample(all_combinations, k=target_records)
        
        # Convert to DataFrame for vectorized operations
        df = pd.DataFrame(selected_combinations, columns=dimension_names)
        
        # Identify all measures from calculation rules
        all_measures = set()
        for rule in calculation_rules:
            if 'target' in rule:
                all_measures.add(rule['target'])
            # Also add operands if they look like measure names
            if 'formula' in rule:
                parts = rule['formula'].split('=')
                if len(parts) == 2:
                    expr = parts[1].strip()
                    for op in ['*', '+', '-', '/']:
                        if op in expr:
                            op1, op2 = [p.strip() for p in expr.split(op)]
                            all_measures.add(op1)
                            all_measures.add(op2)
        # Remove any dimension names from measures
        all_measures -= set(dimension_names)
        
        # Determine which measures are base (not targets of any calculation rule)
        calculated_measures = {rule['target'] for rule in calculation_rules if 'target' in rule}
        base_measures = all_measures - calculated_measures
        
        # If no explicit measures, fallback to 'Value'
        if not all_measures:
            base_measures = {'Value'}
            calculated_measures = set()
        
        # Generate base measures randomly
        for measure_name in base_measures:
            pattern = settings.data_patterns.get(measure_name) if settings.data_patterns else None
            if pattern:
                df[measure_name] = np.random.uniform(500, 5000, size=len(df)).round(2)
            else:
                df[measure_name] = np.random.uniform(100, 10000, size=len(df)).round(2)
        
        # --- Apply Calculation Dependencies Using Vectorized Operations ---
        if calculated_measures and not df.empty:
            logger.info(f"Applying {len(calculation_rules)} calculation rules...")
            await self._broadcast_status(f"Data Generation Agent: Applying {len(calculation_rules)} calculation rules...")
            
            for rule in calculation_rules:
                target = rule.get('target')
                formula = rule.get('formula')
                if target and formula:
                    try:
                        parts = formula.split('=')
                        if len(parts) == 2:
                            expr = parts[1].strip()
                            if '*' in expr:
                                op1, op2 = [p.strip() for p in expr.split('*')]
                                if op1 in df.columns and op2 in df.columns:
                                    df[target] = (df[op1] * df[op2]).round(2)
                                    logger.info(f"Calculated '{target}' based on rule: {formula}")
                            elif '+' in expr:
                                op1, op2 = [p.strip() for p in expr.split('+')]
                                if op1 in df.columns and op2 in df.columns:
                                    df[target] = (df[op1] + df[op2]).round(2)
                                    logger.info(f"Calculated '{target}' based on rule: {formula}")
                            elif '-' in expr:
                                op1, op2 = [p.strip() for p in expr.split('-')]
                                if op1 in df.columns and op2 in df.columns:
                                    df[target] = (df[op1] - df[op2]).round(2)
                                    logger.info(f"Calculated '{target}' based on rule: {formula}")
                            elif '/' in expr:
                                op1, op2 = [p.strip() for p in expr.split('/')]
                                if op1 in df.columns and op2 in df.columns:
                                    df[target] = (df[op1] / df[op2].replace(0, np.nan)).round(2)
                                    logger.info(f"Calculated '{target}' based on rule: {formula}")
                    except Exception as calc_e:
                        logger.error(f"Error applying calculation rule '{formula}' for target '{target}': {calc_e}", exc_info=True)

        # Convert back to list of dictionaries
        generated_data = df.to_dict('records')
        logger.info(f"DataGenerationAgent finished. Generated {len(generated_data)} final records.")
        await self._broadcast_status(f"Data Generation Agent: Data generation finished. {len(generated_data)} records ready.")
        return generated_data

    async def stream_data(self, processed_model: Dict[str, Any], processed_dependencies: Dict[str, Any], settings: DataSettings, chunk_size: int = 10000) -> AsyncGenerator[str, None]:
        """Streams generated data in chunks for efficient memory usage."""
        logger.info(f"Starting streaming data generation with chunk size: {chunk_size}")
        dimensions = processed_model.get('dimensions', [])
        dimension_names = [d.name for d in dimensions]
        dimension_members = {d.name: d.members for d in dimensions}
        calculation_rules = processed_dependencies.get('rules', []) if processed_dependencies else []

        # Header-only mode: if any dimension has no members
        if not dimension_names or not dimension_members or any(len(members) == 0 for members in dimension_members.values()):
            logger.warning("No dimension members provided. Streaming data based on headers only.")
            await self._broadcast_status("Data Generation Agent: No dimension members provided. Streaming data based on headers only.")
            num_rows = settings.num_records
            df = pd.DataFrame(index=range(num_rows))
            for header in dimension_names:
                lname = header.lower()
                if any(x in lname for x in ["date", "period", "month", "year"]):
                    df[header] = pd.date_range(start="2020-01-01", periods=num_rows, freq="D").strftime("%Y-%m-%d")
                elif any(x in lname for x in ["price", "value", "amount", "cost", "revenue", "volume"]):
                    df[header] = np.random.uniform(100, 10000, size=num_rows).round(2)
                elif any(x in lname for x in ["region", "area", "zone"]):
                    df[header] = np.random.choice(["North", "South", "East", "West"], size=num_rows)
                elif any(x in lname for x in ["sku", "product", "item"]):
                    df[header] = [f"SKU{str(i%10+1).zfill(2)}" for i in range(num_rows)]
                elif any(x in lname for x in ["customer name", "name"]):
                    # Generate realistic person names
                    first_names = ["John", "Jane", "Alex", "Emily", "Chris", "Olivia", "Michael", "Sophia", "David", "Emma"]
                    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Martinez", "Wilson"]
                    df[header] = [f"{np.random.choice(first_names)} {np.random.choice(last_names)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["transaction id", "txn id", "order id", "invoice id"]):
                    # Generate realistic transaction IDs
                    df[header] = [f"TXN{np.random.randint(100000, 999999)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["email"]):
                    # Generate realistic emails
                    domains = ["example.com", "test.com", "mail.com"]
                    df[header] = [f"user{np.random.randint(1000,9999)}@{np.random.choice(domains)}" for _ in range(num_rows)]
                elif any(x in lname for x in ["phone", "mobile"]):
                    # Generate realistic phone numbers
                    df[header] = [f"+1-202-{np.random.randint(100,999)}-{np.random.randint(1000,9999)}" for _ in range(num_rows)]
                else:
                    df[header] = np.random.choice(["A", "B", "C", "D"], size=num_rows)
            # If calculation rules exist, apply them
            if calculation_rules:
                for rule in calculation_rules:
                    target = rule.get('target')
                    formula = rule.get('formula')
                    if target and formula:
                        try:
                            parts = formula.split('=')
                            if len(parts) == 2:
                                expr = parts[1].strip()
                                if '*' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('*')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] * df[op2]).round(2)
                                elif '+' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('+')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] + df[op2]).round(2)
                                elif '-' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('-')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] - df[op2]).round(2)
                                elif '/' in expr:
                                    op1, op2 = [p.strip() for p in expr.split('/')]
                                    if op1 in df.columns and op2 in df.columns:
                                        df[target] = (df[op1] / df[op2].replace(0, np.nan)).round(2)
                        except Exception as calc_e:
                            logger.error(f"Error applying calculation rule '{formula}' for target '{target}': {calc_e}", exc_info=True)
            # Stream in chunks
            for i in range(0, num_rows, chunk_size):
                chunk = df.iloc[i:i+chunk_size].to_dict('records')
                yield json.dumps(chunk) + '\n'
                await self._broadcast_status(f"Data Generation Agent: Streamed {min(i+chunk_size, num_rows)}/{num_rows} rows...")
            logger.info(f"Header-only streaming mode: Streamed {num_rows} records.")
            await self._broadcast_status(f"Data Generation Agent: Header-only streaming mode: Streamed {num_rows} records.")
            return

        # Calculate total possible combinations
        member_lists = [dimension_members[name] for name in dimension_names]
        total_possible = np.prod([len(members) for members in member_lists]) if member_lists else 0
        
        # Apply sparsity
        target_records = settings.num_records
        effective_sparsity = settings.sparsity
        if total_possible > 0:
            density = 1.0 - effective_sparsity
            target_records = min(target_records, int(total_possible * density))
        
        if target_records <= 0:
            logger.warning("Target number of records is zero or less. No data will be generated.")
            yield json.dumps([]) + "\n"
            return

        # Generate data in chunks
        records_generated = 0
        while records_generated < target_records:
            # Calculate chunk size for this iteration
            current_chunk_size = min(chunk_size, target_records - records_generated)
            
            # Generate chunk of combinations
            chunk_combinations = []
            for _ in range(current_chunk_size):
                # Generate random combination
                combination = tuple(random.choice(members) for members in member_lists)
                chunk_combinations.append(combination)
            
            # Convert to DataFrame for vectorized operations
            df_chunk = pd.DataFrame(chunk_combinations, columns=dimension_names)
            
            # Generate random values using numpy vectorized operations
            df_chunk['Value'] = np.random.uniform(100, 10000, size=len(df_chunk)).round(2)
            
            # Convert chunk to list of dictionaries and yield
            chunk_data = df_chunk.to_dict('records')
            yield json.dumps(chunk_data) + "\n"
            
            records_generated += current_chunk_size
            await self._broadcast_status(f"Data Generation Agent: Generated {records_generated}/{target_records} records...")
            
            # Small delay to prevent overwhelming the system
            await asyncio.sleep(0.01)
        
        logger.info(f"Streaming data generation completed. Total records: {records_generated}")
        await self._broadcast_status("Data Generation Agent: Data generation streaming completed.")
