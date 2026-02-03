/**
 * @fileoverview IP 地理位置服务模块（Infra 层）
 *
 * @module ip-geo/module
 */
import { Module } from '@nestjs/common';
import { RedisModule } from '@app/redis';
import { IpInfoClientModule } from '@app/clients/internal/ip-info';
import { IpGeoService } from './ip-geo.service';

/**
 * IP 地理位置服务模块
 *
 * @description 提供纯 infra 层的 IP 地理位置服务，不依赖 domain 层。
 */
@Module({
  imports: [RedisModule, IpInfoClientModule],
  providers: [IpGeoService],
  exports: [IpGeoService],
})
export class IpGeoModule {}
