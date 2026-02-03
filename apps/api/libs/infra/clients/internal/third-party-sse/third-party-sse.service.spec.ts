import { Test, TestingModule } from '@nestjs/testing';
import { ThirdPartySseClient } from './third-party-sse.client';

describe('ThirdPartySseClient', () => {
  let service: ThirdPartySseClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ThirdPartySseClient],
    }).compile();

    service = module.get<ThirdPartySseClient>(ThirdPartySseClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
