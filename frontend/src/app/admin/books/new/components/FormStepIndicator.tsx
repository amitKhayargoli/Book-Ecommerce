import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "../utils";

export interface Step {
  id: number;
  label: string;
  shortLabel: string;
  description: string;
}

const STEPS: Step[] = [
  { id: 1, label: "Basic Information", shortLabel: "Basic Info", description: "Title, author, description" },
  { id: 2, label: "Catalog Details", shortLabel: "Catalog", description: "Publisher, ISBN, genres, subjects" },
  { id: 3, label: "Pricing & Inventory", shortLabel: "Pricing", description: "Price, stock, visibility" },
  { id: 4, label: "Media", shortLabel: "Media", description: "Covers, previews, mockups" },
  { id: 5, label: "Review & Publish", shortLabel: "Review", description: "Final review before saving" },
];

interface FormStepIndicatorProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  completedSteps: number[];
  stepErrors: Record<number, boolean>;
}

export function FormStepIndicator({ currentStep, onStepClick, completedSteps, stepErrors }: FormStepIndicatorProps) {
  return (
    <div className="hidden md:block w-full mb-0">
      {/* Desktop: horizontal step bar */}
      <nav aria-label="Progress" className="relative">
        {/* Background track */}
        <div className="absolute top-6 left-[calc(3rem)] right-[calc(3rem)] h-[1px] bg-white/5" />
        
        {/* Active track */}
        <div className="absolute top-6 left-[calc(3rem)] h-[1px] bg-white/20 transition-all duration-700 ease-in-out"
          style={{ width: `calc((100% - 6rem) * ${(currentStep - 1) / (STEPS.length - 1)})` }}
        />

        <ol className="flex justify-between">
          {STEPS.map((step) => {
            const isActive = currentStep === step.id;
            const isCompleted = completedSteps.includes(step.id);
            const hasError = stepErrors[step.id];

            return (
              <li key={step.id} className="flex flex-col items-center relative z-10">
                <button
                  type="button"
                  onClick={() => onStepClick(step.id)}
                  disabled={step.id > currentStep && !completedSteps.includes(step.id - 1)}
                  className={cn(
                    "flex flex-col items-center gap-2 group transition-all duration-300",
                    step.id > currentStep && !completedSteps.includes(step.id - 1) && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {/* Circle */}
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 relative",
                    isActive && "border-white bg-white/10 shadow-lg shadow-white/5 scale-110",
                    isCompleted && !isActive && "border-transparent bg-white text-black",
                    !isActive && !isCompleted && "border-white/10 bg-transparent",
                    hasError && "border-romance/50 bg-romance/10"
                  )}>
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className={cn(
                        "text-sm font-bold",
                        isActive ? "text-white" : "text-white/30",
                      )}>
                        {step.id}
                      </span>
                    )}

                    {/* Pulse ring on active */}
                    {isActive && (
                      <motion.span
                        className="absolute inset-0 rounded-full border border-white/20"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                    )}
                  </div>

                  {/* Label */}
                  <div className="text-center">
                    <span className={cn(
                      "block text-xs font-bold uppercase tracking-widest transition-colors duration-300",
                      isActive ? "text-white" : isCompleted ? "text-white/60" : "text-white/20"
                    )}>
                      {step.shortLabel}
                    </span>
                    <span className={cn(
                      "block text-[10px] mt-0.5 transition-colors duration-300",
                      isActive ? "text-white/40" : "text-white/10"
                    )}>
                      {step.description}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Mobile: compact indicator */}
      <div className="md:hidden flex items-center justify-center gap-3 py-2">
        <span className="text-xs font-bold text-white/40 uppercase tracking-widest">
          Step {currentStep} of {STEPS.length}
        </span>
        <div className="flex gap-1.5">
          {STEPS.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => {
                if (completedSteps.includes(step.id - 1) || step.id <= currentStep) {
                  onStepClick(step.id);
                }
              }}
              className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                currentStep === step.id && "w-6 bg-white",
                currentStep > step.id && "bg-white/40",
                completedSteps.includes(step.id) && !currentStep && "",
                currentStep < step.id && !completedSteps.includes(step.id) && "bg-white/10",
              )}
            />
          ))}
        </div>
        <span className="text-xs font-medium text-white/30">{STEPS.find(s => s.id === currentStep)?.shortLabel}</span>
      </div>
    </div>
  );
}

export { STEPS };
