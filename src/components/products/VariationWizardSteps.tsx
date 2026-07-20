import { Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

interface VariationWizardStepsProps {
  current: number;
  steps: Step[];
  onStepClick?: (id: number) => void;
}

export function VariationWizardSteps({ current, steps, onStepClick }: VariationWizardStepsProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-xl bg-[#121212] border border-[#2A2A2A]">
      {steps.map((step, idx) => {
        const isDone = step.id < current;
        const isActive = step.id === current;
        const canClick = onStepClick && step.id < current;
        return (
          <div key={step.id} className="flex items-center flex-1 min-w-0">
            <button
              type="button"
              onClick={() => canClick && onStepClick?.(step.id)}
              disabled={!canClick}
              className={`flex items-center gap-2 min-w-0 ${canClick ? "cursor-pointer" : "cursor-default"}`}
            >
              <div
                className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 border transition-all ${
                  isActive
                    ? "bg-[#C7A052] text-[#121212] border-[#C7A052]"
                    : isDone
                    ? "bg-[#C7A052]/20 text-[#C7A052] border-[#C7A052]/40"
                    : "bg-transparent text-[#6B6B6B] border-[#2A2A2A]"
                }`}
              >
                {isDone ? <Check className="h-3.5 w-3.5" /> : step.id}
              </div>
              <span
                className={`text-xs font-medium truncate ${
                  isActive ? "text-white" : isDone ? "text-[#C7A052]" : "text-[#6B6B6B]"
                }`}
              >
                {step.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${isDone ? "bg-[#C7A052]/40" : "bg-[#2A2A2A]"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
