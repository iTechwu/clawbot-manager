import { pinyin } from 'pinyin-pro';

import { validate as uuidValidate } from 'uuid';
import { default as objectUtil } from './object.util';

export default {
  isUUID(str: unknown): boolean {
    if (objectUtil.getType(str) !== 'string') {
      return false;
    }
    return uuidValidate(str);
  },

  stringGen(len = 6): string {
    let text = '';
    const charset = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < len; i++)
      text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
  },

  formatCode(input: string): string {
    return input.replace(/[Oo]/g, '0').replace(/[Il]/g, '1');
  },

  generateCode(length: number): string {
    const characters =
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz0123456789'; // Removed 'I', 'O' and 'l'
    let result = '';
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length),
      );
    }
    return result;
  },

  toCamelCase(inputString: string): string {
    return inputString.replace(/_+(\w)/g, (match: string, letter: string) =>
      letter.toUpperCase(),
    );
  },

  generateString(input: string, suffixLength = 3): string {
    // 判断是否为中文
    const isChinese = /^[\u4e00-\u9fa5]+$/.test(input);

    let resultString = '';
    if (isChinese) {
      // 中文转拼音
      resultString = pinyin(input, {
        type: 'string',
        separator: '-',
      });
      // // 拼接拼音
      // resultString = pinyinArray.flat().join('')
    } else {
      // 已经是英文，直接使用原字符串
      resultString = input;
    }

    // 生成随机后缀
    const randomSuffix = Math.random()
      .toString(32)
      .substring(2, suffixLength + 2);

    // 添加后缀
    return `${resultString}-${randomSuffix}`;
  },

  createPathAccessor(path: string[]): {
    get: (index: number) => string | undefined;
  } {
    const accumulatedPaths: string[] = [];
    let currentPath = '';

    for (const segment of path) {
      currentPath += '/' + segment;
      accumulatedPaths.push(currentPath);
    }

    return {
      get: (index: number) => {
        if (index < 0 || index >= accumulatedPaths.length) {
          return undefined;
        }
        return accumulatedPaths[index];
      },
    };
  },

  splitString(inputString: string, splitChar = '/', slice?: number): string[] {
    // 使用split方法按照'/'字符分割字符串
    const parts = inputString
      .trim()
      .split(splitChar)
      .filter((id) => id !== '');
    if (slice) {
      // 如果指定了slice参数，则截取前slice个部分
      return parts.length > slice ? parts.slice(slice) : [];
    }
    return parts;
  },

  trimSlashes(str: string): string {
    return (str || '').replace(/^\/+|\/+$/g, '');
  },

  maskPhoneNumber(mobile: string): string {
    // 假设手机号码是11位，并且已经进行了格式验证
    // 如果手机号码长度不是11位，则可能需要额外的处理
    if (mobile.length !== 11) {
      throw new Error('Invalid phone number length. Expected 11 digits.');
    }
    // 使用模板字符串和切片操作来替换中间四位为'※'
    return `${mobile.slice(0, 3)}****${mobile.slice(7)}`;
  },

  generateSessionId(user_id: string): string {
    // 获取当前时间戳，格式：YYYYMMDDHHMMSS
    const now = new Date();
    const timestamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');

    // 生成8位随机字符串
    const randomStr = this.stringGen(8);

    // 组合：时间戳+随机字符串+user_id
    return `${timestamp}${randomStr}${user_id}`;
  },
};
