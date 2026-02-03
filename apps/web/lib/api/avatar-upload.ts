/**
 * Avatar Upload - 头像上传功能
 * 使用 uploader/token/public API 上传头像到 OSS
 */

import { uploaderClient } from '../api/contracts/client';
import { encryptParams } from '@repo/utils/encrypt';
import type { TokenResponse, FileSourceResponse } from '@repo/contracts';

interface UploadAvatarResult {
  fileId: string;
  url: string;
}

/**
 * 上传头像到 OSS
 * @param file 头像文件
 * @param onProgress 进度回调
 * @returns { fileId, url }
 */
export async function uploadAvatar(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<UploadAvatarResult> {
  const filename = file.name;

  // 生成 signature（public token 只需要 filename）
  const signature = encryptParams(filename);

  // 获取 private upload token
  const tokenResponse = await uploaderClient.getPrivateToken({
    body: {
      signature,
      filename,
      fsize: file.size,
      bucket: 'tos-pardx-files',
      vendor: 'tos',
    },
  });

  if (tokenResponse.status !== 200) {
    throw new Error('获取上传 Token 失败');
  }

  const tokenData: TokenResponse = tokenResponse.body.data;
  if (!tokenData?.token || !tokenData?.key || !tokenData?.fileId) {
    throw new Error('无法获取上传 Token、Key 或 FileId');
  }

  onProgress?.(10);

  // 上传文件到 OSS
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        const percentage = Math.round((e.loaded / e.total) * 80) + 10; // 10-90%
        onProgress?.(percentage);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 200 || xhr.status === 204) {
        onProgress?.(90);
        resolve();
      } else {
        reject(new Error(`上传失败: HTTP ${xhr.status}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('上传失败: 网络错误'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('上传已取消'));
    });

    xhr.open('PUT', tokenData.token || '');
    xhr.setRequestHeader(
      'Content-Type',
      file.type || 'application/octet-stream',
    );
    xhr.send(file);
  });

  // 调用 complete 接口标记上传完成
  const completeSignature = encryptParams(tokenData.fileId);
  const completeResponse = await uploaderClient.complete({
    body: {
      signature: completeSignature,
      fileId: tokenData.fileId,
    },
  });

  if (completeResponse.status !== 200) {
    throw new Error('标记上传完成失败');
  }

  const fileData: FileSourceResponse = completeResponse.body.data;
  onProgress?.(100);

  return {
    fileId: fileData.id,
    url:
      fileData.url ||
      `https://files.pardx.cn/images/oss/${fileData.key}/~tplv-fv5ms769k2-preview-v2:183:103:360:360.webp`,
  };
}
