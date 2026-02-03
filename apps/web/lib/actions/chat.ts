'use server';
import request from '@/lib/requests';

interface ChatSession {
  agent_session_id: string;
  session_id: string;
  session_name: string;
  session_state: Record<string, unknown>;
  chat_history: unknown[];
  created_at: string;
  updated_at: string;
}

// 聊天详情类型定义
export interface ChatSessionSummary {
  summary: string;
  updated_at: string;
}

export interface ChatModelDetail {
  provider: string;
  name: string;
  id: string;
}

export interface AgentData {
  name: string;
  agent_id: string;
  model: ChatModelDetail;
}

export interface ChatMetrics {
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  audio_input_tokens: number;
  audio_output_tokens: number;
  audio_total_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
}

export interface ChatMessage {
  id: string;
  content: string;
  reasoning_content: string;
  from_history: boolean;
  stop_after_tool_call: boolean;
  role: 'system' | 'user' | 'assistant';
  created_at: number;
  metrics?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  provider_data?: Record<string, unknown>;
}

// {
//     "id": "df9e3a2b-ea4f-427a-955a-706c8a3d0b0b",
//     "content": "12312",
//     "from_history": false,
//     "stop_after_tool_call": false,
//     "role": "user",
//     "created_at": 1768528561
//   },

export interface ChatDetail {
  user_id: string;
  agent_session_id: string;
  session_id: string;
  session_name: string;
  session_summary: ChatSessionSummary;
  session_state: Record<string, unknown>;
  agent_id: string;
  total_tokens: number;
  agent_data: AgentData;
  metrics: ChatMetrics;
  chat_history: ChatMessage[];
  created_at: string;
  updated_at: string;
}

interface ChatSessionList {
  data: ChatSession[];
  meta: {
    page: number;
    limit: number;
    total_pages: number;
    total_count: number;
    search_time_ms: number;
  };
}

// 创建新对话
export async function createSession(
  type: 'agent' | 'workflow',
  session_name: string,
) {
  return request.post<ChatSession>(`/sessions?type=${type}`, {
    params: { session_name },
  });
}

// 获取对话记录详情
export async function getSession(session_id: string) {
  return request.get<ChatDetail>(`/sessions/${session_id}`, {
    cacheTime: 0,
  });
}

// 删除历史对话
export async function deleteSession(session_id: string) {
  return request.delete(`/sessions/${session_id}`);
}

// 重命名历史对话记录
export async function renameSession(
  session_id: string,
  session_name: string,
  type = 'agent',
) {
  return request.post(`/sessions/${session_id}/rename?type=${type}`, {
    params: {
      session_name,
    },
  });
}
