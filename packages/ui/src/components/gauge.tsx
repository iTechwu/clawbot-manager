'use client';

import * as React from 'react';
import { cn } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const gaugeVariants = cva('flex flex-col items-center relative', {
  variants: {
    size: {
      sm: 'w-20',
      md: 'w-[120px]',
      lg: 'w-40',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

const valueTextVariants = cva('font-bold text-foreground', {
  variants: {
    size: {
      sm: 'text-base',
      md: 'text-2xl',
      lg: 'text-[32px]',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

export interface GaugeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gaugeVariants> {
  value: number;
  max?: number;
  label?: string;
  unit?: string;
  showValue?: boolean;
  thresholds?: {
    warning: number;
    danger: number;
  };
}

const Gauge = React.forwardRef<HTMLDivElement, GaugeProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 'md',
      label,
      unit = '%',
      showValue = true,
      thresholds = { warning: 70, danger: 90 },
      ...props
    },
    ref,
  ) => {
    const percentage = Math.min((value / max) * 100, 100);
    const circumference = 2 * Math.PI * 45; // radius = 45
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    // Determine color based on thresholds
    let strokeColor = 'stroke-emerald-500';
    let glowColor = 'drop-shadow-[0_0_4px_rgba(16,185,129,0.5)]';
    if (percentage >= thresholds.danger) {
      strokeColor = 'stroke-red-500';
      glowColor = 'drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]';
    } else if (percentage >= thresholds.warning) {
      strokeColor = 'stroke-amber-500';
      glowColor = 'drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]';
    }

    const displayValue = max === 100 ? Math.round(value) : value.toFixed(1);

    return (
      <div
        ref={ref}
        className={cn(gaugeVariants({ size }), className)}
        {...props}
      >
        <svg viewBox="0 0 100 100" className="w-full h-auto">
          {/* Background track */}
          <circle
            className="stroke-muted"
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = (tick / 100) * 270 - 135; // -135 to 135 degrees
            const rad = (angle * Math.PI) / 180;
            const innerR = 38;
            const outerR = 42;
            return (
              <line
                key={tick}
                className="stroke-muted-foreground/50"
                x1={50 + innerR * Math.cos(rad)}
                y1={50 + innerR * Math.sin(rad)}
                x2={50 + outerR * Math.cos(rad)}
                y2={50 + outerR * Math.sin(rad)}
                strokeWidth="2"
              />
            );
          })}
          {/* Value arc */}
          <circle
            className={cn(
              strokeColor,
              glowColor,
              'transition-all duration-500 ease-out',
            )}
            cx="50"
            cy="50"
            r="45"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
          />
        </svg>
        {showValue && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center flex flex-col items-center leading-none">
            <span className={cn(valueTextVariants({ size }))}>
              {displayValue}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground uppercase md:text-[11px]">
              {unit}
            </span>
          </div>
        )}
        {label && (
          <div className="mt-2 font-mono text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        )}
      </div>
    );
  },
);
Gauge.displayName = 'Gauge';

export { Gauge, gaugeVariants };
