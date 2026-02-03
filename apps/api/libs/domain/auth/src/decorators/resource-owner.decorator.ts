import { SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';

export const RESOURCE_OWNER_KEY = 'resource_owner_check';

/**
 * 资源所有者检查配置
 */
export interface ResourceOwnerCheck {
  resourceType: 'fileSystem';
  paramSource: 'params' | 'query' | 'body';
  resourceIdField: string; // 资源 ID 在请求参数中的字段名
  allowSystemAdmin?: boolean; // 是否允许系统管理员访问（默认 true）
}

/**
 * 要求请求者是资源所有者
 *
 * @example
 * // 基础用法 - 会议记录
 * @RequireResourceOwner({
 *     resourceType: 'meetingRecord',
 *     paramSource: 'params',
 *     resourceIdField: 'id',
 * })
 * async deleteMeeting() {}
 *
 * @example
 * // 文件系统（文件/文件夹）
 * @RequireResourceOwner({
 *     resourceType: 'fileSystem',
 *     paramSource: 'params',
 *     resourceIdField: 'fileId',
 * })
 * async deleteFile() {}
 *
 * @example
 * // 只允许所有者
 * @RequireResourceOwner({
 *     resourceType: 'candidate',
 *     paramSource: 'params',
 *     resourceIdField: 'id',
 * })
 * async deleteCandidate() {}
 *
 * @example
 * // 候选人 - 检查上传者
 * @RequireResourceOwner({
 *     resourceType: 'candidate',
 *     paramSource: 'params',
 *     resourceIdField: 'candidateId',
 * })
 * async updateCandidate() {}
 */
export const RequireResourceOwner = (
  check: ResourceOwnerCheck,
): MethodDecorator => {
  // 导入 Guard（延迟导入避免循环依赖）
  const { ResourceOwnerGuard } = require('../guards/resource-owner.guard');

  return applyDecorators(
    SetMetadata(RESOURCE_OWNER_KEY, {
      ...check,
      allowSystemAdmin: check.allowSystemAdmin ?? true,
    }),
    UseGuards(ResourceOwnerGuard),
  );
};
