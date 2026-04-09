import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from '../../../shared/components/Button';

interface TrialGuidedPopoverProps {
  stepNumber: number;
  totalSteps: number;
  title: string;
  description: string;
  nextLabel: string;
  onNext: () => void | Promise<void>;
  isLoading?: boolean;
}

export const TrialGuidedPopover = ({
  stepNumber,
  totalSteps,
  title,
  description,
  nextLabel,
  onNext,
  isLoading = false,
}: TrialGuidedPopoverProps) => {
  return (
    <div className="pointer-events-none fixed bottom-24 right-4 z-40 w-[calc(100vw-2rem)] max-w-sm md:bottom-6 md:right-6">
      <div className="pointer-events-auto rounded-2xl bg-[#38B6FF] p-5 text-white shadow-2xl shadow-[#38B6FF]/30">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/85">
          Passo {stepNumber} de {totalSteps}
        </p>
        <h3 className="mt-2 text-lg font-bold leading-tight">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-white/90">{description}</p>
        <Button
          variant="secondary"
          className="mt-4 w-full justify-center gap-2 border-white bg-white text-[#38B6FF] hover:bg-white/90"
          isLoading={isLoading}
          onClick={() => void onNext()}
        >
          {nextLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
