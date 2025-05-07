
import { useModelContext } from "@/context/ModelContext";
import { cn } from "@/lib/utils";

const steps = [
  { label: "Model Type", description: "Select model template" },
  { label: "Dimensions", description: "Define model dimensions" },
  { label: "Dependencies", description: "Set dimension relationships" },
  { label: "Data Settings", description: "Configure data parameters" },
  { label: "Preview & Download", description: "Generate and export data" },
];

const StepIndicator = () => {
  const { currentStep, setCurrentStep } = useModelContext();

  return (
    <div className="w-full py-6">
      <div className="flex justify-center">
        <div className="flex flex-wrap justify-center">
          {steps.map((step, i) => (
            <div 
              key={i} 
              className={cn(
                "step-item",
                { "complete": i < currentStep },
                { "active": i === currentStep }
              )}
              onClick={() => {
                // Only allow navigation to previous steps or current step
                if (i <= currentStep) {
                  setCurrentStep(i);
                }
              }}
            >
              <div className={cn(
                "step-counter relative z-10 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-2 border-slate-200 bg-white font-semibold text-slate-500",
                { "cursor-not-allowed": i > currentStep },
                { "border-primary": i <= currentStep }
              )}>
                {i < currentStep ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <div className={cn(
                "text-center mt-2",
                { "text-primary font-medium": i === currentStep },
                { "text-muted-foreground": i !== currentStep }
              )}>
                <p className="text-sm">{step.label}</p>
                <p className="text-xs">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StepIndicator;
