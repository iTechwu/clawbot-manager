/**
 * Upload error codes - maps to i18n keys in errors.json under "file" namespace
 */
export enum UploadErrorCode {
  UPLOAD_FAILED = 'uploadFailed',
  UPLOAD_CANCELLED = 'uploadCancelled',
  NETWORK_ERROR = 'networkError',
  GET_FILE_ID_FAILED = 'getFileIdFailed',
  GET_UPLOAD_TOKEN_FAILED = 'getUploadTokenFailed',
  GET_CHUNK_TOKEN_FAILED = 'getChunkTokenFailed',
  INIT_MULTIPART_FAILED = 'initMultipartFailed',
  COMPLETE_UPLOAD_FAILED = 'completeUploadFailed',
  ABORT_UPLOAD_FAILED = 'abortUploadFailed',
  GET_ETAG_FAILED = 'getEtagFailed',
  UPLOAD_STATUS_ERROR = 'uploadStatusError',
}

/**
 * Upload error class with i18n support
 */
export class UploadError extends Error {
  /** Error code for i18n lookup */
  readonly code: UploadErrorCode;
  /** Additional parameters for i18n interpolation */
  readonly params?: Record<string, string | number>;

  constructor(
    code: UploadErrorCode,
    message?: string,
    params?: Record<string, string | number>,
  ) {
    super(message || code);
    this.name = 'UploadError';
    this.code = code;
    this.params = params;
  }

  /**
   * Get the i18n key for this error
   */
  get i18nKey(): string {
    return `file.${this.code}`;
  }
}
