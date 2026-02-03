import { type ApiContract } from '@repo/constants';

/**
 * Contract Adapter 基础接口
 * 用于在不同 Contract 版本间转换数据格式
 *
 * @template TInternal 内部模型类型 (始终是最新结构)
 * @template TExternal 外部模型类型 (特定 Contract 版本的结构)
 *
 * @example
 * ```typescript
 * // 定义 User Adapter
 * class User2024_12Adapter implements ContractAdapter<InternalUser, ExternalUser2024_12> {
 *   toResponse(user: InternalUser): ExternalUser2024_12 {
 *     return {
 *       id: user.id,
 *       name: user.name,  // 旧版只有 name
 *     };
 *   }
 *
 *   fromRequest(external: ExternalUser2024_12): Partial<InternalUser> {
 *     return {
 *       name: external.name,
 *     };
 *   }
 * }
 * ```
 */
export interface ContractAdapter<TInternal, TExternal> {
  /**
   * 将内部模型转换为外部响应格式
   * @param internal 内部模型 (最新结构)
   * @returns 外部模型 (特定 Contract 版本)
   */
  toResponse(internal: TInternal): TExternal;

  /**
   * 将外部请求转换为内部模型格式 (可选)
   * @param external 外部模型 (特定 Contract 版本)
   * @returns 内部模型 (部分字段)
   */
  fromRequest?(external: TExternal): Partial<TInternal>;
}

/**
 * Adapter 工厂基础接口
 * 用于根据 Contract 版本获取对应的 Adapter
 *
 * @template TInternal 内部模型类型
 * @template TExternal 外部模型类型的联合类型
 *
 * @example
 * ```typescript
 * @Injectable()
 * class UserAdapterFactory implements AdapterFactory<InternalUser, ExternalUser> {
 *   private adapters = new Map<ApiContract, ContractAdapter<InternalUser, ExternalUser>>();
 *
 *   constructor() {
 *     this.adapters.set('2024-12', new User2024_12Adapter());
 *     this.adapters.set('2025-01', new User2025_01Adapter());
 *   }
 *
 *   getAdapter(contract: ApiContract) {
 *     return this.adapters.get(contract);
 *   }
 * }
 * ```
 */
export interface AdapterFactory<TInternal, TExternal> {
  /**
   * 获取指定 Contract 版本的 Adapter
   * @param contract Contract 版本
   * @returns 对应的 Adapter，不存在则返回 undefined
   */
  getAdapter(
    contract: ApiContract,
  ): ContractAdapter<TInternal, TExternal> | undefined;
}

/**
 * 默认 Adapter (透传)
 * 用于当前版本的 Contract，不需要任何转换
 *
 * @template T 模型类型
 */
export class PassthroughAdapter<T> implements ContractAdapter<T, T> {
  toResponse(internal: T): T {
    return internal;
  }

  fromRequest(external: T): T {
    return external;
  }
}
