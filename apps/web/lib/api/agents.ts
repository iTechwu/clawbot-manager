import request from '@/lib/requests';
import type { AgentInfo } from '@repo/types/ai';

// 获取智能体列表
export const getAgentList = () => {
  return request.get<AgentInfo[]>('/agents');
};
