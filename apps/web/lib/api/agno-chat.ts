import { isTokenExpired, ensureValidToken, type TokenData } from '../api';

/**
 * Python后端Session响应格式
 */
export interface AgnoChatSession {
  id: number;
  session_id: string; // UUID格式的thread_id
  user_id: string | null;
  title: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  message_count?: number;
}

/**
 * Python后端Chat消息响应格式
 */
export interface AgnoChatMessage {
  id: number;
  session_id: string; // UUID格式的thread_id
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  message_id: string | null;
  tool_call_id: string | null;
  tool_calls: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * 创建会话响应
 */
export type CreateSessionResponse = AgnoChatSession;

/**
 * 获取会话信息响应
 */
export type GetSessionResponse = AgnoChatSession;

/**
 * 获取会话消息响应
 */
export interface GetSessionMessagesResponse extends AgnoChatSession {
  messages: AgnoChatMessage[];
}

/**
 * 获取用户历史会话响应
 */
export interface GetUserHistoryResponse {
  sessions: AgnoChatSession[];
  total: number;
}

/**
 * 从 localStorage 获取 tokenData
 */
import { getTokens } from '@/lib/storage';

function getTokenData(): TokenData | null {
  return getTokens();
}

/**
 * 获取认证 headers
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const tokenData = getTokenData();

  if (!tokenData) {
    return {};
  }

  // 检查 access token 是否过期
  const accessExpired = isTokenExpired();

  let accessToken = tokenData.access;

  // 如果 access token 过期但 refresh token 未过期，尝试刷新
  if (accessExpired && tokenData.refresh) {
    // 检查 refresh token 是否过期（30天）
    const refreshExpired = Date.now() >= tokenData.expire;

    if (!refreshExpired) {
      try {
        // 使用 ensureValidToken 自动刷新 token
        accessToken = await ensureValidToken();
      } catch (error) {
        console.error('Token 刷新失败:', error);
        // 刷新失败，使用原 token，让服务端处理
      }
    }
  }

  // 构建 headers
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
    headers['x-access-token'] = accessToken;
  }

  if (tokenData.refresh) {
    headers['x-refresh-token'] = tokenData.refresh;
  }

  // 传递过期时间信息，方便服务端判断
  if (tokenData.accessExpire) {
    headers['x-access-expire'] = tokenData.accessExpire.toString();
  }

  if (tokenData.expire) {
    headers['x-refresh-expire'] = tokenData.expire.toString();
  }

  return headers;
}

/**
 * 调用 Next.js API route
 */
async function callNextApiRoute<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' = 'GET',
  params?: Record<string, string | number>,
  body?: Record<string, unknown>,
): Promise<T> {
  const authHeaders = await getAuthHeaders();

  // 构建查询参数
  const searchParams = new URLSearchParams();
  searchParams.set('endpoint', endpoint);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
  }

  const url = `/api/agno-chat?${searchParams.toString()}`;

  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
  };

  if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: '请求失败' }));
    throw new Error(error.message || error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Agno Chat API（通过Next.js API route调用Python后端）
 *
 * 注意：这些API通过/api/agno-chat路由调用，在server端验证user_id后再调用Python后端
 * user_id的有效性已经在Next.js API route中验证（通过verifyTokenAndGetUser）
 * Python后端不需要认证，因为前端server端只允许在内网中访问Python的接口
 */
export const agnoChatApi = {
  /**
   * 创建会话
   * POST /api/agno-chat?endpoint=/v1/session/create&title=新对话
   * 注意：创建会话使用POST请求，title通过查询参数传递（符合文档规范）
   */
  async createSession(title?: string): Promise<CreateSessionResponse> {
    const params: Record<string, string | number> = {};
    if (title) {
      params.title = title;
    }
    return callNextApiRoute<CreateSessionResponse>(
      '/v1/session/create',
      'POST',
      params,
    );
  },

  /**
   * 获取会话信息
   * GET /api/agno-chat?endpoint=/v1/session/{session_id}
   */
  async getSession(sessionId: string): Promise<GetSessionResponse> {
    return callNextApiRoute<GetSessionResponse>(
      `/v1/session/${sessionId}`,
      'GET',
    );
  },

  /**
   * 更新会话标题
   * PATCH /api/agno-chat?endpoint=/v1/session/{session_id}&title=xxx
   */
  async updateSession(
    sessionId: string,
    title: string,
  ): Promise<GetSessionResponse> {
    return callNextApiRoute<GetSessionResponse>(
      `/v1/session/${sessionId}`,
      'PATCH',
      { title },
    );
  },

  /**
   * 获取会话消息
   * GET /api/agno-chat?endpoint=/v1/chat/session/{session_id}&limit=xxx&offset=xxx
   */
  async getSessionMessages(
    sessionId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<GetSessionMessagesResponse> {
    const params: Record<string, string | number> = {};
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset;
    }
    return callNextApiRoute<GetSessionMessagesResponse>(
      `/v1/chat/session/${sessionId}`,
      'GET',
      params,
    );
  },

  /**
   * 获取用户历史会话
   * GET /api/agno-chat?endpoint=/v1/chat/history&limit=xxx&offset=xxx
   */
  async getUserHistory(options?: {
    limit?: number;
    offset?: number;
  }): Promise<GetUserHistoryResponse> {
    const params: Record<string, string | number> = {};
    if (options?.limit !== undefined) {
      params.limit = options.limit;
    }
    if (options?.offset !== undefined) {
      params.offset = options.offset;
    }
    return callNextApiRoute<GetUserHistoryResponse>(
      '/v1/chat/history',
      'GET',
      params,
    );
  },
};
