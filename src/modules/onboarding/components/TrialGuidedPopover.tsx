import * as React from 'react';
import { Button } from '../../../shared/components/Button';
import { cn } from '../../../shared/utils/cn';
import { useTrialGuidedFlow } from '../hooks/useTrialGuidedFlow';

const POPOVER_WIDTH = 390;
const POPOVER_GAP = 18;
const VIEWPORT_PADDING = 16;

type RectState = {
  top: number;
  left: number;
  usingFallback: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const TrialGuidedPopover = () => {
  const { currentStep, currentStepIndex, currentTourStep, handleNext, isActive, isSaving } =
    useTrialGuidedFlow();
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const [rect, setRect] = React.useState<RectState | null>(null);

  React.useLayoutEffect(() => {
    if (!isActive || !currentTourStep) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const primaryTarget = document.querySelector<HTMLElement>(
        `[data-tour-id="${currentTourStep.targetId}"]`
      );
      const fallbackTarget = currentTourStep.fallbackTargetId
        ? document.querySelector<HTMLElement>(
            `[data-tour-id="${currentTourStep.fallbackTargetId}"]`
          )
        : null;
      const target = primaryTarget ?? fallbackTarget;

      if (!target) {
        setRect(null);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? 240;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let nextTop = 0;
      let nextLeft = 0;

      if (currentTourStep.placement === 'right') {
        nextTop = clamp(
          targetRect.top + targetRect.height / 2 - popoverHeight / 2,
          VIEWPORT_PADDING,
          viewportHeight - popoverHeight - VIEWPORT_PADDING
        );
        nextLeft = clamp(
          targetRect.right + POPOVER_GAP,
          VIEWPORT_PADDING,
          viewportWidth - POPOVER_WIDTH - VIEWPORT_PADDING
        );
      } else if (currentTourStep.placement === 'top') {
        nextTop = clamp(
          targetRect.top - popoverHeight - POPOVER_GAP,
          VIEWPORT_PADDING,
          viewportHeight - popoverHeight - VIEWPORT_PADDING
        );
        nextLeft = clamp(
          targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
          VIEWPORT_PADDING,
          viewportWidth - POPOVER_WIDTH - VIEWPORT_PADDING
        );
      } else {
        nextTop = clamp(
          targetRect.bottom + POPOVER_GAP,
          VIEWPORT_PADDING,
          viewportHeight - popoverHeight - VIEWPORT_PADDING
        );
        nextLeft = clamp(
          targetRect.left + targetRect.width / 2 - POPOVER_WIDTH / 2,
          VIEWPORT_PADDING,
          viewportWidth - POPOVER_WIDTH - VIEWPORT_PADDING
        );
      }

      setRect({
        top: nextTop,
        left: nextLeft,
        usingFallback: !primaryTarget && !!fallbackTarget,
      });
    };

    updatePosition();

    const interval = window.setInterval(updatePosition, 250);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [currentTourStep, isActive]);

  if (!isActive || !currentStep || !currentTourStep || !rect) {
    return null;
  }

  const description =
    rect.usingFallback && currentTourStep.fallbackDescription
      ? currentTourStep.fallbackDescription
      : currentTourStep.description;

  return (
    <div
      ref={popoverRef}
      className="pointer-events-none fixed z-[120] w-[calc(100vw-2rem)] max-w-[390px]"
      style={{ top: rect.top, left: rect.left }}
    >
      <div className="pointer-events-auto relative rounded-[34px] bg-[#38B6FF] px-8 py-7 text-white shadow-[0_24px_60px_rgba(56,182,255,0.35)]">
        <span
          className={cn(
            'absolute h-8 w-8 rotate-45 bg-[#38B6FF]',
            currentTourStep.placement === 'right' && '-left-3 top-1/2 -translate-y-1/2 rounded-[8px]',
            currentTourStep.placement === 'bottom' && 'left-10 -top-3 rounded-[8px]',
            currentTourStep.placement === 'top' && 'bottom-[-14px] left-10 rounded-[8px]'
          )}
        />

        <div className="relative z-10">
          <p className="text-4xl font-bold leading-none tracking-tight">{currentTourStep.title}</p>
          <p className="mt-5 text-[1.05rem] font-light leading-[1.35] text-white/95">
            {description}
          </p>
          <div className="mt-6 flex justify-end">
            <Button
              variant="secondary"
              className="rounded-[18px] border-none bg-white px-8 py-4 text-2xl font-bold text-[#38B6FF] shadow-none hover:bg-white/90"
              isLoading={isSaving}
              onClick={() => void handleNext()}
            >
              {currentTourStep.buttonLabel}
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-2 px-2 text-xs font-medium text-[#38B6FF]">
        Etapa {currentStepIndex + 1} de 5
      </div>
    </div>
  );
};
