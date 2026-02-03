/**
 * Cache Decorators Module Exports
 */

export {
  // Decorators
  Cacheable,
  CacheEvict,
  CachePut,
  // Types
  CacheOptions,
  CacheEvictOptions,
  HierarchicalKeyConfig,
  // Key Generators - Basic
  defaultKeyGenerator,
  objectKeyGenerator,
  compositeKeyGenerator,
  // Key Generators - Hierarchical (支持分层缓存)
  hierarchicalKeyGenerator,
  simpleHierarchicalKeyGenerator,
  userKeyGenerator,
  spaceKeyGenerator,
  // Hash Utilities
  hashObject,
  hashParams,
  // Metadata Keys
  CACHE_METADATA_KEY,
  CACHE_EVICT_METADATA_KEY,
  CACHE_PUT_METADATA_KEY,
} from './cache.decorator';

export { CacheInterceptor } from './cache.interceptor';
export { CacheDecoratorModule } from './cache.module';
