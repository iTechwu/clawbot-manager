import { Type, applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { Response } from '@/utils/response';

const baseTypeNames = ['String', 'Number', 'Boolean'];

/**
 * 封装 swagger 返回统一结构
 * 支持复杂类型 { code, msg, data }
 * @param model 返回的 data 的数据类型
 * @param isArray data 是否是数组
 * @param isPager 设置为 true, 则 data 类型为 { list, total } , false data 类型是纯数组
 */
export const ApiResponse = <TModel extends Type<any>>(
  model?: TModel,
  isArray?: boolean,
  isPager?: boolean,
) => {
  const modelIsBaseType = model && baseTypeNames.includes(model.name);
  const items = modelIsBaseType
    ? { type: model.name.toLocaleLowerCase() }
    : model
      ? { $ref: getSchemaPath(model) }
      : null;

  const prop =
    isArray && isPager
      ? {
          type: 'object',
          properties: {
            list: {
              type: 'array',
              items,
            },
            total: {
              type: 'number',
              default: 0,
            },
          },
        }
      : isArray
        ? {
            type: 'array',
            items,
          }
        : items
          ? items
          : { type: 'null', default: null };

  return applyDecorators(
    ApiExtraModels(
      ...(model && !modelIsBaseType ? [Response, model] : [Response]),
    ),
    ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(Response) },
          {
            properties: {
              data: prop,
            },
          },
        ],
      },
    }),
  );
};
