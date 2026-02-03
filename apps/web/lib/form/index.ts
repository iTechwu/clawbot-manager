/**
 * Form Module Index
 * 表单模块导出
 */

export {
  useForm,
  validationPatterns,
  createPasswordConfirmation,
  type FormFieldProps,
} from './use-form';

// Re-export useful types from react-hook-form
export type {
  UseFormReturn,
  FieldValues,
  FieldErrors,
  SubmitHandler,
  SubmitErrorHandler,
} from 'react-hook-form';

// Re-export zod for convenience
export { z } from 'zod';
