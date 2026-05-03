import * as React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../shared/components/Button';
import { cn } from '../../../shared/utils/cn';
import { useIsMobile } from '../../mobile/hooks/useIsMobile';
import { useTrialGuidedFlow } from '../hooks/useTrialGuidedFlow';

const POPOVER_WIDTH = 280;
const POPOVER_GAP = 14;
const VIEWPORT_PADDING = 16;

type RectState = {
  top: number;
  left: number;
  targetTop: number;
  targetLeft: number;
  targetWidth: number;
  targetHeight: number;
  viewportHeight: number;
  viewportWidth: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const TrialGuidedPopover = () => {
  const isMobile = useIsMobile();
  const { currentStep, currentStepIndex, currentTourStep, handleNext, isActive, isSaving } =
    useTrialGuidedFlow();
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const lastScrolledStepIdRef = React.useRef<string | null>(null);
  const [rect, setRect] = React.useState<RectState | null>(null);

  React.useEffect(() => {
    if (!isActive || !currentTourStep) {
      lastScrolledStepIdRef.current = null;
      return;
    }

    const target = document.querySelector<HTMLElement>(
      `[data-tour-id="${currentTourStep.targetId}"]`
    );

    if (!target) {
      return;
    }

    const previousScrollMarginTop = target.style.scrollMarginTop;
    const previousScrollMarginBottom = target.style.scrollMarginBottom;
    const previousScrollMarginInline = target.style.scrollMarginInline;

    if (isMobile) {
      target.style.scrollMarginTop = '136px';
      target.style.scrollMarginBottom = '224px';
      target.style.scrollMarginInline = '16px';
    }

    const targetRect = target.getBoundingClientRect();
    const viewportTopPadding = isMobile ? 104 : 32;
    const viewportBottomPadding = isMobile ? 190 : 32;
    const isOutsideSafeArea =
      targetRect.top < viewportTopPadding ||
      targetRect.bottom > window.innerHeight - viewportBottomPadding;

    if (lastScrolledStepIdRef.current !== currentTourStep.id || isOutsideSafeArea) {
      target.scrollIntoView({
        behavior: 'smooth',
        block: isMobile ? 'center' : 'nearest',
        inline: isMobile ? 'nearest' : 'center',
      });
      lastScrolledStepIdRef.current = currentTourStep.id;
    }

    return () => {
      target.style.scrollMarginTop = previousScrollMarginTop;
      target.style.scrollMarginBottom = previousScrollMarginBottom;
      target.style.scrollMarginInline = previousScrollMarginInline;
    };
  }, [currentTourStep, isActive, isMobile]);

  React.useLayoutEffect(() => {
    if (!isActive || !currentTourStep) {
      setRect(null);
      return;
    }

    const updatePosition = () => {
      const target = document.querySelector<HTMLElement>(
        `[data-tour-id="${currentTourStep.targetId}"]`
      );

      if (!target) {
        setRect(null);
        return;
      }

      const targetRect = target.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? 240;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let nextTop = VIEWPORT_PADDING;
      let nextLeft = VIEWPORT_PADDING;

      if (!isMobile) {
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
      }

      setRect({
        top: nextTop,
        left: nextLeft,
        targetTop: targetRect.top,
        targetLeft: targetRect.left,
        targetWidth: targetRect.width,
        targetHeight: targetRect.height,
        viewportHeight,
        viewportWidth,
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
  }, [currentTourStep, isActive, isMobile]);

  if (!isActive || !currentStep || !currentTourStep || !rect) {
    return null;
  }

  const stepDescription = isMobile
    ? currentTourStep.mobileDescription ?? currentTourStep.description
    : currentTourStep.description;
  const mobileHint = isMobile ? currentTourStep.mobileHint : null;
  const showMobileCardAtTop = rect.targetTop > rect.viewportHeight * 0.62;
  const highlightWidth = Math.min(rect.targetWidth + 12, rect.viewportWidth - 16);
  const highlightLeft = clamp(rect.targetLeft - 6, 8, rect.viewportWidth - highlightWidth - 8);

  const overlay = (
    <>
      <div className="pointer-events-none fixed inset-0 z-[118] bg-slate-950/14" aria-hidden="true" />
      <div
        className="pointer-events-none fixed z-[119] rounded-[20px] border-2 border-[#38B6FF] bg-[#38B6FF]/10 shadow-[0_0_0_6px_rgba(56,182,255,0.15)] transition-all duration-300"
        style={{
          top: rect.targetTop - 6,
          left: highlightLeft,
          width: highlightWidth,
          height: rect.targetHeight + 12,
        }}
        aria-hidden="true"
      >
        <div className="h-full w-full animate-pulse rounded-[16px] border border-white/80" />
      </div>

      {isMobile ? (
        <div
          className={cn(
            'pointer-events-none fixed inset-x-0 z-[120] px-3 md:hidden',
            showMobileCardAtTop
              ? 'top-[calc(5.25rem+env(safe-area-inset-top))]'
              : 'bottom-[calc(5.75rem+env(safe-area-inset-bottom))]'
          )}
        >
          <div className="pointer-events-none mx-auto max-w-[22.5rem] rounded-[24px] bg-[#38B6FF] px-4 py-3.5 text-white shadow-[0_18px_36px_rgba(56,182,255,0.3)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/72">
                  Etapa {currentStepIndex + 1} de 5
                </p>
                <p className="mt-1 text-[1.1rem] font-bold leading-none tracking-tight">
                  {currentTourStep.title}
                </p>
              </div>
              <div className="rounded-full bg-white/16 px-2.5 py-1 text-[0.68rem] font-semibold text-white/88">
                Tour mobile
              </div>
            </div>

            {mobileHint ? (
              <div className="mt-3 rounded-[16px] bg-white/14 px-3 py-2 text-[0.78rem] font-semibold leading-5 text-white/92">
                {mobileHint}
              </div>
            ) : null}

            <p className="mt-3 text-[0.95rem] leading-7 text-white/96">{stepDescription}</p>

            {currentTourStep.nextAction === 'wait_for_action' ? (
              <div className="mt-4 rounded-[18px] bg-white/18 px-3 py-3 text-[0.92rem] font-semibold text-white">
                {currentTourStep.buttonLabel}
              </div>
            ) : (
              <div className="pointer-events-auto mt-4 flex justify-end">
                <Button
                  variant="secondary"
                  className="min-h-[44px] rounded-[18px] border-none bg-white px-4 py-2.5 text-[0.95rem] font-bold text-[#38B6FF] shadow-none hover:bg-white/90"
                  isLoading={isSaving}
                  onClick={() => void handleNext()}
                >
                  {currentTourStep.buttonLabel}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
          ref={popoverRef}
          className="pointer-events-none fixed z-[120] w-[calc(100vw-2rem)] max-w-[280px]"
          style={{ top: rect.top, left: rect.left }}
        >
          <div className="pointer-events-auto relative rounded-[24px] bg-[#38B6FF] px-5 py-4 text-white shadow-[0_18px_45px_rgba(56,182,255,0.32)]">
            <span
              className={cn(
                'absolute h-6 w-6 rotate-45 bg-[#38B6FF]',
                currentTourStep.placement === 'right' &&
                  '-left-2.5 top-1/2 -translate-y-1/2 rounded-[6px]',
                currentTourStep.placement === 'bottom' && 'left-8 -top-2.5 rounded-[6px]',
                currentTourStep.placement === 'top' && 'bottom-[-10px] left-8 rounded-[6px]'
              )}
            />

            <div className="relative z-10">
              <p className="text-xl font-bold leading-none tracking-tight">{currentTourStep.title}</p>
              <p className="mt-3 text-sm leading-[1.45] text-white/95">{stepDescription}</p>
              {currentTourStep.nextAction === 'wait_for_action' ? (
                <div className="mt-4 rounded-[14px] bg-white/20 px-3 py-2 text-sm font-semibold text-white">
                  {currentTourStep.buttonLabel}
                </div>
              ) : (
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="secondary"
                    className="rounded-[14px] border-none bg-white px-4 py-2.5 text-base font-bold text-[#38B6FF] shadow-none hover:bg-white/90"
                    isLoading={isSaving}
                    onClick={() => void handleNext()}
                  >
                    {currentTourStep.buttonLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="mt-2 px-2 text-xs font-medium text-[#38B6FF]">
            Etapa {currentStepIndex + 1} de 5
          </div>
        </div>
      )}
    </>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  return createPortal(overlay, document.body);
};
