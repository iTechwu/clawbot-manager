/**
 * @fileoverview IP 地理位置服务导出入口（Infra 层）
 *
 * 本模块提供纯 infra 层的 IP 地理位置服务：
 * - IpGeoService: IP 地理位置查询服务
 * - IpGeoModule: NestJS 模块
 * - getContinentByCountry: 静态大洲映射函数
 *
 * @example
 * ```typescript
 * import { IpGeoModule, IpGeoService } from '@app/shared-services/ip-geo';
 *
 * @Module({
 *   imports: [IpGeoModule],
 * })
 * export class MyModule {}
 *
 * @Injectable()
 * class MyService {
 *   constructor(private readonly ipGeo: IpGeoService) {}
 *
 *   async getRegion(ip: string) {
 *     return await this.ipGeo.getContinent(ip);
 *   }
 * }
 * ```
 *
 * @module ip-geo
 */
export { IpGeoModule } from './ip-geo.module';
export { IpGeoService } from './ip-geo.service';
export {
  getContinentByCountry,
  Continent,
  CONTINENT_COUNTRIES,
  COUNTRY_TO_CONTINENT,
} from './continent-mapping';
