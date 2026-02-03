/**
 * ts-rest Utilities Export
 * ts-rest 工具导出
 *
 * 提供标准化的响应辅助函数：
 * - success(data) - 成功响应
 * - created(data) - 创建成功响应 (201)
 * - deleted() - 删除成功响应
 * - paginated(list, total, page, limit) - 分页响应
 * - error(errorCode) - 错误码响应
 * - errorFromType(type, code, status) - 错误类型响应
 * - errorSimple(code, msg) - 简单错误响应
 */

export {
  success,
  created,
  deleted,
  deletedWithData,
  paginated,
  error,
  errorFromType,
  errorSimple,
  serializeDates,
  type TsRestResponse,
} from './response.helper';
