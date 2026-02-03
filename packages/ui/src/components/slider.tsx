'use client';

import * as React from 'react';
import { cn } from '@repo/utils';

export interface SliderProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'type' | 'value' | 'defaultValue' | 'onChange'
  > {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  (
    {
      className,
      value,
      defaultValue,
      onValueChange,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState<number[]>(
      defaultValue || value || [min],
    );

    const currentValue = value !== undefined ? value : internalValue;
    const sliderValue = currentValue[0] ?? min;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = [parseFloat(e.target.value)];
      if (value === undefined) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const percentage = ((sliderValue - min) / (max - min)) * 100;

    return (
      <div className={cn('relative flex w-full items-center', className)}>
        <input
          ref={ref}
          type="range"
          min={min}
          max={max}
          step={step}
          value={sliderValue}
          onChange={handleChange}
          disabled={disabled}
          className={cn(
            'h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 dark:bg-gray-700',
            'disabled:cursor-not-allowed disabled:opacity-50',
            // Webkit styles
            '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:active:scale-95',
            // Firefox styles
            '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:transition-all [&::-moz-range-thumb]:hover:scale-110 [&::-moz-range-thumb]:active:scale-95',
            // Track progress fill
            '[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-gray-200 [&::-webkit-slider-runnable-track]:dark:bg-gray-700',
            '[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-gray-200 [&::-moz-range-track]:dark:bg-gray-700',
            className,
          )}
          style={{
            background: `linear-gradient(to right, hsl(var(--primary, 221.2 83.2% 53.3%)) 0%, hsl(var(--primary, 221.2 83.2% 53.3%)) ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`,
          }}
          {...props}
        />
      </div>
    );
  },
);

Slider.displayName = 'Slider';

export { Slider };
