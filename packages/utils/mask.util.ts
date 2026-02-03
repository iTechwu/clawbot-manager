/**
 * 敏感数据脱敏工具
 * Sensitive Data Masking Utility
 */

export interface MaskOptions {
  /** 保留前缀字符数 */
  prefixLength?: number;
  /** 保留后缀字符数 */
  suffixLength?: number;
  /** 掩码字符 */
  maskChar?: string;
  /** 掩码数量（固定数量而非根据原文长度） */
  fixedMaskLength?: number;
}

/**
 * 通用字符串脱敏
 */
function maskString(str: string, options: MaskOptions = {}): string {
  if (!str || typeof str !== 'string') return str;

  const {
    prefixLength = 0,
    suffixLength = 0,
    maskChar = '*',
    fixedMaskLength,
  } = options;

  if (str.length <= prefixLength + suffixLength) {
    return str;
  }

  const prefix = str.slice(0, prefixLength);
  const suffix = str.slice(-suffixLength || undefined);
  const maskLength =
    fixedMaskLength ?? str.length - prefixLength - suffixLength;
  const mask = maskChar.repeat(Math.max(maskLength, 1));

  return suffixLength > 0 ? `${prefix}${mask}${suffix}` : `${prefix}${mask}`;
}

/**
 * 邮箱脱敏
 * example@gmail.com → ex***@gmail.com
 */
function maskEmail(email: string): string {
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return email;
  }

  const [local, domain] = email.split('@');
  const maskedLocal = local.length <= 2 ? local : `${local.slice(0, 2)}***`;

  return `${maskedLocal}@${domain}`;
}

/**
 * 手机号脱敏
 * 13812345678 → 138****5678
 */
function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return phone;

  // 处理带国际区号的手机号
  const cleanPhone = phone.replace(/[\s\-\+]/g, '');

  if (cleanPhone.length < 7) return phone;

  // 中国手机号 11 位
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  // 其他格式：保留前 3 后 4
  return maskString(cleanPhone, {
    prefixLength: 3,
    suffixLength: 4,
    fixedMaskLength: 4,
  });
}

/**
 * 身份证脱敏
 * 110101199001011234 → 1101**********1234
 */
function maskIdCard(id: string): string {
  if (!id || typeof id !== 'string') return id;

  const cleanId = id.replace(/[\s\-]/g, '');

  if (cleanId.length < 15) return id;

  return maskString(cleanId, {
    prefixLength: 4,
    suffixLength: 4,
    fixedMaskLength: 10,
  });
}

/**
 * 银行卡脱敏
 * 6222021234567890123 → 6222 **** **** 0123
 */
function maskBankCard(card: string): string {
  if (!card || typeof card !== 'string') return card;

  const cleanCard = card.replace(/[\s\-]/g, '');

  if (cleanCard.length < 13) return card;

  const prefix = cleanCard.slice(0, 4);
  const suffix = cleanCard.slice(-4);

  return `${prefix} **** **** ${suffix}`;
}

/**
 * 姓名脱敏
 * 张三 → 张*
 * 王小明 → 王*明
 * John Doe → J***e
 */
function maskName(name: string): string {
  if (!name || typeof name !== 'string') return name;

  const trimmedName = name.trim();

  if (trimmedName.length < 2) return trimmedName;

  if (trimmedName.length === 2) {
    return `${trimmedName[0]}*`;
  }

  const first = trimmedName[0];
  const last = trimmedName[trimmedName.length - 1];
  const middleMask = '*'.repeat(trimmedName.length - 2);

  return `${first}${middleMask}${last}`;
}

/**
 * 地址脱敏
 * 北京市朝阳区xxx街道123号 → 北京市朝阳区***
 */
function maskAddress(address: string): string {
  if (!address || typeof address !== 'string') return address;

  const trimmedAddress = address.trim();

  if (trimmedAddress.length <= 6) return trimmedAddress;

  // 保留前 6 个字符（通常是省市区）
  return `${trimmedAddress.slice(0, 6)}***`;
}

/**
 * IP 地址脱敏
 * 192.168.1.100 → 192.168.*.*
 */
