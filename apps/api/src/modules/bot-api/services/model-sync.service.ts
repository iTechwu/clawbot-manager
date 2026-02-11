import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import {
  ModelAvailabilityService,
  ModelPricingService,
  ProviderKeyService,
} from '@app/db';
import { CapabilityTagMatchingService } from './capability-tag-matching.service';

/**
 * 同步定价结果
 */
export interface SyncPricingResult {
  synced: number;
  skipped: number;
  errors: Array<{ modelId: string; error: string }>;
}

/**
 * 同步标签结果
 */
export interface SyncTagsResult {
  processed: number;
  tagsAssigned: number;
  errors: Array<{ modelId: string; error: string }>;
}

/**
 * 同步状态
 */
export interface ModelSyncStatus {
  totalModels: number;
  pricingSynced: number;
  pricingNotSynced: number;
  tagsSynced: number;
  tagsNotSynced: number;
  lastSyncAt: Date | null;
}

/**
 * ModelSyncService
 *
 * 统一管理模型的定价和能力标签同步
 */
@Injectable()
export class ModelSyncService {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
    private readonly modelAvailabilityService: ModelAvailabilityService,
    private readonly modelPricingService: ModelPricingService,
    private readonly providerKeyService: ProviderKeyService,
    private readonly capabilityTagMatchingService: CapabilityTagMatchingService,
  ) {}

  /**
   * 同步所有模型的定价信息
   * 从 ModelPricing 表查找匹配的定价并关联到 ModelAvailability
   */
  async syncAllPricing(): Promise<SyncPricingResult> {
    const result: SyncPricingResult = {
      synced: 0,
      skipped: 0,
      errors: [],
    };

    // 获取所有 ModelAvailability
    const { list: availabilities } = await this.modelAvailabilityService.list(
      {},
      { limit: 10000 },
    );

    // 获取所有 ProviderKey 用于获取 vendor
    const { list: providerKeys } = await this.providerKeyService.list(
      {},
      { limit: 1000 },
    );
    const providerKeyMap = new Map(providerKeys.map((pk) => [pk.id, pk]));

    // 获取所有 ModelPricing
    const pricingList = await this.modelPricingService.listAll();
    const pricingMap = new Map(
      pricingList.map((p) => [`${p.vendor}:${p.model}`, p]),
    );

    for (const availability of availabilities) {
      try {
        const pk = providerKeyMap.get(availability.providerKeyId);
        if (!pk) {
          result.skipped++;
          continue;
        }

        // 查找匹配的定价
        const pricingKey = `${pk.vendor}:${availability.model}`;
        const pricing = pricingMap.get(pricingKey);

        if (pricing) {
          // 更新 ModelAvailability 关联定价
          await this.modelAvailabilityService.update(
            { id: availability.id },
            {
              modelPricing: { connect: { id: pricing.id } },
              pricingSynced: true,
              pricingSyncedAt: new Date(),
            },
          );
          result.synced++;
        } else {
          // 没有找到定价，标记为未同步
          if (availability.pricingSynced) {
            await this.modelAvailabilityService.update(
              { id: availability.id },
              {
                pricingSynced: false,
                pricingSyncedAt: null,
              },
            );
          }
          result.skipped++;
        }
      } catch (error) {
        result.errors.push({
          modelId: availability.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('[ModelSync] Pricing sync completed', result);
    return result;
  }

  /**
   * 同步单个模型的定价信息
   */
  async syncModelPricing(modelAvailabilityId: string): Promise<boolean> {
    const availability = await this.modelAvailabilityService.get({
      id: modelAvailabilityId,
    });
    if (!availability) {
      throw new Error(`ModelAvailability not found: ${modelAvailabilityId}`);
    }

    const pk = await this.providerKeyService.get({
      id: availability.providerKeyId,
    });
    if (!pk) {
      throw new Error(`ProviderKey not found: ${availability.providerKeyId}`);
    }

    // 查找匹配的定价
    const pricing = await this.modelPricingService.get({
      model: availability.model,
    });

    if (pricing && pricing.vendor === pk.vendor) {
      await this.modelAvailabilityService.update(
        { id: modelAvailabilityId },
        {
          modelPricing: { connect: { id: pricing.id } },
          pricingSynced: true,
          pricingSyncedAt: new Date(),
        },
      );
      return true;
    }

    return false;
  }

  /**
   * 重新分配所有模型的能力标签
   */
  async reassignAllCapabilityTags(): Promise<SyncTagsResult> {
    const result: SyncTagsResult = {
      processed: 0,
      tagsAssigned: 0,
      errors: [],
    };

    // 获取所有 ModelAvailability
    const { list: availabilities } = await this.modelAvailabilityService.list(
      {},
      { limit: 10000 },
    );

    // 获取所有 ProviderKey 用于获取 vendor
    const { list: providerKeys } = await this.providerKeyService.list(
      {},
      { limit: 1000 },
    );
    const providerKeyMap = new Map(providerKeys.map((pk) => [pk.id, pk]));

    for (const availability of availabilities) {
      try {
        const pk = providerKeyMap.get(availability.providerKeyId);
        if (!pk) {
          continue;
        }

        // 分配能力标签
        await this.capabilityTagMatchingService.assignTagsToModelAvailability(
          availability.id,
          availability.model,
          pk.vendor,
        );

        // 更新同步状态
        await this.modelAvailabilityService.update(
          { id: availability.id },
          {
            tagsSynced: true,
            tagsSyncedAt: new Date(),
          },
        );

        result.processed++;
        result.tagsAssigned++; // 简化计数
      } catch (error) {
        result.errors.push({
          modelId: availability.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.logger.info('[ModelSync] Tags sync completed', result);
    return result;
  }

  /**
   * 重新分配单个模型的能力标签
   */
  async reassignModelCapabilityTags(
    modelAvailabilityId: string,
  ): Promise<void> {
    const availability = await this.modelAvailabilityService.get({
      id: modelAvailabilityId,
    });
    if (!availability) {
      throw new Error(`ModelAvailability not found: ${modelAvailabilityId}`);
    }

    const pk = await this.providerKeyService.get({
      id: availability.providerKeyId,
    });
    if (!pk) {
      throw new Error(`ProviderKey not found: ${availability.providerKeyId}`);
    }

    await this.capabilityTagMatchingService.assignTagsToModelAvailability(
      modelAvailabilityId,
      availability.model,
      pk.vendor,
    );

    await this.modelAvailabilityService.update(
      { id: modelAvailabilityId },
      {
        tagsSynced: true,
        tagsSyncedAt: new Date(),
      },
    );
  }

  /**
   * 获取同步状态概览
   */
  async getSyncStatus(): Promise<ModelSyncStatus> {
    // 获取所有 ModelAvailability
    const { list: availabilities } = await this.modelAvailabilityService.list(
      {},
      { limit: 10000 },
    );

    const totalModels = availabilities.length;
    const pricingSynced = availabilities.filter((a) => a.pricingSynced).length;
    const tagsSynced = availabilities.filter((a) => a.tagsSynced).length;

    // 获取最后同步时间
    let lastSyncAt: Date | null = null;
    for (const a of availabilities) {
      if (
        a.pricingSyncedAt &&
        (!lastSyncAt || a.pricingSyncedAt > lastSyncAt)
      ) {
        lastSyncAt = a.pricingSyncedAt;
      }
      if (a.tagsSyncedAt && (!lastSyncAt || a.tagsSyncedAt > lastSyncAt)) {
        lastSyncAt = a.tagsSyncedAt;
      }
    }

    return {
      totalModels,
      pricingSynced,
      pricingNotSynced: totalModels - pricingSynced,
      tagsSynced,
      tagsNotSynced: totalModels - tagsSynced,
      lastSyncAt,
    };
  }
}
