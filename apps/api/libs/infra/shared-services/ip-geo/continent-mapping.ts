/**
 * @fileoverview 国家代码到大洲的静态映射
 *
 * 本文件提供纯静态的国家代码到大洲映射，不依赖数据库。
 * 用于 infra 层的 IP 地理位置服务，避免 infra 依赖 domain。
 *
 * @module ip-geo/continent-mapping
 */

/**
 * 大洲类型
 */
export type Continent = 'as' | 'eu' | 'na' | 'sa' | 'af' | 'oc' | 'an';

/**
 * 大洲到国家代码的映射
 *
 * 数据来源：ISO 3166-1 alpha-2 国家代码
 */
export const CONTINENT_COUNTRIES: Record<Continent, string[]> = {
  // 亚洲 (Asia)
  as: [
    'AF', 'AM', 'AZ', 'BH', 'BD', 'BT', 'BN', 'KH', 'CN', 'CY', 'GE', 'HK',
    'IN', 'ID', 'IR', 'IQ', 'IL', 'JP', 'JO', 'KZ', 'KW', 'KG', 'LA', 'LB',
    'MO', 'MY', 'MV', 'MN', 'MM', 'NP', 'KP', 'OM', 'PK', 'PS', 'PH', 'QA',
    'SA', 'SG', 'KR', 'LK', 'SY', 'TW', 'TJ', 'TH', 'TL', 'TR', 'TM', 'AE',
    'UZ', 'VN', 'YE',
  ],
  // 欧洲 (Europe)
  eu: [
    'AL', 'AD', 'AT', 'BY', 'BE', 'BA', 'BG', 'HR', 'CZ', 'DK', 'EE', 'FI',
    'FR', 'DE', 'GR', 'HU', 'IS', 'IE', 'IT', 'XK', 'LV', 'LI', 'LT', 'LU',
    'MT', 'MD', 'MC', 'ME', 'NL', 'MK', 'NO', 'PL', 'PT', 'RO', 'RU', 'SM',
    'RS', 'SK', 'SI', 'ES', 'SE', 'CH', 'UA', 'GB', 'VA',
  ],
  // 北美洲 (North America)
  na: [
    'AG', 'BS', 'BB', 'BZ', 'CA', 'CR', 'CU', 'DM', 'DO', 'SV', 'GD', 'GT',
    'HT', 'HN', 'JM', 'MX', 'NI', 'PA', 'KN', 'LC', 'VC', 'TT', 'US',
  ],
  // 南美洲 (South America)
  sa: [
    'AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'GY', 'PY', 'PE', 'SR', 'UY', 'VE',
  ],
  // 非洲 (Africa)
  af: [
    'DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CV', 'CM', 'CF', 'TD', 'KM', 'CG',
    'CD', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW',
    'CI', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ',
    'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD',
    'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW',
  ],
  // 大洋洲 (Oceania)
  oc: [
    'AU', 'FJ', 'KI', 'MH', 'FM', 'NR', 'NZ', 'PW', 'PG', 'WS', 'SB', 'TO',
    'TV', 'VU',
  ],
  // 南极洲 (Antarctica) - 通常无常住人口
  an: ['AQ'],
};

/**
 * 国家代码到大洲的反向映射（运行时生成）
 */
export const COUNTRY_TO_CONTINENT: Record<string, Continent> = {};

// 构建反向映射
for (const [continent, countries] of Object.entries(CONTINENT_COUNTRIES)) {
  for (const country of countries) {
    COUNTRY_TO_CONTINENT[country] = continent as Continent;
  }
}

/**
 * 根据国家代码获取大洲
 *
 * @param countryCode - ISO 3166-1 alpha-2 国家代码
 * @param defaultContinent - 默认大洲（找不到时返回）
 * @returns 大洲代码
 */
export function getContinentByCountry(
  countryCode: string,
  defaultContinent: Continent = 'as',
): Continent {
  return COUNTRY_TO_CONTINENT[countryCode?.toUpperCase()] ?? defaultContinent;
}
