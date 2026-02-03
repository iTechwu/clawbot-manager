import { Test, TestingModule } from '@nestjs/testing';
import { SseClient } from './sse.client';

describe('SseClient', () => {
  let service: SseClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SseClient],
    }).compile();

    service = module.get<SseClient>(SseClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
