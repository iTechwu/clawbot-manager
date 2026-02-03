'use client';

import * as React from 'react';
import { cn } from '@repo/utils';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  checkPasswordStrength,
  type PasswordStrengthLevel,
  type PasswordStrengthResult,
} from '@repo/validators';

/**
 * Password strength bar variants
 */
const strengthBarVariants = cva(
  'h-1.5 rounded-full transition-all duration-300',
  {
    variants: {
      level: {
        weak: 'bg-red-500',
        medium: 'bg-yellow-500',
        strong: 'bg-green-500',
        very_strong: 'bg-emerald-600',
      },
    },
    defaultVariants: {
      level: 'weak',
    },
  },
);

/**
 * Password strength text variants
 */
const strengthTextVariants = cva('text-xs font-medium', {
  variants: {
    level: {
      weak: 'text-red-600 dark:text-red-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      strong: 'text-green-600 dark:text-green-400',
      very_strong: 'text-emerald-700 dark:text-emerald-400',
    },
  },
  defaultVariants: {
    level: 'weak',
  },
});

/**
 * Strength level labels (internationalization-ready)
 */
const strengthLabels: Record<
  PasswordStrengthLevel,
  { en: string; zh: string }
> = {
  weak: { en: 'Weak', zh: '弱' },
  medium: { en: 'Medium', zh: '中' },
  strong: { en: 'Strong', zh: '强' },
  very_strong: { en: 'Very Strong', zh: '非常强' },
};

export interface PasswordStrengthProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof strengthBarVariants> {
  /** Password to evaluate */
  password: string;
  /** Show suggestions for improvement */
  showSuggestions?: boolean;
  /** Language for labels */
  locale?: 'en' | 'zh';
  /** Minimum password length to start showing strength */
  minLengthToShow?: number;
  /** Custom class for the container */
  containerClassName?: string;
  /** Custom class for the bar track */
  trackClassName?: string;
  /** Custom class for suggestions */
  suggestionsClassName?: string;
  /** Callback when strength changes */
  onStrengthChange?: (result: PasswordStrengthResult) => void;
}

/**
 * Password Strength Indicator Component
 *
 * Displays a visual indicator of password strength with:
 * - Color-coded progress bar (red/yellow/green)
 * - Strength level text
 * - Optional improvement suggestions
 *
 * @example
 * ```tsx
 * <PasswordStrength
 *   password={password}
 *   showSuggestions
 *   locale="zh"
 * />
 * ```
 */
function PasswordStrength({
  password,
  showSuggestions = true,
  locale = 'en',
  minLengthToShow = 1,
  containerClassName,
  trackClassName,
  suggestionsClassName,
  className,
  onStrengthChange,
  ...props
}: PasswordStrengthProps) {
  const [result, setResult] = React.useState<PasswordStrengthResult | null>(
    null,
  );

  React.useEffect(() => {
    if (password && password.length >= minLengthToShow) {
      const strengthResult = checkPasswordStrength(password);
      setResult(strengthResult);
      onStrengthChange?.(strengthResult);
    } else {
      setResult(null);
    }
  }, [password, minLengthToShow, onStrengthChange]);

  // Don't render if password is too short
  if (!password || password.length < minLengthToShow || !result) {
    return null;
  }

  // Calculate bar width percentage based on score (0-7)
  const widthPercentage = Math.min(100, Math.round((result.score / 7) * 100));
  const strengthLabel = strengthLabels[result.level][locale];

  return (
    <div
      className={cn('space-y-2', containerClassName)}
      data-slot="password-strength"
      {...props}
    >
      {/* Strength bar container */}
      <div className={cn('space-y-1', className)}>
        {/* Progress track */}
        <div
          className={cn(
            'h-1.5 w-full rounded-full bg-gray-200 dark:bg-gray-700',
            trackClassName,
          )}
        >
          {/* Progress bar */}
          <div
            className={strengthBarVariants({ level: result.level })}
            style={{ width: `${widthPercentage}%` }}
            role="progressbar"
            aria-valuenow={result.score}
            aria-valuemin={0}
            aria-valuemax={7}
            aria-label={`Password strength: ${strengthLabel}`}
          />
        </div>

        {/* Strength label */}
        <div className="flex items-center justify-between">
          <span className={strengthTextVariants({ level: result.level })}>
            {strengthLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {result.score}/7
          </span>
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && result.suggestions.length > 0 && (
        <ul
          className={cn(
            'space-y-0.5 text-xs text-muted-foreground',
            suggestionsClassName,
          )}
        >
          {result.suggestions.map((suggestion, index) => (
            <li key={index} className="flex items-center gap-1.5">
              <span className="text-yellow-500">•</span>
              {suggestion}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * usePasswordStrength hook
 *
 * Custom hook for password strength validation with real-time updates.
 *
 * @example
 * ```tsx
 * const { strength, isStrong, suggestions } = usePasswordStrength(password);
 * ```
 */
function usePasswordStrength(password: string, minLength = 1) {
  const [result, setResult] = React.useState<PasswordStrengthResult | null>(
    null,
  );

  React.useEffect(() => {
    if (password && password.length >= minLength) {
      setResult(checkPasswordStrength(password));
    } else {
      setResult(null);
    }
  }, [password, minLength]);

  return {
    /** Full strength result */
    result,
    /** Current strength level */
    level: result?.level ?? null,
    /** Numeric score (0-7) */
    score: result?.score ?? 0,
    /** Improvement suggestions */
    suggestions: result?.suggestions ?? [],
    /** Whether password meets minimum requirements */
    isWeak: result?.level === 'weak',
    /** Whether password is medium strength */
    isMedium: result?.level === 'medium',
    /** Whether password is strong enough */
    isStrong: result?.level === 'strong' || result?.level === 'very_strong',
    /** Whether password is very strong */
    isVeryStrong: result?.level === 'very_strong',
    /** Check if password meets a minimum level */
    meetsLevel: (minLevel: PasswordStrengthLevel) => {
      if (!result) return false;
      const levels: PasswordStrengthLevel[] = [
        'weak',
        'medium',
        'strong',
        'very_strong',
      ];
      return levels.indexOf(result.level) >= levels.indexOf(minLevel);
    },
  };
}

export { PasswordStrength, usePasswordStrength, strengthLabels };
