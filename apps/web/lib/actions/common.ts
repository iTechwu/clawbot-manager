'use server';

import request from '@/lib/requests';
import type {
  GetUploadUrlRequest,
  GetUploadUrlResponse,
} from '@repo/types/common';

export async function getSignedUploadUrl(params: GetUploadUrlRequest) {
  return request.post<GetUploadUrlResponse>('/v1/oss/upload-url', {
    params,
  });
}
