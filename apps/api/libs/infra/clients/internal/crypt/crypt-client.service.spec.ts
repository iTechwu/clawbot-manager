import { Test, TestingModule } from '@nestjs/testing';
import { CryptClient } from './crypt.client';

describe('CryptClient', () => {
  let service: CryptClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CryptClient],
    }).compile();

    service = module.get<CryptClient>(CryptClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
