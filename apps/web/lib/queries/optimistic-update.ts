/**
 * 乐观更新工具
 *
 * 提供 React Query 乐观更新的工具函数和示例
 */

import type { QueryClient } from '@tanstack/react-query';

/**
 * 乐观更新配置
 */
interface OptimisticUpdateConfig<TData, TVariables> {
  /** Query Key */
  queryKey: readonly unknown[];
  /** 乐观更新函数 - 返回更新后的数据 */
  updater: (oldData: TData | undefined, variables: TVariables) => TData;
  /** 回滚函数（可选） */
  onRollback?: (context: { previousData: TData | undefined }) => void;
}

/**
 * 创建乐观更新的 mutation 配置
 *
 * @example
 * ```tsx
 * const updateTodo = useMutation({
 *   mutationFn: api.todo.update,
 *   ...createOptimisticUpdate(queryClient, {
 *     queryKey: ['todos'],
 *     updater: (oldData, variables) => {
 *       return oldData?.map(todo =>
 *         todo.id === variables.id ? { ...todo, ...variables } : todo
 *       );
 *     },
 *   }),
 * });
 * ```
 */
export function createOptimisticUpdate<TData, TVariables, TError = unknown>(
  queryClient: QueryClient,
  config: OptimisticUpdateConfig<TData, TVariables>,
) {
  return {
    onMutate: async (variables: TVariables) => {
      // 取消正在进行的查询
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // 保存之前的数据
      const previousData = queryClient.getQueryData<TData>(config.queryKey);

      // 乐观更新
      queryClient.setQueryData<TData>(config.queryKey, (oldData) =>
        config.updater(oldData, variables),
      );

      // 返回上下文用于回滚
      return { previousData };
    },

    onError: (
      _error: TError,
      _variables: TVariables,
      context: { previousData: TData | undefined } | undefined,
    ) => {
      // 回滚到之前的数据
      if (context?.previousData !== undefined) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
      config.onRollback?.(context || { previousData: undefined });
    },

    onSettled: () => {
      // 重新获取数据以确保同步
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  };
}

/**
 * 列表项乐观更新 - 更新单个项
 */
export function createListItemOptimisticUpdate<
  TItem extends { id: string | number },
  TVariables extends { id: string | number },
>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  options?: {
    onRollback?: () => void;
  },
) {
  return createOptimisticUpdate<TItem[], TVariables>(queryClient, {
    queryKey,
    updater: (oldData, variables) => {
      if (!oldData) return [];
      return oldData.map((item) =>
        item.id === variables.id ? { ...item, ...variables } : item,
      );
    },
    onRollback: options?.onRollback,
  });
}

/**
 * 列表项乐观删除
 */
export function createListItemOptimisticDelete<
  TItem extends { id: string | number },
>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  options?: {
    onRollback?: () => void;
  },
) {
  return createOptimisticUpdate<TItem[], { id: string | number }>(queryClient, {
    queryKey,
    updater: (oldData, variables) => {
      if (!oldData) return [];
      return oldData.filter((item) => item.id !== variables.id);
    },
    onRollback: options?.onRollback,
  });
}

/**
 * 列表项乐观添加
 */
export function createListItemOptimisticAdd<TItem>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  options?: {
    prepend?: boolean;
    onRollback?: () => void;
  },
) {
  return createOptimisticUpdate<TItem[], TItem>(queryClient, {
    queryKey,
    updater: (oldData, newItem) => {
      if (!oldData) return [newItem];
      return options?.prepend
        ? [newItem, ...oldData]
        : [...oldData, newItem];
    },
    onRollback: options?.onRollback,
  });
}

/**
 * 使用示例
 *
 * @example
 * ```tsx
 * // 在组件中使用乐观更新
 * function TodoList() {
 *   const queryClient = useQueryClient();
 *
 *   // 更新 Todo
 *   const updateTodo = useMutation({
 *     mutationFn: (data: { id: string; completed: boolean }) =>
 *       api.todo.update(data),
 *     ...createListItemOptimisticUpdate<Todo, { id: string; completed: boolean }>(
 *       queryClient,
 *       ['todos'],
 *     ),
 *   });
 *
 *   // 删除 Todo
 *   const deleteTodo = useMutation({
 *     mutationFn: (id: string) => api.todo.delete(id),
 *     ...createListItemOptimisticDelete<Todo>(queryClient, ['todos']),
 *   });
 *
 *   // 添加 Todo
 *   const addTodo = useMutation({
 *     mutationFn: (data: Omit<Todo, 'id'>) => api.todo.create(data),
 *     ...createListItemOptimisticAdd<Todo>(queryClient, ['todos'], {
 *       prepend: true,
 *     }),
 *   });
 *
 *   return (
 *     <ul>
 *       {todos.map(todo => (
 *         <li key={todo.id}>
 *           <input
 *             type="checkbox"
 *             checked={todo.completed}
 *             onChange={() => updateTodo.mutate({
 *               id: todo.id,
 *               completed: !todo.completed,
 *             })}
 *           />
 *           {todo.title}
 *           <button onClick={() => deleteTodo.mutate({ id: todo.id })}>
 *             删除
 *           </button>
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 * ```
 */
