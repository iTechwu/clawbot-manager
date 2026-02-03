import {
  API_VERSION_HEADER,
  APP_BUILD_HEADER,
  API_VERSION_DEFAULT,
  PLATFORM_HEADER,
  OS_HEADER,
  DEVICE_ID_HEADER,
  MPTRAIL_HEADER,
} from '@repo/constants';

export interface HeaderData {
  platform: string;
  os: string;
  deviceid: string;
  mptrail?: string;
}

export interface VersionInfo {
  apiVersion?: string;
  appBuild?: string;
}

/**
 * 获取或生成设备 ID
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') {
    return 'server-device-id';
  }

  let deviceId = localStorage.getItem('deviceId');
  if (!deviceId) {
    // 生成一个唯一的设备 ID
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('deviceId', deviceId);
  }
  return deviceId;
}

/**
 * 获取操作系统信息
 */
function getOS(): string {
  if (typeof window === 'undefined') {
    return 'unknown';
  }

  const userAgent =
    navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/android/i.test(userAgent)) {
    return 'android';
  }

  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }

  if (/Mac/.test(userAgent)) {
    return 'macos';
  }

  if (/Win/.test(userAgent)) {
    return 'windows';
  }

  if (/Linux/.test(userAgent)) {
    return 'linux';
  }

  return 'unknown';
}
/**
 * 生成请求 Header 数据
 */
export function getHeaderData(mptrail?: string): HeaderData {
  return {
    platform: 'web',
    os: getOS(),
    deviceid: getDeviceId(),
    mptrail,
  };
}

/**
 * 将 HeaderData 转换为请求头对象
 * 所有自定义 headers 统一使用 x- 前缀，符合 HTTP 规范
 *
 * @param additionalHeaders 额外的 headers
 * @param mptrail 可选的 mptrail 值
 * @param versionInfo 可选的版本信息 (apiVersion, appBuild)
 */
export function getHeaders(
  additionalHeaders?: Record<string, string>,
  mptrail?: string,
  versionInfo?: VersionInfo,
): Record<string, string> {
  const headerData = getHeaderData(mptrail);
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  // 使用标准的 x- 前缀 headers
  headers[PLATFORM_HEADER] = headerData.platform; // x-platform
  headers[OS_HEADER] = headerData.os; // x-os
  headers[DEVICE_ID_HEADER] = headerData.deviceid; // x-device-id
  if (headerData.mptrail) {
    headers[MPTRAIL_HEADER] = headerData.mptrail; // x-mptrail
  }

  // 版本控制 headers
  headers[API_VERSION_HEADER] = versionInfo?.apiVersion || API_VERSION_DEFAULT;
  headers[APP_BUILD_HEADER] = versionInfo?.appBuild || 'dev';

  return headers;
}
