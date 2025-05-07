import React, { createContext, useState, useContext, ReactNode } from 'react';
import { toast } from 'sonner'; // Use sonner directly if imported

import { 
  EPMModel, 
  ModelType, 
  Dimension, 
  Dependency, 
  DataPattern, 
  TimeGranularity 
} from '../types/epm-types';

// Default time settings
const DEFAULT_START_DATE = new Date();
DEFAULT_START_DATE.setMonth(DEFAULT_START_DATE.getMonth() - 3);
const DEFAULT_END_DATE = new Date();
DEFAULT_END_DATE.setFullYear(DEFAULT_END_DATE.getFullYear() + 1);

// Default empty model
const DEFAULT_MODEL: EPMModel = {
  id: `model-${Date.now()}`,
  name: 'New EPM Model',
  type: 'financial-budgeting',
  dimensions: [],
  dependencies: [],
  patterns: [],
  timeSettings: {
    startDate: DEFAULT_START_DATE,
    endDate: DEFAULT_END_DATE,
    granularity: 'months',
  },
  dataSettings: {
    rowCount: 1000,
    sparsity: 30,
  }
};

type DimensionInputMethod = 'manual' | 'upload' | 'undecided'; // Define the type

interface ModelContextType {
  model: EPMModel;
  currentStep: number;
  dimensionInputMethod: DimensionInputMethod; // Add state type
  setCurrentStep: (step: number) => void;
  setDimensionInputMethod: (method: DimensionInputMethod) => void; // Add setter type
  updateModelType: (type: ModelType) => void;
  updateModelName: (name: string) => void;
  addDimension: (dimension: Dimension) => void;
  updateDimension: (dimension: Dimension) => void;
  removeDimension: (dimensionId: string) => void;
  setDimensions: (dimensions: Dimension[]) => void; // Add function type
  addDependency: (dependency: Dependency) => void;
  updateDependency: (dependency: Dependency) => void;
  removeDependency: (dependencyId: string) => void;
  addPattern: (pattern: DataPattern) => void;
  updatePattern: (pattern: DataPattern) => void;
  removePattern: (patternId: string) => void;
  updateTimeSettings: (startDate: Date, endDate: Date, granularity: TimeGranularity) => void;
  updateDataSettings: (rowCount?: number, sparsity?: number) => void;
  resetModel: () => void;
  previewLoading: boolean;
  previewData: any[] | null;
  generatePreview: () => void;
  downloadData: () => void;
  previewProgress: {chunks: number, rows: number};
}

const ModelContext = createContext<ModelContextType | undefined>(undefined);

const BACKEND_URL = "http://localhost:8000"; // Backend is running on port 8000

