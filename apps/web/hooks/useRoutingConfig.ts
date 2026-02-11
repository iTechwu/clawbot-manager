'use client';

import { useCallback, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  routingAdminApi,
  routingAdminClient,
  modelApi,
} from '@/lib/api/contracts/client';
import type {
  FallbackChain,
  CostStrategy,
  ComplexityRoutingConfig,
  ModelAvailabilityItem,
} from '@repo/contracts';

/**
 * Query keys for routing config related queries
 */
export const routingConfigKeys = {
  all: ['routing-config'] as const,
  fallbackChains: () => [...routingConfigKeys.all, 'fallback-chains'] as const,
  costStrategies: () => [...routingConfigKeys.all, 'cost-strategies'] as const,
  complexityConfigs: () =>
    [...routingConfigKeys.all, 'complexity-configs'] as const,
  capabilityTags: () => [...routingConfigKeys.all, 'capability-tags'] as const,
  modelPricing: () => [...routingConfigKeys.all, 'model-pricing'] as const,
};

/**
 * Hook for fetching FallbackChain list
 */
export function useFallbackChains() {
  const queryClient = useQueryClient();
  const chainsQuery = routingAdminApi.getFallbackChains.useQuery(
    routingConfigKeys.fallbackChains(),
    {},
  );

  const responseBody = chainsQuery.data?.body;
  const chains: FallbackChain[] =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { list: FallbackChain[] }).list ?? [])
      : [];

  return {
    chains,
    loading: chainsQuery.isLoading,
    error:
      chainsQuery.error instanceof Error ? chainsQuery.error.message : null,
    refresh: () => {
      chainsQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.fallbackChains(),
      });
    },
  };
}

/**
 * Hook for fetching CostStrategy list
 */
export function useCostStrategies() {
  const queryClient = useQueryClient();
  const strategiesQuery = routingAdminApi.getCostStrategies.useQuery(
    routingConfigKeys.costStrategies(),
    {},
  );

  const responseBody = strategiesQuery.data?.body;
  const strategies: CostStrategy[] =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { list: CostStrategy[] }).list ?? [])
      : [];

  return {
    strategies,
    loading: strategiesQuery.isLoading,
    error:
      strategiesQuery.error instanceof Error
        ? strategiesQuery.error.message
        : null,
    refresh: () => {
      strategiesQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.costStrategies(),
      });
    },
  };
}

/**
 * Hook for fetching ComplexityRoutingConfig list
 */
export function useComplexityRoutingConfigs() {
  const queryClient = useQueryClient();
  const configsQuery = routingAdminApi.getComplexityRoutingConfigs.useQuery(
    routingConfigKeys.complexityConfigs(),
    {},
  );

  const responseBody = configsQuery.data?.body;
  const configs: ComplexityRoutingConfig[] =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { list: ComplexityRoutingConfig[] }).list ?? [])
      : [];

  return {
    configs,
    loading: configsQuery.isLoading,
    error:
      configsQuery.error instanceof Error
        ? configsQuery.error.message
        : null,
    refresh: () => {
      configsQuery.refetch();
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.complexityConfigs(),
      });
    },
  };
}

/**
 * Enhanced model info with availability, pricing, and capability tags
 */
export interface EnhancedModelInfo {
  providerKeyId: string;
  model: string;
  vendor: string;
  isAvailable: boolean;
  lastVerifiedAt: Date | null;
  pricing: {
    inputPrice: number;
    outputPrice: number;
  } | null;
  capabilityTags: Array<{
    id: string;
    name: string;
    tagType?: string;
  }>;
  scores: {
    reasoning: number;
    coding: number;
    creativity: number;
    speed: number;
  } | null;
}

/**
 * Hook for fetching enhanced model information
 * Combines ModelAvailability with pricing and capability tags
 */
