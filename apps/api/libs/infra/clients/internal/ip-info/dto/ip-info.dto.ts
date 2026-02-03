/**
 * IP Info API Response DTO
 *
 * @description ipinfo.io API 返回的数据结构
 */
export interface IpInfoResponse {
  ip: string;
  country: string;
  region?: string;
  city?: string;
  loc?: string;
  org?: string;
  postal?: string;
  timezone?: string;
}
