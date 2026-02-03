'use client';

/**
 * 统一的 localStorage 存储管理模块
 * 细粒度存储，避免数据冗余，支持独立更新
 */

import type { UserInfo, LoginSuccess } from '@repo/contracts';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Token 数据
 */
export interface TokenData {
  access: string;
  refresh: string;
  accessExpire: number;
  expire: number;
}

/**
 * 存储键名常量
 */
const STORAGE_KEYS = {
  USER: 'user',
  TOKENS: 'tokens',
} as const;

// ============================================================================
// Storage Operations
// ============================================================================

/**
 * 存储用户信息
 */
export function setUser(user: UserInfo): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  window.dispatchEvent(new Event('userInfoUpdated'));
}

/**
 * 获取用户信息
 */
export function getUser(): UserInfo | null {
  if (typeof window === 'undefined') return null;
  const userStr = localStorage.getItem(STORAGE_KEYS.USER);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr) as UserInfo;
  } catch {
    return null;
  }
}

/**
 * 更新用户信息（部分更新）
 */
export function updateUser(updates: Partial<UserInfo>): void {
  const currentUser = getUser();
  if (!currentUser) return;
  setUser({ ...currentUser, ...updates });
}

/**
 * 存储 Token 数据
 */
export function setTokens(tokens: TokenData): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
}

/**
 * 获取 Token 数据
 */
export function getTokens(): TokenData | null {
  if (typeof window === 'undefined') return null;
  const tokensStr = localStorage.getItem(STORAGE_KEYS.TOKENS);
  if (!tokensStr) return null;
  try {
    return JSON.parse(tokensStr) as TokenData;
  } catch {
    return null;
  }
}

/**
 * 获取 Access Token
 */
export function getAccessToken(): string | null {
  const tokens = getTokens();
  return tokens?.access || null;
}

/**
 * 获取 Refresh Token
 */
export function getRefreshToken(): string | null {
  const tokens = getTokens();
  return tokens?.refresh || null;
}

/**
 * 检查 Access Token 是否过期
 */
export function isTokenExpired(): boolean {
  const tokens = getTokens();
  if (!tokens?.accessExpire) return true;
  return Date.now() >= tokens.accessExpire;
}

/**
 * 存储登录数据（统一入口）
 * 将登录返回的数据拆分为细粒度存储
 */
export function setLoginData(data: LoginSuccess): void {
  if (typeof window === 'undefined') return;

  // 存储用户信息
  setUser(data.user);

  // 存储 Token 数据
  setTokens({
    access: data.access,
    refresh: data.refresh,
    accessExpire: data.accessExpire,
    expire: data.expire,
  });
}

/**
 * 清除所有存储数据
 */
export function clearAll(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKENS);

  // 清除旧格式的数据（兼容性清理）
  localStorage.removeItem('userInfo');
  localStorage.removeItem('tokenData');
  localStorage.removeItem('loginData');
  localStorage.removeItem('token');
}

// ============================================================================
// Backward Compatibility (临时兼容旧代码)
// ============================================================================

/**
 * 获取 Token（兼容旧代码）
 */
export function getToken(): string | null {
  return getAccessToken();
}
