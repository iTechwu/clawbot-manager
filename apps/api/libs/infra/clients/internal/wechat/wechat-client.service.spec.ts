import { Test, TestingModule } from '@nestjs/testing';
import { WechatClient } from './wechat.client';

describe('WechatClient', () => {
  let service: WechatClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WechatClient],
    }).compile();

    service = module.get<WechatClient>(WechatClient);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