export const ModelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [model, setModel] = useState<EPMModel>({ ...DEFAULT_MODEL });
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [dimensionInputMethod, setDimensionInputMethod] = useState<DimensionInputMethod>('undecided'); // Add state
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [previewProgress, setPreviewProgress] = useState<{chunks: number, rows: number}>({chunks: 0, rows: 0});

  const updateModelType = (type: ModelType) => {
    setModel((prev) => ({
      ...prev,
      type
    }));
  };

  const updateModelName = (name: string) => {
    setModel((prev) => ({
      ...prev,
      name
    }));
  };

  const addDimension = (dimension: Dimension) => {
    setModel((prev) => ({
      ...prev,
      dimensions: [...prev.dimensions, dimension]
    }));
  };

  const updateDimension = (dimension: Dimension) => {
    setModel((prev) => ({
      ...prev,
      dimensions: prev.dimensions.map(d => 
        d.id === dimension.id ? dimension : d
      )
    }));
  };

  const removeDimension = (dimensionId: string) => {
    setModel((prev) => ({
      ...prev,
      dimensions: prev.dimensions.filter(d => d.id !== dimensionId),
      // Also clean up related dependencies and patterns
      dependencies: prev.dependencies.filter(
        dep => dep.sourceDimensionId !== dimensionId && dep.targetDimensionId !== dimensionId
      ),
      patterns: prev.patterns.filter(
        pattern => pattern.dimensionId !== dimensionId
      )
    }));
  };

  // Function to set/replace all dimensions
  const setDimensions = (dimensions: Dimension[]) => {
      setModel((prev) => ({
          ...prev,
          dimensions: dimensions,
          // Reset dependencies and patterns when dimensions are completely replaced?
          // Or assume the calling component handles related cleanup/setup?
          // For now, let's just replace dimensions.
          // dependencies: [], 
          // patterns: [], 
      }));
  };

  const addDependency = (dependency: Dependency) => {
    setModel((prev) => ({
      ...prev,
      dependencies: [...prev.dependencies, dependency]
    }));
  };

  const updateDependency = (dependency: Dependency) => {
    setModel((prev) => ({
      ...prev,
      dependencies: prev.dependencies.map(d => 
        d.id === dependency.id ? dependency : d
      )
    }));
  };

  const removeDependency = (dependencyId: string) => {
    setModel((prev) => ({
      ...prev,
      dependencies: prev.dependencies.filter(d => d.id !== dependencyId)
    }));
  };

  const addPattern = (pattern: DataPattern) => {
    setModel((prev) => ({
      ...prev,
      patterns: [...prev.patterns, pattern]
    }));
  };

  const updatePattern = (pattern: DataPattern) => {
    setModel((prev) => ({
      ...prev,
      patterns: prev.patterns.map(p => 
        p.id === pattern.id ? pattern : p
      )
    }));
  };

  const removePattern = (patternId: string) => {
    setModel((prev) => ({
      ...prev,
      patterns: prev.patterns.filter(p => p.id !== patternId)
    }));
  };

  const updateTimeSettings = (startDate: Date, endDate: Date, granularity: TimeGranularity) => {
    setModel((prev) => ({
      ...prev,
      timeSettings: {
        startDate,
        endDate,
        granularity
      }
    }));
  };

  const updateDataSettings = (rowCount?: number, sparsity?: number) => {
    setModel((prev) => ({
      ...prev,
      dataSettings: {
        ...prev.dataSettings,
        ...(rowCount !== undefined ? { rowCount } : {}),
        ...(sparsity !== undefined ? { sparsity } : {})
      }
    }));
  };

  const resetModel = () => {
    setModel({ ...DEFAULT_MODEL, id: `model-${Date.now()}` });
    setCurrentStep(0);
    setPreviewData(null);
  };

  const generatePreview = async () => {
    // Validation: must have at least one dimension
    if (!model.dimensions || model.dimensions.length === 0) {
      toast.error('You must define at least one dimension.');
      return;
    }
    // Allow empty members for header-only mode
    // const emptyMemberDim = model.dimensions.find(d => !d.members || d.members.length === 0);
    // if (emptyMemberDim) {
    //   toast.error(`Dimension "${emptyMemberDim.name}" must have at least one member.`);
    //   return;
    // }
    try {
      setPreviewLoading(true);
      setPreviewData([]);
      setPreviewProgress({chunks: 0, rows: 0});

      // Map frontend model type to backend ModelType enum
      const modelTypeMap: Record<string, string> = {
        'financial-budgeting': 'FinancialPlanning',
        'sales-forecasting': 'SalesAnalysis',
        'workforce-planning': 'HR_Headcount',
        // Add more mappings as needed
      };
      let backendModelType = modelTypeMap[model.type];
      if (!backendModelType) {
        toast.warning(`Model type '${model.type}' is not supported. Using 'FinancialPlanning' instead.`);
        backendModelType = 'FinancialPlanning';
      }

      // Map dimensions to backend schema
      const dimensions = model.dimensions.map(d => ({
        name: d.name,
        members: d.members.map(m => m.name),
        // Optionally add attributes if available
        // attributes: d.attributes || undefined
      }));

      // Map dependencies to backend schema (DependencyRule)
      let dependencies = undefined;
      if (model.dependencies.length > 0) {
        dependencies = model.dependencies.map(dep => ({
          type: dep.type,
          formula: dep.rule,
          involved_dimensions: [dep.sourceDimensionId, dep.targetDimensionId],
          target: dep.targetDimensionId
        }));
      }

      // Map settings to backend DataSettings
      const settings: any = {
        num_records: model.dataSettings.rowCount || 1000,
        sparsity: (model.dataSettings.sparsity || 0) / 100,
      };
      if (model.dataSettings.randomSeed !== undefined) {
        settings.random_seed = model.dataSettings.randomSeed;
      }

      const payload: any = {
        model_type: backendModelType,
        dimensions,
        settings,
      };
      if (dependencies) payload.dependencies = dependencies;

      // Streaming fetch
      const response = await fetch(`${BACKEND_URL}/generate-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) {
        throw new Error('Failed to stream preview data.');
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let allRows: any[] = [];
      let chunkCount = 0;
      let rowCount = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) {
            const chunk = JSON.parse(line);
            allRows = allRows.concat(chunk);
            setPreviewData((prev) => (prev ? prev.concat(chunk) : chunk));
            chunkCount++;
            rowCount += chunk.length;
            setPreviewProgress({chunks: chunkCount, rows: rowCount});
            toast.info(`Received ${chunk.length} more rows...`);
          }
        }
      }
      toast.success(`Preview data generated: ${allRows.length} rows`);
    } catch (error: any) {
      let errorMessage = "Failed to generate preview data";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else {
        try {
          errorMessage = JSON.stringify(error);
        } catch {
          errorMessage = "An unknown error occurred during preview generation.";
        }
      }
      toast.error(`Preview Error: ${errorMessage}`);
      console.error("Preview generation error details:", error);
      setPreviewData(null);
      setPreviewProgress({chunks: 0, rows: 0});
    } finally {
      setPreviewLoading(false);
    }
  };

  const downloadData = async () => {
    try {
      setPreviewProgress({chunks: 0, rows: 0});
      if (!previewData || previewData.length === 0) {
        toast.error("No data available for download");
        return;
      }
      
      // Create CSV content
      const headers = Object.keys(previewData[0]);
      const csvContent = [
        headers.join(','),
        ...previewData.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
      ].join('\n');
      
      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${model.name.replace(/\s+/g, '_')}_data.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Data downloaded successfully");
    } catch (error) {
      setPreviewProgress({chunks: 0, rows: 0});
      toast.error("Failed to download data");
      console.error("Download error:", error);
    }
  };

  // Helper to generate mock preview data
  const generateMockPreviewData = () => {
    const timeDimension = model.dimensions.find(d => d.type === 'time');
    const versionDimension = model.dimensions.find(d => d.type === 'version');
    const measureDimension = model.dimensions.find(d => d.type === 'measure');
    
    if (!timeDimension || !measureDimension) {
      return Array(10).fill(null).map((_, i) => ({
        'Row': i + 1,
        'Sample Column 1': `Value ${i + 1}`,
        'Sample Column 2': Math.round(Math.random() * 1000),
        'Sample Column 3': Math.round(Math.random() * 100) / 100
      }));
    }
    
    // Get leaf members for each dimension
    const timeMembers = getLeafMembers(timeDimension);
    const versions = versionDimension ? getLeafMembers(versionDimension) : [{ id: 'actual', name: 'Actual' }];
    const measures = getLeafMembers(measureDimension);
    
    // Generate 20 sample rows
    return Array(20).fill(null).map((_, i) => {
      const timeMember = timeMembers[i % timeMembers.length];
      const version = versions[i % versions.length];
      const measure = measures[i % measures.length];
      
      const otherDimensions = model.dimensions
        .filter(d => d.type !== 'time' && d.type !== 'version' && d.type !== 'measure')
        .reduce((acc, dim) => {
          const members = getLeafMembers(dim);
          if (members.length > 0) {
            acc[dim.name] = members[i % members.length].name;
          }
          return acc;
        }, {} as Record<string, string>);
      
      return {
        'Time': timeMember.name,
        'Version': version.name,
        'Measure': measure.name,
        ...otherDimensions,
        'Value': Math.round(Math.random() * 10000) / 100
      };
    });
  };
  
  // Helper to get leaf members from a dimension
  const getLeafMembers = (dimension: Dimension): { id: string; name: string }[] => {
    const result: { id: string; name: string }[] = [];
    
    const traverse = (members: typeof dimension.members) => {
      members.forEach(member => {
        if (!member.children || member.children.length === 0) {
          result.push({ id: member.id, name: member.name });
        } else {
          traverse(member.children);
        }
      });
    };
    
    traverse(dimension.members);
    return result.length > 0 ? result : [{ id: 'sample', name: 'Sample' }];
  };

  return (
    <ModelContext.Provider value={{
      model,
      currentStep,
      dimensionInputMethod, // Expose state
      setDimensionInputMethod, // Expose setter
      setCurrentStep,
      updateModelType,
      updateModelName,
      addDimension,
      updateDimension,
      removeDimension,
      setDimensions, // Expose function
      addDependency,
      updateDependency,
      removeDependency,
      addPattern,
      updatePattern,
      removePattern,
      updateTimeSettings,
      updateDataSettings,
      resetModel,
      previewLoading,
      previewData,
      generatePreview,
      downloadData,
      previewProgress
    }}>
      {children}
    </ModelContext.Provider>
  );
};

export const useModelContext = () => {
  const context = useContext(ModelContext);
  if (context === undefined) {
    throw new Error('useModelContext must be used within a ModelProvider');
  }
  return context;
};
