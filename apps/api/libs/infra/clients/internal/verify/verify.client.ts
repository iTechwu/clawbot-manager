import { Inject, Injectable, OnModuleDestroy, Request } from '@nestjs/common';
import stringUtil from '@/utils/string.util';
import { RedisService } from '@app/redis';

@Injectable()
export class VerifyClient {
  constructor(private readonly redis: RedisService) {}

  async getMobileCode(mobile: string) {
    return await this.redis.getData('mobileCode', mobile);
  }

  async validateMobileCode(mobile: string, code: string) {
    const mobileCode = await this.getMobileCode(mobile);
    if (mobileCode !== code) return false;
    await this.redis.deleteData('mobileCode', mobile);
    return true;
  }

  async generateMobileCode(mobile: string, expireIn?: number) {
    const code = Math.random().toString().slice(-6);
    await this.redis.saveData('mobileCode', mobile, code, expireIn);
    return code;
  }

  async getEmailCode(email: string) {
    return await this.redis.getData('emailCode', email);
  }

  async validateEmailCode(email: string, code: string): Promise<boolean> {
    const emailCode: string = await this.getEmailCode(email);
    if (emailCode.toUpperCase() !== code.toUpperCase()) return false;
    await this.redis.deleteData('emailCode', email);
    return true;
  }

  async generateEmailCode(email: string, expireIn?: number) {
    const code = stringUtil.stringGen(6).toUpperCase();
    await this.redis.saveData('emailCode', email, code, expireIn);
    return code;
  }
}