export function useEnhancedModels(providerKeyIds?: string[]) {
  const availabilityQuery = modelApi.getAvailability.useQuery(
    ['models', 'availability', 'enhanced', providerKeyIds?.join(',')],
    {
      query: providerKeyIds?.length
        ? { providerKeyId: providerKeyIds[0] }
        : undefined,
    },
  );

  const responseBody = availabilityQuery.data?.body;
  const availability: ModelAvailabilityItem[] =
    responseBody && 'data' in responseBody && responseBody.data
      ? ((responseBody.data as { list: ModelAvailabilityItem[] }).list ?? [])
      : [];

  // Transform ModelAvailabilityItem to EnhancedModelInfo
  const enhancedModels: EnhancedModelInfo[] = useMemo(() => {
    return availability
      .filter((item) => {
        // Filter by providerKeyIds if provided
        if (providerKeyIds && providerKeyIds.length > 0) {
          return providerKeyIds.includes(item.providerKeyId);
        }
        return true;
      })
      .map((item) => ({
        providerKeyId: item.providerKeyId,
        model: item.model,
        vendor: item.providerKeys?.[0]?.vendor ?? '',
        isAvailable: item.isAvailable,
        lastVerifiedAt: item.lastVerifiedAt
          ? new Date(item.lastVerifiedAt)
          : null,
        pricing: null, // Will be populated from ModelPricing if available
        capabilityTags: item.capabilityTags ?? [],
        scores: null, // Will be populated from ModelPricing if available
      }));
  }, [availability, providerKeyIds]);

  return {
    models: enhancedModels,
    loading: availabilityQuery.isLoading,
    error:
      availabilityQuery.error instanceof Error
        ? availabilityQuery.error.message
        : null,
    refresh: () => availabilityQuery.refetch(),
  };
}

/**
 * Hook for FallbackChain CRUD operations
 */
export function useFallbackChainMutations() {
  const queryClient = useQueryClient();

  const createChain = useCallback(
    async (input: Parameters<typeof routingAdminClient.createFallbackChain>[0]['body']) => {
      const result = await routingAdminClient.createFallbackChain({
        body: input,
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.fallbackChains(),
      });
      return result;
    },
    [queryClient],
  );

  const updateChain = useCallback(
    async (
      id: string,
      input: Parameters<typeof routingAdminClient.updateFallbackChain>[0]['body'],
    ) => {
      const result = await routingAdminClient.updateFallbackChain({
        params: { id },
        body: input,
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.fallbackChains(),
      });
      return result;
    },
    [queryClient],
  );

  const deleteChain = useCallback(
    async (id: string) => {
      const result = await routingAdminClient.deleteFallbackChain({
        params: { id },
        body: {},
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.fallbackChains(),
      });
      return result;
    },
    [queryClient],
  );

  return {
    createChain,
    updateChain,
    deleteChain,
  };
}

/**
 * Hook for CostStrategy CRUD operations
 */
export function useCostStrategyMutations() {
  const queryClient = useQueryClient();

  const createStrategy = useCallback(
    async (input: Parameters<typeof routingAdminClient.createCostStrategy>[0]['body']) => {
      const result = await routingAdminClient.createCostStrategy({
        body: input,
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.costStrategies(),
      });
      return result;
    },
    [queryClient],
  );

  const updateStrategy = useCallback(
    async (
      id: string,
      input: Parameters<typeof routingAdminClient.updateCostStrategy>[0]['body'],
    ) => {
      const result = await routingAdminClient.updateCostStrategy({
        params: { id },
        body: input,
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.costStrategies(),
      });
      return result;
    },
    [queryClient],
  );

  const deleteStrategy = useCallback(
    async (id: string) => {
      const result = await routingAdminClient.deleteCostStrategy({
        params: { id },
        body: {},
      });
      queryClient.invalidateQueries({
        queryKey: routingConfigKeys.costStrategies(),
      });
      return result;
    },
    [queryClient],
  );

  return {
    createStrategy,
    updateStrategy,
    deleteStrategy,
  };
}
