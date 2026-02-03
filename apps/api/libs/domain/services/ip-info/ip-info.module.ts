/**
 * IP Info Service Module
 *
 * 职责：提供 IP 信息查询服务
 *
 * 注意：此模块依赖 CountryCodeModule (domain 层)，因此放置在 domain/services 下
 */
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { IpInfoService } from './ip-info.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '@app/redis';
import { CountryCodeModule } from '@app/db';

@Module({
  imports: [ConfigModule, HttpModule, RedisModule, CountryCodeModule],
  providers: [IpInfoService],
  exports: [IpInfoService],
})
export class IpInfoServiceModule {}
