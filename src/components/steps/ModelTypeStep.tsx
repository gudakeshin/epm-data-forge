import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useModelContext } from "@/context/ModelContext";
import { ModelType } from "@/types/epm-types";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MODEL_TYPES: { type: ModelType; title: string; description: string; icon: React.ReactNode }[] = [
  {
    type: "financial-budgeting",
    title: "Financial Budgeting",
    description: "Generate financial planning data with income statement, balance sheet and cash flow",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-dollar-sign">
        <circle cx="12" cy="12" r="10" />
        <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
        <path d="M12 18V6" />
      </svg>
    ),
  },
  {
    type: "sales-forecasting",
    title: "Sales Forecasting",
    description: "Create sales forecast data with products, regions, channels, and seasonality",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trending-up">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    type: "workforce-planning",
    title: "Workforce Planning",
    description: "Generate HR data with headcount, compensation, and workforce metrics",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    type: "supply-chain",
    title: "Supply Chain Planning",
    description: "Generate inventory, procurement, and demand planning datasets",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-truck">
        <path d="M10 17h4V5H2v12h3" />
        <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5" />
        <path d="M14 17h1" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="17.5" cy="17.5" r="2.5" />
      </svg>
    ),
  },
  {
    type: "custom",
    title: "Custom Model",
    description: "Build a fully customized EPM model with your own dimensions",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

type StepPhase = 'selectType' | 'chooseDimensionMethod'; // Define phases for this step

const ModelTypeStep = () => {
  const { model, updateModelType, updateModelName, setCurrentStep, setDimensionInputMethod } = useModelContext(); // Add setDimensionInputMethod
  const [modelName, setModelName] = useState(model.name);
  const [stepPhase, setStepPhase] = useState<StepPhase>('selectType'); // Add state for phase management

  const handleSelectModelType = (type: ModelType) => {
    updateModelType(type);
  };

  // Renamed from handleNext - confirms type and name selection
  const handleConfirmTypeAndName = () => {
    updateModelName(modelName);
    // updateModelType(model.type); // Already updated onClick
    setStepPhase('chooseDimensionMethod'); // Move to the next phase within this step
  };

  // Handler for choosing manual dimension input
  const handleManualDimensions = () => {
    setDimensionInputMethod('manual');
    setCurrentStep(1); // Proceed to next main step
  };

  // Handler for choosing file upload dimension input
  const handleUploadDimensions = () => {
    setDimensionInputMethod('upload');
    setCurrentStep(1); // Proceed to next main step
  };


  return (
    <div className="container max-w-4xl mx-auto">
      {stepPhase === 'selectType' && (
        // Phase 1: Select Model Type and Name
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold mb-1">Select Model Type & Name</h2>
            <p className="text-muted-foreground">
              Choose a model template and give your model a name.
            </p>
          </div>

          <div className="space-y-4">
            <div className="mb-6">
              <label htmlFor="model-name" className="block text-sm font-medium mb-2">
                Model Name
              </label>
              <Input 
                id="model-name"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="Enter a name for your model"
                className="w-full max-w-md"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MODEL_TYPES.map((modelType) => (
                <Card 
                  key={modelType.type}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm", 
                    model.type === modelType.type ? "border-primary shadow-sm" : ""
                  )}
                  onClick={() => handleSelectModelType(modelType.type)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="p-2 rounded-md bg-primary/10 text-primary">
                        {modelType.icon}
                      </div>
                      {model.type === modelType.type && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg">{modelType.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{modelType.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-6">
            <Button onClick={handleConfirmTypeAndName} size="lg" disabled={!modelName.trim()}> {/* Use new handler */} 
              Continue
            </Button>
          </div>
        </div>
      )}

      {stepPhase === 'chooseDimensionMethod' && (
          // Phase 2: Choose Dimension Input Method
          <div className="space-y-6 text-center">
              <div>
                  <h2 className="text-2xl font-bold mb-2">Define Model Dimensions</h2>
                  <p className="text-muted-foreground mb-6">
                      How would you like to set up the dimensions for your '{model.name}' model?
                  </p>
              </div>
              <div className="flex justify-center gap-4 pt-4">
                  <Button onClick={handleManualDimensions} size="lg" variant="outline">
                      Define Manually
                  </Button>
                  <Button onClick={handleUploadDimensions} size="lg">
                      Upload File (CSV/Excel)
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
};

export default ModelTypeStep;
