export type CreateTaskRequest = {
  task_name: string;
  args?: unknown[];
  kwargs?: Record<string, unknown>;
  queue?: string;
  priority?: number | null;
  countdown?: number | null;
  eta?: string | null;
};

export type CreateTaskResponse = {
  task_id: string;
  task_name: string;
  status: string;
  message: string;
  detail?: string | null;
};

export type TaskStatusResponse = {
  task_id: string;
  status: string;
  result?: unknown | null;
  traceback?: string | null;
  name?: string | null;
  args?: unknown[] | null;
  kwargs?: Record<string, unknown> | null;
};
