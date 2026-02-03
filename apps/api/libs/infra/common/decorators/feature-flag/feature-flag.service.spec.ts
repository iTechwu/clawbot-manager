/**
 * FeatureFlagService Unit Tests
 *
 * Tests for the feature flag service.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';

// Mock the RedisService before importing the service
jest.mock('@app/redis', () => ({
  RedisService: jest.fn(),
}));

import { FeatureFlagService, FeatureFlagConfig } from './feature-flag.service';

// ============================================================================
// Mocks
// ============================================================================

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

const mockRedisService = {
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    ttl: jest.fn(),
    scan: jest.fn(),
  },
};

function createMockConfigService(config: Partial<FeatureFlagConfig> = {}) {
  return {
    get: jest.fn((key: string) => {
      if (key === 'featureFlags') {
        return {
          provider: 'memory',
          defaultFlags: {},
          ...config,
        };
      }
      return undefined;
    }),
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let module: TestingModule;

  describe('Memory Provider', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          {
            provide: ConfigService,
            useValue: createMockConfigService({
              provider: 'memory',
              defaultFlags: {
                'test-feature': true,
                'disabled-feature': false,
              },
            }),
          },
          {
            provide: WINSTON_MODULE_PROVIDER,
            useValue: mockLogger,
          },
          {
            provide: 'RedisService',
            useValue: null,
          },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load default flags on init', async () => {
      const isEnabled = await service.isEnabled('test-feature');
      expect(isEnabled).toBe(true);
    });

    it('should return false for disabled flags', async () => {
      const isEnabled = await service.isEnabled('disabled-feature');
      expect(isEnabled).toBe(false);
    });

    it('should return false for unknown flags', async () => {
      const isEnabled = await service.isEnabled('unknown-feature');
      expect(isEnabled).toBe(false);
    });

    it('should set a flag', async () => {
      await service.setFlag('new-feature', true);
      const isEnabled = await service.isEnabled('new-feature');
      expect(isEnabled).toBe(true);
    });

    it('should delete a flag', async () => {
      await service.setFlag('temp-feature', true);
      expect(await service.isEnabled('temp-feature')).toBe(true);

      await service.deleteFlag('temp-feature');
      expect(await service.isEnabled('temp-feature')).toBe(false);
    });

    it('should get all flags', async () => {
      const flags = await service.getAllFlags();
      expect(flags).toHaveProperty('test-feature', true);
      expect(flags).toHaveProperty('disabled-feature', false);
    });
  });

  describe('Redis Provider', () => {
    beforeEach(async () => {
      // Reset mocks
      jest.clearAllMocks();
      mockRedisService.redis.get.mockResolvedValue(null);
      mockRedisService.redis.set.mockResolvedValue('OK');
      mockRedisService.redis.setex.mockResolvedValue('OK');

      // Import the actual RedisService class for proper DI
      const { RedisService } = await import('@app/redis');

      module = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          {
            provide: ConfigService,
            useValue: createMockConfigService({
              provider: 'redis',
              redis: {
                keyPrefix: 'test:feature:',
                defaultTTL: 0,
              },
              defaultFlags: {
                'redis-feature': true,
              },
            }),
          },
          {
            provide: WINSTON_MODULE_PROVIDER,
            useValue: mockLogger,
          },
          {
            provide: RedisService,
            useValue: mockRedisService,
          },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should use Redis for setting flags', async () => {
      await service.setFlag('new-feature', true);
      expect(mockRedisService.redis.set).toHaveBeenCalledWith(
        'test:feature:new-feature',
        '1',
      );
    });

    it('should use Redis setex when TTL is provided', async () => {
      await service.setFlag('temp-feature', true, 3600);
      expect(mockRedisService.redis.setex).toHaveBeenCalledWith(
        'test:feature:temp-feature',
        3600,
        '1',
      );
    });

    it('should check Redis for flag status', async () => {
      mockRedisService.redis.get.mockResolvedValueOnce('1');

      const isEnabled = await service.isEnabled('some-feature');
      expect(isEnabled).toBe(true);
      expect(mockRedisService.redis.get).toHaveBeenCalledWith(
        'test:feature:some-feature',
      );
    });

    it('should return false when Redis returns null', async () => {
      mockRedisService.redis.get.mockResolvedValueOnce(null);

      const isEnabled = await service.isEnabled('nonexistent');
      expect(isEnabled).toBe(false);
    });

    it('should delete flag from Redis', async () => {
      mockRedisService.redis.del.mockResolvedValueOnce(1);

      await service.deleteFlag('some-feature');
      expect(mockRedisService.redis.del).toHaveBeenCalledWith(
        'test:feature:some-feature',
      );
    });

    it('should get TTL for a flag', async () => {
      mockRedisService.redis.ttl.mockResolvedValueOnce(3600);

      const ttl = await service.getFlagTTL('some-feature');
      expect(ttl).toBe(3600);
    });
  });

  describe('Evaluation Strategies', () => {
    beforeEach(async () => {
      module = await Test.createTestingModule({
        providers: [
          FeatureFlagService,
          {
            provide: ConfigService,
            useValue: createMockConfigService({
              provider: 'memory',
              defaultFlags: {
                'percentage-feature': true,
                'env-feature': true,
              },
            }),
          },
          {
            provide: WINSTON_MODULE_PROVIDER,
            useValue: mockLogger,
          },
          {
            provide: 'RedisService',
            useValue: null,
          },
        ],
      }).compile();

      service = module.get<FeatureFlagService>(FeatureFlagService);
      await service.onModuleInit();
    });

    afterEach(async () => {
      await module.close();
    });

    it('should evaluate percentage strategy', async () => {
      // With 100% rollout, should always return true
      const result = await service.evaluate(
        {
          flagName: 'percentage-feature',
          strategy: 'percentage',
          percentage: 100,
        },
        { userId: 'user-123' },
      );
      expect(result).toBe(true);
    });

    it('should return false for 0% rollout', async () => {
      const result = await service.evaluate(
        {
          flagName: 'percentage-feature',
          strategy: 'percentage',
          percentage: 0,
        },
        { userId: 'user-123' },
      );
      expect(result).toBe(false);
    });

    it('should evaluate environment strategy', async () => {
      const result = await service.evaluate(
        {
          flagName: 'env-feature',
          strategy: 'environment',
          environments: ['test', 'dev'],
        },
        { environment: 'test' },
      );
      expect(result).toBe(true);
    });

    it('should return false for wrong environment', async () => {
      const result = await service.evaluate(
        {
          flagName: 'env-feature',
          strategy: 'environment',
          environments: ['production'],
        },
        { environment: 'dev' },
      );
      expect(result).toBe(false);
    });

    it('should return false if base flag is disabled', async () => {
      await service.setFlag('disabled-base', false);

      const result = await service.evaluate(
        {
          flagName: 'disabled-base',
          strategy: 'percentage',
          percentage: 100,
        },
        { userId: 'user-123' },
      );
      expect(result).toBe(false);
    });
  });
});
