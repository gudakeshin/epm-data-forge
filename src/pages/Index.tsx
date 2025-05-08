import React from "react";
import { ModelProvider, useModelContext } from "@/context/ModelContext";
import Header from "@/components/Header";
import StepIndicator from "@/components/StepIndicator";
import ModelTypeStep from "@/components/steps/ModelTypeStep";
import DimensionsStep from "@/components/steps/DimensionsStep";
import DependenciesStep from "@/components/steps/DependenciesStep";
import DataSettingsStep from "@/components/steps/DataSettingsStep";
import PreviewDownloadStep from "@/components/steps/PreviewDownloadStep";
import FileUpload from "@/components/FileUpload";
import AgentFlowVisualization from "@/components/AgentFlowVisualization";
import FileUploadAndModelDialog from "@/components/FileUploadAndModelDialog";

// Wrapper component to access context
const ModelWizard = () => {
  const { currentStep, dimensionInputMethod } = useModelContext();

  const handleModelConfirm = (dimensions: Record<string, string[]>, measures: string[], measureSettings: Record<string, any>, randomSeed?: number) => {
    // Handle model confirmation
    console.log("Model confirmed:", { dimensions, measures, measureSettings, randomSeed });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-grow">
        <StepIndicator />
        <div className="flex flex-row gap-8 py-4 max-w-7xl mx-auto overflow-x-auto">
          <div className="flex-1 min-w-0">
            {currentStep === 0 && <ModelTypeStep />}
            {currentStep === 1 && dimensionInputMethod === 'manual' && <DimensionsStep />}
            {currentStep === 1 && dimensionInputMethod === 'upload' && <FileUploadAndModelDialog onConfirm={handleModelConfirm} />}
            {/* TODO: Handle 'undecided' case for step 1? Should not happen if ModelTypeStep works correctly */}
            {currentStep === 2 && <DependenciesStep />}
            {currentStep === 3 && <DataSettingsStep />}
            {currentStep === 4 && <PreviewDownloadStep />}
          </div>
          {currentStep > 0 && (
            <div className="w-full max-w-[220px] flex-shrink-0">
              <AgentFlowVisualization />
            </div>
          )}
        </div>
      </div>
      <footer className="border-t py-6 mt-10">
        <div className="container text-center text-sm text-muted-foreground">
          <p>EPM Data Forge - Synthetic Data Generator for Enterprise Performance Management</p>
        </div>
      </footer>
    </div>
  );
};

// Main component with context provider
const Index = () => {
  return (
    <ModelProvider>
      <ModelWizard />
    </ModelProvider>
  );
};

export default Index;
