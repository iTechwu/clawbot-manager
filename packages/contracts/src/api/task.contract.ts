import { initContract } from '@ts-rest/core';
import { z } from 'zod';
import { ApiResponseSchema } from '../base';
import {
  TaskCheckResponseSchema,
  TaskListResponseSchema,
  CheckTasksRequestSchema,
  CheckTasksResponseSchema,
} from '../schemas/task.schema';

const c = initContract();

/**
 * Task API Contract
 */
export const taskContract = c.router(
  {
    // GET /tasks/:taskId - Check if task is completed
    checkTask: {
      method: 'GET',
      path: '/:taskId',
      pathParams: z.object({
        taskId: z.string().uuid(),
      }),
      responses: {
        200: ApiResponseSchema(TaskCheckResponseSchema),
      },
      summary: 'Check if task is completed by taskId',
    },

    // GET /tasks/list - Get user task list
    getTaskList: {
      method: 'GET',
      path: '/list',
      responses: {
        200: ApiResponseSchema(TaskListResponseSchema),
      },
      summary: 'Get user task list',
    },

    // POST /tasks/check - Check multiple tasks
    checkTasks: {
      method: 'POST',
      path: '/check',
      body: CheckTasksRequestSchema.optional(),
      responses: {
        200: ApiResponseSchema(CheckTasksResponseSchema),
      },
      summary: 'Check multiple tasks completion status',
    },
  },
  {
    pathPrefix: '/tasks',
  },
);

export type TaskContract = typeof taskContract;

