// Model types that can be selected
export type ModelType = 
  | 'financial-budgeting'
  | 'sales-forecasting'
  | 'workforce-planning'
  | 'supply-chain'
  | 'custom';

// Dimension types for EPM models
export type DimensionType = 
  | 'time'
  | 'version'
  | 'business'
  | 'measure';

// Hierarchy node for dimensions
export interface HierarchyMember {
  id: string;
  name: string;
  children?: HierarchyMember[];
  parentId?: string;
}

// Time granularity options
export type TimeGranularity = 
  | 'days'
  | 'weeks'
  | 'months'
  | 'quarters'
  | 'years';

// Dimension definition
export interface Dimension {
  id: string;
  name: string;
  type: DimensionType;
  members: HierarchyMember[];
  description?: string; // Optional description
}

// Dependency between dimensions or members
export interface Dependency {
  id: string;
  sourceDimensionId: string;
  sourceMembers: string[]; // Member IDs
  targetDimensionId: string;
  targetMembers: string[]; // Member IDs
  type: 'calculation' | 'allocation' | 'validation'; // Type of rule
  rule: string; // Calculation rule or description
}

// Pattern types for data generation
export type PatternType =
  | 'constant'
  | 'growth'
  | 'seasonal'
  | 'random'
  | 'formula';

// Data pattern definition
export interface DataPattern {
  id: string;
  type: PatternType;
  dimensionId: string;
  memberId: string;
  parameters: Record<string, any>; // Flexible parameters based on pattern type
}

// EPM Model configuration
export interface EPMModel {
  id: string;
  name: string;
  type: ModelType;
  dimensions: Dimension[];
  dependencies: Dependency[];
  patterns: DataPattern[];
  timeSettings: {
    startDate: Date;
    endDate: Date;
    granularity: TimeGranularity;
  };
  dataSettings: {
    rowCount?: number;
    sparsity?: number; // 0-100 percentage
    randomSeed?: number; // Optional seed for reproducibility
  };
}

// Preview data for table display
export interface PreviewData {
  headers: string[];
  rows: Record<string, any>[];
}
