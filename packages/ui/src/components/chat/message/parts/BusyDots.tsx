import React from 'react';
import { cn } from '@/lib/utils';

interface BusyDotsProps {
  className?: string;
}

// One step of `animate-busy-wave` lasts 200ms; the stagger has to stay a
// multiple of it so the three dots change on the same frames.
const DOT_DELAYS_MS = [0, 200, 400] as const;

// The wave is cancelled for users who ask for reduced motion, and a server
// render has no stylesheet to match, so the class has to carry a variant that
// survives without one. Keep every variant in `animate-busy-wave` so tests and
// the reduced-motion path can look for the same marker.
export const BUSY_WAVE_CLASS = 'animate-busy-wave';

export const BusyDots: React.FC<BusyDotsProps> = ({ className }) => (
  <>
    {'\u00A0'}
    <span className={cn('inline-flex', className)} aria-hidden="true" data-busy-dots="true">
      {DOT_DELAYS_MS.map((delay) => (
        <span
          key={delay}
          className={BUSY_WAVE_CLASS}
          style={{ animationDelay: `${delay}ms` }}
        >
          .
        </span>
      ))}
    </span>
  </>
);