function maskIp(ip: string): string {
  if (!ip || typeof ip !== 'string') return ip;

  // IPv4
  if (ip.includes('.')) {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
  }

  // IPv6: 保留前两段
  if (ip.includes(':')) {
    const parts = ip.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}:****:****`;
    }
  }

  return ip;
}

/**
 * Token/密钥脱敏
 * eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... → eyJh***...9
 */
function maskToken(token: string): string {
  if (!token || typeof token !== 'string') return token;

  if (token.length <= 8) return '***';

  return `${token.slice(0, 4)}***${token.slice(-4)}`;
}

/**
 * 密码脱敏（总是显示固定星号）
 */
function maskPassword(_password: string): string {
  return '********';
}

/**
 * URL 脱敏（隐藏查询参数中的敏感信息）
 */
function maskUrl(
  url: string,
  sensitiveParams: string[] = ['token', 'key', 'secret', 'password', 'apiKey'],
): string {
  if (!url || typeof url !== 'string') return url;

  try {
    const urlObj = new URL(url);
    sensitiveParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.set(param, '***');
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * 敏感字段名列表
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'apiKey',
  'apiSecret',
  'privateKey',
  'credential',
  'authorization',
];

/**
 * 自动检测并脱敏对象中的敏感字段
 */
function maskObject<T extends Record<string, any>>(
  obj: T,
  additionalFields: string[] = [],
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const sensitiveFields = [...SENSITIVE_FIELDS, ...additionalFields];
  const result: Record<string, any> = { ...obj };

  for (const key of Object.keys(result)) {
    const lowerKey = key.toLowerCase();

    // 检查是否为敏感字段
    const isSensitive = sensitiveFields.some((field) =>
      lowerKey.includes(field.toLowerCase()),
    );

    if (isSensitive && typeof result[key] === 'string') {
      result[key] = '***';
      continue;
    }

    // 递归处理嵌套对象
    if (
      result[key] &&
      typeof result[key] === 'object' &&
      !Array.isArray(result[key])
    ) {
      result[key] = maskObject(result[key], additionalFields);
    }

    // 处理数组
    if (Array.isArray(result[key])) {
      result[key] = result[key].map((item: any) =>
        typeof item === 'object' ? maskObject(item, additionalFields) : item,
      );
    }

    // 特殊字段处理
    if (lowerKey === 'email' && typeof result[key] === 'string') {
      result[key] = maskEmail(result[key]);
    } else if (
      (lowerKey === 'phone' || lowerKey === 'mobile') &&
      typeof result[key] === 'string'
    ) {
      result[key] = maskPhone(result[key]);
    } else if (lowerKey === 'idcard' && typeof result[key] === 'string') {
      result[key] = maskIdCard(result[key]);
    } else if (lowerKey === 'ip' && typeof result[key] === 'string') {
      result[key] = maskIp(result[key]);
    }
  }

  return result as T;
}

/**
 * 脱敏工具对象
 */
const maskUtil = {
  /** 通用字符串脱敏 */
  string: maskString,
  /** 邮箱脱敏 */
  email: maskEmail,
  /** 手机号脱敏 */
  phone: maskPhone,
  /** 身份证脱敏 */
  idCard: maskIdCard,
  /** 银行卡脱敏 */
  bankCard: maskBankCard,
  /** 姓名脱敏 */
  name: maskName,
  /** 地址脱敏 */
  address: maskAddress,
  /** IP 地址脱敏 */
  ip: maskIp,
  /** Token/密钥脱敏 */
  token: maskToken,
  /** 密码脱敏 */
  password: maskPassword,
  /** URL 脱敏 */
  url: maskUrl,
  /** 对象自动脱敏 */
  object: maskObject,
  /** 敏感字段名列表 */
  SENSITIVE_FIELDS,
};

export default maskUtil;

// 同时导出独立函数以支持按需导入
export {
  maskString,
  maskEmail,
  maskPhone,
  maskIdCard,
  maskBankCard,
  maskName,
  maskAddress,
  maskIp,
  maskToken,
  maskPassword,
  maskUrl,
  maskObject,
  SENSITIVE_FIELDS,
};
