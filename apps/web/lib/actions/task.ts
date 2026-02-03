'use server';

import request from '@/lib/requests';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskStatusResponse,
} from '@repo/types/task';

export async function createTask(task: CreateTaskRequest) {
  return request.post<CreateTaskResponse>('/v1/task/create', {
    params: task,
  });
}

export async function getTaskStatus(taskId: string) {
  return request.get<TaskStatusResponse>(`/v1/task/status/${taskId}`, {
    cacheTime: 0,
  });
}
