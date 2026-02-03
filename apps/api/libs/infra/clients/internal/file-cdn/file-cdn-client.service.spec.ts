import { Test, TestingModule } from '@nestjs/testing';
import { FileCdnClient } from './file-cdn.client';

describe('FileCdnClient', () => {
  let service: FileCdnClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FileCdnClient],
    }).compile();

    service = module.get<FileCdnClient>(FileCdnClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
