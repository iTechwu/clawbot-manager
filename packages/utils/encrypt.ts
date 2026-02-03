import * as CryptoJS from 'crypto-js';

/**
 * AES 加密（实际是 AES，但函数名保持与 Vue 代码一致）
 */
export function rsaEncrypt(val: string): string {
  const key = 'qmez2n1llvatr8gczip6uyokpi1wi8ys';
  const cipher = CryptoJS.AES.encrypt(val, key);
  return cipher.toString();
}

/**
 * AES 解密
 */
export function rsaDecrypt(encryptedVal: string): string | false {
  try {
    const key = 'qmez2n1llvatr8gczip6uyokpi1wi8ys';
    const bytes = CryptoJS.AES.decrypt(encryptedVal, key);
    const decryptedText = bytes.toString(CryptoJS.enc.Utf8);
    return decryptedText;
  } catch (error) {
    console.error('解密失败:', error);
    return '';
  }
}

/**
 * 加密参数（用于 API 签名）
 */
export function encryptParams(
  filename: string = '',
  sha256?: string,
  fileId?: string,
): string {
  const timestamp: number = Date.now();
  const platform: string = 'pc';

  // 从 localStorage 获取用户 ID
  // 优先使用新的存储键 'user'，如果不存在则尝试旧的 'userInfo'（向后兼容）
  let userId = '';
  if (typeof window !== 'undefined') {
    // 尝试新的存储键
    let userStr = localStorage.getItem('user');
    if (!userStr) {
      // 向后兼容：尝试旧的存储键
      userStr = localStorage.getItem('userInfo');
    }
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        userId = user.id || '';
      } catch (error) {
        console.error('[encryptParams] Failed to parse user data:', error);
        // 忽略解析错误，userId 保持为空字符串
      }
    }

    // 调试日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      console.log('[encryptParams] User ID from storage:', {
        userId,
        hasUserStr: !!userStr,
        storageKey: userStr
          ? localStorage.getItem('user')
            ? 'user'
            : 'userInfo'
          : 'none',
      });
    }
  }
  console.log('userId', userId);

  const params: any = {
    filename,
    timestamp,
    platform,
    userId,
  };

  if (fileId) {
    params.fileId = fileId;
  }

  if (sha256) {
    params.sha256 = sha256;
  }

  const encrypted = rsaEncrypt(JSON.stringify(params)).toString();

  // 调试日志（仅在开发环境）
  if (process.env.NODE_ENV === 'development') {
    console.log('[encryptParams] Generated signature params:', {
      filename,
      timestamp,
      platform,
      userId,
      hasFileId: !!fileId,
      hasSha256: !!sha256,
      signatureLength: encrypted.length,
    });
  }

  return encrypted;
}
