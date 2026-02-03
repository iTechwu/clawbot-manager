import type { LoginData } from '../api';
import {
  createServerUserClient,
  createServerSignClient,
} from './contracts/server-client';

/**
 * 从请求头中提取 token 和过期时间信息
 */
export function extractTokenFromRequest(request: Request): {
  accessToken: string | null;
  refreshToken: string | null;
  accessExpire: number | null;
  expire: number | null;
  mptrail: string | null;
  os: string | null;
  deviceId: string | null;
  platform: string | null;
} {
  // 优先从 Authorization header 获取
  const authHeader = request.headers.get('authorization');
  let accessToken: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.substring(7);
  }

  // 从自定义 header 获取 token
  if (!accessToken) {
    accessToken = request.headers.get('x-access-token');
  }

  // 从 cookie 获取 token
  if (!accessToken) {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const tokenMatch = cookies.match(/accessToken=([^;]+)/);
      if (tokenMatch) {
        accessToken = decodeURIComponent(tokenMatch[1] || '');
      }
    }
  }

  // 获取 refresh token
  let refreshToken: string | null = request.headers.get('x-refresh-token');
  if (!refreshToken) {
    const cookies = request.headers.get('cookie');
    if (cookies) {
      const refreshMatch = cookies.match(/refreshToken=([^;]+)/);
      if (refreshMatch) {
        refreshToken = decodeURIComponent(refreshMatch[1] || '');
      }
    }
  }

  // 获取过期时间信息（从自定义 headers）
  const accessExpireHeader = request.headers.get('x-access-expire');
  const expireHeader = request.headers.get('x-refresh-expire');

  let accessExpire: number | null = null;
  let expire: number | null = null;

  if (accessExpireHeader) {
    const parsed = parseInt(accessExpireHeader, 10);
    if (!isNaN(parsed)) {
      accessExpire = parsed;
    }
  }

  if (expireHeader) {
    const parsed = parseInt(expireHeader, 10);
    if (!isNaN(parsed)) {
      expire = parsed;
    }
  }

  const mptrail = request.headers.get('x-mptrail') || '';
  const os = request.headers.get('x-os') || '';
  const deviceId = request.headers.get('x-device-id') || '';
  const platform = request.headers.get('x-platform') || '';

  return {
    accessToken,
    refreshToken,
    accessExpire,
    expire,
    mptrail,
    os,
    deviceId,
    platform,
  };
}

/**
 * 检查 access token 是否过期
 */
function isAccessTokenExpired(accessExpire: number | null): boolean {
  if (!accessExpire) {
    return true; // 如果没有过期时间信息，认为已过期
  }
  // accessExpire 是时间戳（毫秒），检查是否已过期
  return Date.now() >= accessExpire;
}

/**
 * 检查 refresh token 是否过期
 */
function isRefreshTokenExpired(expire: number | null): boolean {
  if (!expire) {
    return true; // 如果没有过期时间信息，认为已过期
  }
  // expire 是时间戳（毫秒），检查是否已过期（30天）
  return Date.now() >= expire;
}

/**
 * 验证 token 并获取用户信息
 * 使用 ts-rest 服务端客户端进行鉴权
 *
 * 逻辑：
 * 1. 如果 accessToken 未过期，直接使用它验证
 * 2. 如果 accessToken 过期但 refreshToken 未过期，使用 refreshToken 刷新
 * 3. 如果都过期，返回 null
 */
export async function verifyTokenAndGetUser(
  accessToken: string | null,
  refreshToken: string | null,
  accessExpire: number | null = null,
  expire: number | null = null,
  platform: string | null = null,
  os: string | null = null,
  deviceId: string | null = null,
  mptrail: string | null = null,
): Promise<{ userId?: string | null } | null> {
  // 如果没有 token，返回 null
  if (!accessToken && !refreshToken) {
    return null;
  }

  try {
    // 检查 refresh token 是否过期
    if (refreshToken && isRefreshTokenExpired(expire)) {
      console.warn('RefreshToken 已过期，需要重新登录');
      return null;
    }

    // 检查 access token 是否过期
    const accessExpired = accessToken
      ? isAccessTokenExpired(accessExpire)
      : true;

    // 如果 access token 未过期，尝试使用它验证
    if (accessToken && !accessExpired) {
      try {
        // 使用 ts-rest 服务端客户端
        const userClient = createServerUserClient({
          accessToken,
          platform,
          os,
          deviceId,
          mptrail,
        });

        const response = await userClient.check();

        // 如果验证成功（200 状态码）
        if (response.status === 200) {
          const data = response.body;
          if (data.code === 200 && data.data) {
            const userId = data.data.userId;
            if (userId) {
              return { userId };
            }
          }

          // 尝试从 refresh token 获取完整的用户信息（包含更多字段）
          if (refreshToken) {
            const loginData = await refreshTokenToLoginData(refreshToken);
            if (loginData) {
              return {
                userId: loginData.user?.id,
              };
            }
          }

          // 如果都无法获取，至少 token 是有效的，返回基本信息
          return { userId: null };
        }

        // 如果返回 401，说明 token 无效，尝试刷新
        if (response.status === 401) {
          console.warn(
            'AccessToken 验证失败（401），尝试使用 refreshToken 刷新',
          );
        }
      } catch (error) {
        // 如果验证失败，继续尝试刷新 token
        console.warn('使用 accessToken 验证失败:', error);
      }
    }

    // 如果 accessToken 过期或无效，且 refreshToken 未过期，尝试使用 refreshToken 刷新
    if (refreshToken && !isRefreshTokenExpired(expire)) {
      const loginData = await refreshTokenToLoginData(refreshToken);
      if (loginData) {
        return {
          userId: loginData.user?.id,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Token 验证失败:', error);
    return null;
  }
}

/**
 * 使用 refreshToken 获取登录数据（包含用户信息）
 * 使用 ts-rest 服务端客户端
 */
async function refreshTokenToLoginData(
  refreshToken: string,
): Promise<LoginData | null> {
  try {
    const signClient = createServerSignClient();
    const response = await signClient.refreshToken({
      query: { refresh: refreshToken },
    });

    if (response.status === 200) {
      const data = response.body;
      if (data.code === 200 && data.data) {
        // LoginSuccess 类型与 LoginData 兼容
        return data.data as unknown as LoginData;
      }
    }
    return null;
  } catch (error) {
    console.error('刷新 token 失败:', error);
    return null;
  }
}
