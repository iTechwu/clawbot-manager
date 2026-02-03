/**
 * @fileoverview IP 地理位置服务（Infra 层）
 *
 * 本服务提供纯 infra 层的 IP 地理位置查询功能：
 * - IP 信息查询（via IpInfoClient）
 * - 国家代码查询
 * - 大洲查询（使用静态映射，不依赖数据库）
 *
 * 注意：此服务不依赖 domain 层，可在 infra 层安全使用。
 * 如需完整的 IP 信息服务（含数据库查询），请使用 domain/services/ip-info。
 *
 * @module ip-geo/service
 */
import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { RedisService } from '@app/redis';
import { FastifyRequest } from 'fastify';
import ipUtil from '@/utils/ip.util';
import validateUtil from '@/utils/validate.util';
import { PardxApp } from '@/config/dto/config.dto';
import enviromentUtil from '@/utils/enviroment.util';
import { getContinentByCountry, Continent } from './continent-mapping';
import { IpInfoClient, IpInfoResponse } from '@app/clients/internal/ip-info';

/**
 * IP 地理位置服务（Infra 层）
 *
 * @description 提供 IP 地理位置查询功能，使用静态大洲映射，不依赖数据库。
 *
 * @class IpGeoService
 */
@Injectable()
export class IpGeoService {
  protected ipinfoRedisKey = 'ipinfo';

  constructor(
    private readonly redis: RedisService,
    private readonly ipInfoClient: IpInfoClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * 从请求中提取 IP 地址
   */
  extractIp(req: FastifyRequest): string {
    return ipUtil.extractIp(req);
  }

  /**
   * 获取 IP 信息
   */
  async getIpInfo(ip: string): Promise<Partial<PardxApp.IPInfo>> {
    if (enviromentUtil.getBaseZone() === 'cn') {
      return {
        ip,
        country: 'CN',
        region: 'Beijing',
        city: 'Beijing',
        loc: '1.2897,103.8501',
        timezone: 'Asia/Shanghai',
      };
    }

    if (validateUtil.isBlank(ip) || ip === '127.0.0.1') {
      return {
        ip,
        country: 'SG',
        region: 'Singapore',
        city: 'Singapore',
        loc: '1.2897,103.8501',
        timezone: 'Asia/Singapore',
      };
    }

    const ipinfo = await this.redis.getData(this.ipinfoRedisKey, ip);
    if (ipinfo) return ipinfo;

    try {
      const response: IpInfoResponse = await this.ipInfoClient.getIpInfo(ip);
      let ipInfoData: PardxApp.IPInfo = response;
      this.logger.info('IP info:', { ipInfoData });
      await this.redis.saveData(this.ipinfoRedisKey, ip, ipInfoData);

      if (ipInfoData.country === 'CN') {
        ipInfoData = {
          ip,
          country: 'SG',
          region: 'Singapore',
          city: 'Singapore',
          loc: '1.2897,103.8501',
          timezone: 'Asia/Singapore',
        };
      }
      return ipInfoData;
    } catch (error) {
      this.logger.error('Failed to fetch IP info:', error);
      return {
        ip,
        country: 'SG',
        region: 'Singapore',
        city: 'Singapore',
        loc: '1.2897,103.8501',
        timezone: 'Asia/Singapore',
      };
    }
  }

  /**
   * 获取 IP 对应的国家代码
   */
  async getIpCountry(ip: string): Promise<string> {
    const ipInfo = await this.getIpInfo(ip);
    return ipInfo.country;
  }

  /**
   * 获取 IP 对应的大洲
   *
   * @description 使用静态映射，不依赖数据库
   */
  async getContinent(ip: string): Promise<Continent> {
    const countryCode = await this.getIpCountry(ip);
    const defaultZone = enviromentUtil.getBaseZone() as Continent;
    return getContinentByCountry(countryCode, defaultZone);
  }

  /**
   * 获取 IP 对应的时区
   */
  async getTimeZone(ip: string): Promise<string> {
    const ipInfo = await this.getIpInfo(ip);
    return ipInfo.timezone;
  }
}
