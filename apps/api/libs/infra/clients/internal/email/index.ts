/**
 * Email Clients
 *
 * 纯 Email API 客户端集合
 * - 不访问数据库
 * - 不包含业务逻辑
 */
export { SendCloudClient } from './sendcloud.client';

// Re-export DTO types
export * from './dto/email.dto';
