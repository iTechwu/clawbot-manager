import { registerDecorator, ValidationArguments } from 'class-validator';
import { ApiException } from '../filter/exception/api.exception';
import { ErrorMessageEnums } from '../enums/error-codes';
import stringUtil from '@/utils/string.util';

// 自定义装饰器
export function LengthValidator(
  min: number,
  max: number,
  errorTypeMin: string,
  errorTypeMax: string,
  field: string = '',
  validateErrorType: string = 'invalidParameters',
) {
  return function (object: object, propertyName: string) {
    const errorMin = ErrorMessageEnums[errorTypeMin];
    const errorMax = ErrorMessageEnums[errorTypeMax];
    registerDecorator({
      name: 'LengthValidator',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [min, max, errorMin.errorCode, errorMax.errorCode],
      options: {
        message: (args: ValidationArguments) => {
          if (typeof args.value !== 'string') return `类型必须为字符串`;
          if (args.value.length < min) return errorMin.message;
          if (args.value.length > max) return errorMax.message;
          return '';
        },
      },
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [min, max] = args.constraints;
          if (typeof value !== 'string') {
            throw new ApiException(validateErrorType, { field });
          }
          if (value.length < min) {
            throw new ApiException(errorTypeMin, { field });
          } else if (value.length > max) {
            throw new ApiException(errorTypeMax, { field });
          }
          return true;
        },
      },
    });
  };
}

// 自定义装饰器
export function IsDateFormat(
  field: string,
  canbeNull: boolean = true,
  errorType: string = 'invalidParameters',
) {
  return function (object: object, propertyName: string) {
    const error = ErrorMessageEnums[errorType];
    registerDecorator({
      name: 'IsDateFormat',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: (args: ValidationArguments) => {
          if (typeof args.value !== 'string') return `类型必须为字符串格式`;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(args.value)) return error.message;
          return '';
        },
      },
      validator: {
        validate(value: any) {
          if (!value && canbeNull) return true;
          if (typeof value !== 'string') {
            throw new ApiException(errorType, { field });
          }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new ApiException(errorType, { field });
          }
          return true;
        },
      },
    });
  };
}

// 自定义装饰器
export function IsUUIDFormat(
  field: string,
  canbeNull: boolean = true,
  errorType: string = 'invalidParameters',
) {
  return function (object: object, propertyName: string) {
    const error = ErrorMessageEnums[errorType];
    registerDecorator({
      name: 'IsUUIDFormat',
      target: object.constructor,
      propertyName: propertyName,
      options: {
        message: (args: ValidationArguments) => {
          if (typeof args.value !== 'string') return `类型必须为字符串格式`;
          if (!stringUtil.isUUID(args.value)) return error.message;
          return '';
        },
      },
      validator: {
        validate(value: any) {
          if (['folderId', 'parentId'].includes(field) && value == 'root') {
            value = null;
          }
          if (!value && canbeNull) return true;
          if (typeof value !== 'string') {
            throw new ApiException(errorType, { field });
          }
          if (!stringUtil.isUUID(value)) {
            throw new ApiException(errorType, { field });
          }
          return true;
        },
      },
    });
  };
}
