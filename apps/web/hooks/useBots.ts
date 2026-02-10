'use client';

import { useQueryClient } from '@tanstack/react-query';
import { botApi } from '@/lib/api/contracts/client';
import type {
  CreateBotInput,
  SimpleCreateBotInput,
  UpdateBotInput,
  Bot,
} from '@repo/contracts';

/**
 * Query keys for bot-related queries
 */
export const botKeys = {
  all: ['bots'] as const,
  list: () => [...botKeys.all, 'list'] as const,
  detail: (hostname: string) => [...botKeys.all, 'detail', hostname] as const,
  stats: () => [...botKeys.all, 'stats'] as const,
  orphans: () => [...botKeys.all, 'orphans'] as const,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueryOptions = any;

/**
 * Hook for managing bots
 * Provides CRUD operations and lifecycle management for bots
 */
export function useBots() {
  const queryClient = useQueryClient();

  // Query for listing all bots with polling
  // ts-rest v4 API: useQuery(queryKey, args, options)
  const botsQuery = botApi.list.useQuery(botKeys.list(), {}, {
    refetchInterval: 5000,
  } as AnyQueryOptions);

  // Mutation for creating a bot
  const createMutation = botApi.create.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for simple bot creation (draft mode)
  const createSimpleMutation = botApi.createSimple.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for starting a bot
  const startMutation = botApi.start.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for stopping a bot
  const stopMutation = botApi.stop.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for deleting a bot
  const deleteMutation = botApi.delete.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for updating a bot
  const updateMutation = botApi.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for applying pending config
  const applyPendingConfigMutation = botApi.applyPendingConfig.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Mutation for clearing pending config
  const clearPendingConfigMutation = botApi.clearPendingConfig.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  // Extract bots from response - handle both success and error cases
  const responseBody = botsQuery.data?.body;
  const bots: Bot[] =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { bots: Bot[] }).bots ?? [])
      : [];

  return {
    // Data
    bots,
    loading: botsQuery.isLoading,
    error: botsQuery.error instanceof Error ? botsQuery.error.message : null,

    // Actions
    refresh: () => botsQuery.refetch(),
    handleCreate: async (input: CreateBotInput) => {
      const result = await createMutation.mutateAsync({ body: input });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    handleCreateSimple: async (input: SimpleCreateBotInput) => {
      const result = await createSimpleMutation.mutateAsync({ body: input });
      if (result.body && 'data' in result.body) {
        return result.body.data as Bot;
      }
      return undefined;
    },
    handleStart: async (hostname: string) => {
      const result = await startMutation.mutateAsync({
        params: { hostname },
        body: {},
      });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    handleStop: async (hostname: string) => {
      const result = await stopMutation.mutateAsync({
        params: { hostname },
        body: {},
      });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    handleDelete: async (hostname: string) => {
      const result = await deleteMutation.mutateAsync({
        params: { hostname },
        body: {},
      });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    handleUpdate: async (hostname: string, input: UpdateBotInput) => {
      const result = await updateMutation.mutateAsync({
        params: { hostname },
        body: input,
      });
      if (result.body && 'data' in result.body) {
        return result.body.data as Bot;
      }
      return undefined;
    },
    handleApplyPendingConfig: async (hostname: string) => {
      const result = await applyPendingConfigMutation.mutateAsync({
        params: { hostname },
        body: {},
      });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    handleClearPendingConfig: async (hostname: string) => {
      const result = await clearPendingConfigMutation.mutateAsync({
        params: { hostname },
        body: {},
      });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },

    // Loading states
    actionLoading:
      createMutation.isPending ||
      createSimpleMutation.isPending ||
      startMutation.isPending ||
      stopMutation.isPending ||
      deleteMutation.isPending ||
      updateMutation.isPending ||
      applyPendingConfigMutation.isPending ||
      clearPendingConfigMutation.isPending,
    createLoading: createMutation.isPending,
    createSimpleLoading: createSimpleMutation.isPending,
    startLoading: startMutation.isPending,
    stopLoading: stopMutation.isPending,
    deleteLoading: deleteMutation.isPending,
    updateLoading: updateMutation.isPending,
    applyPendingConfigLoading: applyPendingConfigMutation.isPending,
    clearPendingConfigLoading: clearPendingConfigMutation.isPending,
  };
}

/**
 * Hook for getting a single bot by hostname
 */
export function useBot(hostname: string) {
  // ts-rest v4 API: useQuery(queryKey, args, options)
  const botsQuery = botApi.getByHostname.useQuery(
    botKeys.detail(hostname),
    { params: { hostname } },
    { enabled: !!hostname } as AnyQueryOptions,
  );

  const responseBody = botsQuery.data?.body;
  const bot: Bot | undefined =
    responseBody && 'data' in responseBody
      ? (responseBody.data as Bot)
      : undefined;

  return {
    bot,
    loading: botsQuery.isLoading,
    error: botsQuery.error instanceof Error ? botsQuery.error.message : null,
    refresh: () => botsQuery.refetch(),
  };
}

/**
 * Hook for container stats
 */
export function useContainerStats() {
  // ts-rest v4 API: useQuery(queryKey, args, options)
  const statsQuery = botApi.getStats.useQuery(botKeys.stats(), {}, {
    refetchInterval: 30000,
  } as AnyQueryOptions);

  const responseBody = statsQuery.data?.body;
  const stats =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { stats: unknown[] }).stats ?? [])
      : [];

  return {
    stats,
    loading: statsQuery.isLoading,
    error: statsQuery.error instanceof Error ? statsQuery.error.message : null,
    refresh: () => statsQuery.refetch(),
  };
}

/**
 * Hook for orphan detection and cleanup
 */
export function useOrphans() {
  const queryClient = useQueryClient();

  // ts-rest v4 API: useQuery(queryKey, args)
  const orphansQuery = botApi.getOrphans.useQuery(botKeys.orphans(), {});

  const cleanupMutation = botApi.cleanup.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: botKeys.orphans() });
      queryClient.invalidateQueries({ queryKey: botKeys.all });
    },
  });

  const responseBody = orphansQuery.data?.body;
  const orphans =
    responseBody && 'data' in responseBody ? responseBody.data : undefined;

  return {
    orphans,
    loading: orphansQuery.isLoading,
    error:
      orphansQuery.error instanceof Error ? orphansQuery.error.message : null,
    refresh: () => orphansQuery.refetch(),
    handleCleanup: async () => {
      const result = await cleanupMutation.mutateAsync({ body: {} });
      if (result.body && 'data' in result.body) {
        return result.body.data;
      }
      return undefined;
    },
    cleanupLoading: cleanupMutation.isPending,
  };
}
