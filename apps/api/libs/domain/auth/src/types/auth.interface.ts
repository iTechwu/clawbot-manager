import { FastifyRequest } from 'fastify';
import { z } from 'zod';

/**
 * 认证上下文 Schema
 */
export const AuthContextSchema = z.object({
  userId: z.string(),
  isAdmin: z.boolean().optional(),
  isAnonymity: z.boolean().optional(),
  openid: z.string().optional(),
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

/**
 * 用户信息 Schema（从 JWT 解析）
 */
export const AuthUserInfoSchema = z.object({
  id: z.string(),
  nickname: z.string().optional(),
  code: z.string().optional(),
  headerImg: z.string().optional(),
  sex: z.string().optional(),
  planExpireAt: z.string().optional(),
  isAdmin: z.boolean(),
  isAnonymity: z.boolean(),
  openid: z.string().optional(),
});

export type AuthUserInfo = z.infer<typeof AuthUserInfoSchema>;

/**
 * 认证请求接口
 * 扩展 FastifyRequest，包含认证相关的信息
 *
 * 由 AuthGuard 设置的字段:
 * - userId: 用户ID
 * - isAdmin: 是否为管理员
 * - isAnonymity: 是否为匿名用户
 * - openid: 用户openid
 * - uid: 用户ID (别名)
 * - userInfo: 用户信息
 */
export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  isAdmin: boolean;
  isAnonymity: boolean;
  openid?: string;
  uid: string;
  userInfo: AuthUserInfo;
}
