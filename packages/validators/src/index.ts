import { z } from 'zod';

/**
 * Shared validation schemas between frontend and backend
 * Use zod for type-safe validation that works in both environments
 */

// =============================================================================
// Common Schemas
// =============================================================================

// Email validation
export const emailSchema = z.string().email('Invalid email address');

// Password validation (min 8 chars, at least one letter and number)
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Strong password validation (more strict requirements)
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(32, 'Password must be at most 32 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(
    /[^a-zA-Z0-9]/,
    'Password must contain at least one special character',
  );

/**
 * Password strength levels
 */
export type PasswordStrengthLevel =
  | 'weak'
  | 'medium'
  | 'strong'
  | 'very_strong';

/**
 * Password strength check result
 */
export interface PasswordStrengthResult {
  /** Strength score (0-7) */
  score: number;
  /** Strength level */
  level: PasswordStrengthLevel;
  /** Improvement suggestions */
  suggestions: string[];
}

/**
 * Check password strength
 *
 * @param password - Password to check
 * @returns Password strength result with score, level and suggestions
 *
 * @example
 * ```typescript
 * const result = checkPasswordStrength('MyP@ss123');
 * console.log(result.level); // 'strong'
 * console.log(result.suggestions); // []
 * ```
 */
export function checkPasswordStrength(
  password: string,
): PasswordStrengthResult {
  let score = 0;
  const suggestions: string[] = [];

  // Length scoring
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // Character type scoring
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add lowercase letters');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add uppercase letters');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add numbers');
  }

  if (/[^a-zA-Z0-9]/.test(password)) {
    score += 1;
  } else {
    suggestions.push('Add special characters (!@#$%^&*)');
  }

  // Determine strength level
  let level: PasswordStrengthLevel;
  if (score <= 3) {
    level = 'weak';
  } else if (score <= 5) {
    level = 'medium';
  } else if (score <= 6) {
    level = 'strong';
  } else {
    level = 'very_strong';
  }

  return { score, level, suggestions };
}

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores and hyphens',
  );

// Pagination validation
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

// ID validation (UUID or numeric)
export const idSchema = z.union([
  z.string().uuid('Invalid UUID format'),
  z.coerce.number().int().positive('ID must be a positive integer'),
]);

// Date range validation
export const dateRangeSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: 'Start date must be before or equal to end date',
    path: ['startDate'],
  });

// Common login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Common register schema
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema.optional(),
});

// Types inferred from schemas
export type Email = z.infer<typeof emailSchema>;
export type Password = z.infer<typeof passwordSchema>;
export type StrongPassword = z.infer<typeof strongPasswordSchema>;
export type Username = z.infer<typeof usernameSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
export type Id = z.infer<typeof idSchema>;
export type DateRange = z.infer<typeof dateRangeSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// Re-export zod for convenience
export { z };
