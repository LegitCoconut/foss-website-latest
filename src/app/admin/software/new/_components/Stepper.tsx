"use client";

import { Check } from "lucide-react";

const STEP_LABELS = ["Basic Info", "Media", "Version", "Review"];

interface StepperProps {
    currentStep: number;
    completedSteps: number;
    onStepClick: (step: number) => void;
}

export default function Stepper({ currentStep, completedSteps, onStepClick }: StepperProps) {
    return (
        <div className="flex items-center justify-between mb-8">
            {STEP_LABELS.map((label, idx) => {
                const step = idx + 1;
                const isCompleted = step <= completedSteps;
                const isCurrent = step === currentStep;
                const isClickable = step <= completedSteps + 1 && step <= currentStep || isCompleted;

                return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                        <button
                            type="button"
                            onClick={() => isClickable && onStepClick(step)}
                            disabled={!isClickable}
                            className={`flex items-center gap-2 group ${isClickable ? "cursor-pointer" : "cursor-not-allowed"}`}
                        >
                            <div
                                className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
                                    isCurrent
                                        ? "border-primary bg-primary text-primary-foreground"
                                        : isCompleted
                                            ? "border-primary bg-primary/20 text-primary"
                                            : "border-border/50 bg-muted/50 text-muted-foreground"
                                }`}
                            >
                                {isCompleted && !isCurrent ? (
                                    <Check className="h-4 w-4" />
                                ) : (
                                    step
                                )}
                            </div>
                            <span
                                className={`text-sm font-medium hidden sm:inline ${
                                    isCurrent
                                        ? "text-foreground"
                                        : isCompleted
                                            ? "text-foreground/80"
                                            : "text-muted-foreground"
                                }`}
                            >
                                {label}
                            </span>
                        </button>
                        {idx < STEP_LABELS.length - 1 && (
                            <div
                                className={`flex-1 h-0.5 mx-3 ${
                                    step <= completedSteps ? "bg-primary/50" : "bg-border/50"
                                }`}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
