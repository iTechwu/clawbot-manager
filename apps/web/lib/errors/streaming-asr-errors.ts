/**
 * Streaming ASR Error Classes
 *
 * Provides a hierarchical error system for streaming ASR functionality
 * with error codes, recovery strategies, and user-friendly messages.
 */

/**
 * Error codes for categorization and analytics
 */
export enum StreamingAsrErrorCode {
  // Connection errors (1xxx)
  CONNECTION_FAILED = 'ASR_1001',
  CONNECTION_TIMEOUT = 'ASR_1002',
  CONNECTION_LOST = 'ASR_1003',
  SSE_ERROR = 'ASR_1004',
  WEBSOCKET_ERROR = 'ASR_1005',

  // Authentication errors (2xxx)
  AUTH_REQUIRED = 'ASR_2001',
  AUTH_EXPIRED = 'ASR_2002',
  AUTH_INVALID = 'ASR_2003',

  // Audio errors (3xxx)
  MICROPHONE_DENIED = 'ASR_3001',
  MICROPHONE_NOT_FOUND = 'ASR_3002',
  AUDIO_CONTEXT_ERROR = 'ASR_3003',
  AUDIO_FORMAT_ERROR = 'ASR_3004',
  AUDIO_BUFFER_OVERFLOW = 'ASR_3005',

  // Session errors (4xxx)
  SESSION_CREATE_FAILED = 'ASR_4001',
  SESSION_NOT_FOUND = 'ASR_4002',
  SESSION_EXPIRED = 'ASR_4003',
  SESSION_ALREADY_COMPLETED = 'ASR_4004',

  // API errors (5xxx)
  API_ERROR = 'ASR_5001',
  API_RATE_LIMITED = 'ASR_5002',
  API_UNAVAILABLE = 'ASR_5003',
  API_RESPONSE_INVALID = 'ASR_5004',

  // Unknown errors (9xxx)
  UNKNOWN = 'ASR_9999',
}

/**
 * Recovery strategy for different error types
 */
export enum RecoveryStrategy {
  /** Can automatically retry */
  RETRY = 'retry',
  /** User needs to take action (e.g., grant permission) */
  USER_ACTION = 'user_action',
  /** Need to re-authenticate */
  REAUTH = 'reauth',
  /** Need to create a new session */
  NEW_SESSION = 'new_session',
  /** Fatal error, cannot recover */
  FATAL = 'fatal',
}

/**
 * Base error class for all streaming ASR errors
 */
export class StreamingAsrError extends Error {
  readonly code: StreamingAsrErrorCode;
  readonly recoveryStrategy: RecoveryStrategy;
  readonly retryable: boolean;
  readonly cause?: Error;
  readonly timestamp: Date;

  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.UNKNOWN,
    recoveryStrategy: RecoveryStrategy = RecoveryStrategy.FATAL,
    cause?: Error,
  ) {
    super(message);
    this.name = 'StreamingAsrError';
    this.code = code;
    this.recoveryStrategy = recoveryStrategy;
    this.retryable = recoveryStrategy === RecoveryStrategy.RETRY;
    this.cause = cause;
    this.timestamp = new Date();

    // Maintain proper stack trace in V8 engines
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, StreamingAsrError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      recoveryStrategy: this.recoveryStrategy,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      cause: this.cause?.message,
    };
  }
}

/**
 * Connection-related errors
 */
export class ConnectionError extends StreamingAsrError {
  readonly retryCount: number;
  readonly maxRetries: number;

  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.CONNECTION_FAILED,
    retryCount = 0,
    maxRetries = 3,
    cause?: Error,
  ) {
    super(
      message,
      code,
      retryCount < maxRetries
        ? RecoveryStrategy.RETRY
        : RecoveryStrategy.NEW_SESSION,
      cause,
    );
    this.name = 'ConnectionError';
    this.retryCount = retryCount;
    this.maxRetries = maxRetries;
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries;
  }
}

/**
 * Authentication-related errors
 */
export class AuthError extends StreamingAsrError {
  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.AUTH_REQUIRED,
    cause?: Error,
  ) {
    super(message, code, RecoveryStrategy.REAUTH, cause);
    this.name = 'AuthError';
  }
}

/**
 * Audio-related errors (microphone, format, etc.)
 */
export class AudioError extends StreamingAsrError {
  readonly deviceId?: string;

  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.AUDIO_CONTEXT_ERROR,
    deviceId?: string,
    cause?: Error,
  ) {
    super(
      message,
      code,
      code === StreamingAsrErrorCode.MICROPHONE_DENIED
        ? RecoveryStrategy.USER_ACTION
        : RecoveryStrategy.RETRY,
      cause,
    );
    this.name = 'AudioError';
    this.deviceId = deviceId;
  }
}

/**
 * Session-related errors
 */
export class SessionError extends StreamingAsrError {
  readonly sessionId?: string;

  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.SESSION_CREATE_FAILED,
    sessionId?: string,
    cause?: Error,
  ) {
    super(
      message,
      code,
      code === StreamingAsrErrorCode.SESSION_ALREADY_COMPLETED
        ? RecoveryStrategy.NEW_SESSION
        : RecoveryStrategy.RETRY,
      cause,
    );
    this.name = 'SessionError';
    this.sessionId = sessionId;
  }
}

/**
 * API-related errors
 */
export class ApiError extends StreamingAsrError {
  readonly statusCode?: number;
  readonly endpoint?: string;

  constructor(
    message: string,
    code: StreamingAsrErrorCode = StreamingAsrErrorCode.API_ERROR,
    statusCode?: number,
    endpoint?: string,
    cause?: Error,
  ) {
    super(
      message,
      code,
      code === StreamingAsrErrorCode.API_RATE_LIMITED
        ? RecoveryStrategy.RETRY
        : RecoveryStrategy.FATAL,
      cause,
    );
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/**
 * Error factory for creating typed errors from unknown errors
 */
export function createStreamingError(
  error: unknown,
  context?: { sessionId?: string; deviceId?: string; endpoint?: string },
): StreamingAsrError {
  // Already a StreamingAsrError
  if (error instanceof StreamingAsrError) {
    return error;
  }

  // DOMException for media errors
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') {
      return new AudioError(
        'Microphone access denied',
        StreamingAsrErrorCode.MICROPHONE_DENIED,
        context?.deviceId,
        error,
      );
    }
    if (error.name === 'NotFoundError') {
      return new AudioError(
        'No microphone found',
        StreamingAsrErrorCode.MICROPHONE_NOT_FOUND,
        context?.deviceId,
        error,
      );
    }
  }

  // Standard Error
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Connection errors
    if (
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('fetch')
    ) {
      return new ConnectionError(
        error.message,
        StreamingAsrErrorCode.CONNECTION_FAILED,
        0,
        3,
        error,
      );
    }

    // Auth errors
    if (
      message.includes('unauthorized') ||
      message.includes('token') ||
      message.includes('auth')
    ) {
      return new AuthError(
        error.message,
        StreamingAsrErrorCode.AUTH_REQUIRED,
        error,
      );
    }

    // Session errors
    if (message.includes('session')) {
      return new SessionError(
        error.message,
        StreamingAsrErrorCode.SESSION_CREATE_FAILED,
        context?.sessionId,
        error,
      );
    }

    // Default to unknown
    return new StreamingAsrError(
      error.message,
      StreamingAsrErrorCode.UNKNOWN,
      RecoveryStrategy.FATAL,
      error,
    );
  }

  // Unknown error type
  return new StreamingAsrError(
    String(error),
    StreamingAsrErrorCode.UNKNOWN,
    RecoveryStrategy.FATAL,
  );
}

/**
 * User-friendly error messages for display
 */
export function getErrorMessage(
  error: StreamingAsrError,
  locale = 'en',
): string {
  const messages: Record<string, Record<StreamingAsrErrorCode, string>> = {
    en: {
      [StreamingAsrErrorCode.CONNECTION_FAILED]:
        'Unable to connect to the transcription service. Please check your network.',
      [StreamingAsrErrorCode.CONNECTION_TIMEOUT]:
        'Connection timed out. Please try again.',
      [StreamingAsrErrorCode.CONNECTION_LOST]:
        'Connection lost. Attempting to reconnect...',
      [StreamingAsrErrorCode.SSE_ERROR]: 'Real-time update connection error.',
      [StreamingAsrErrorCode.WEBSOCKET_ERROR]: 'WebSocket connection error.',
      [StreamingAsrErrorCode.AUTH_REQUIRED]:
        'Please log in to use this feature.',
      [StreamingAsrErrorCode.AUTH_EXPIRED]:
        'Your session has expired. Please log in again.',
      [StreamingAsrErrorCode.AUTH_INVALID]:
        'Authentication failed. Please log in again.',
      [StreamingAsrErrorCode.MICROPHONE_DENIED]:
        'Microphone access denied. Please grant permission in browser settings.',
      [StreamingAsrErrorCode.MICROPHONE_NOT_FOUND]:
        'No microphone found. Please connect a microphone.',
      [StreamingAsrErrorCode.AUDIO_CONTEXT_ERROR]:
        'Audio system error. Please refresh the page.',
      [StreamingAsrErrorCode.AUDIO_FORMAT_ERROR]: 'Unsupported audio format.',
      [StreamingAsrErrorCode.AUDIO_BUFFER_OVERFLOW]:
        'Audio buffer overflow. Processing audio...',
      [StreamingAsrErrorCode.SESSION_CREATE_FAILED]:
        'Unable to start transcription session.',
      [StreamingAsrErrorCode.SESSION_NOT_FOUND]:
        'Session not found or expired.',
      [StreamingAsrErrorCode.SESSION_EXPIRED]:
        'Session has expired. Please start a new recording.',
      [StreamingAsrErrorCode.SESSION_ALREADY_COMPLETED]:
        'This session has already been completed.',
      [StreamingAsrErrorCode.API_ERROR]:
        'Server error. Please try again later.',
      [StreamingAsrErrorCode.API_RATE_LIMITED]:
        'Too many requests. Please wait a moment.',
      [StreamingAsrErrorCode.API_UNAVAILABLE]:
        'Service temporarily unavailable.',
      [StreamingAsrErrorCode.API_RESPONSE_INVALID]: 'Invalid server response.',
      [StreamingAsrErrorCode.UNKNOWN]: 'An unexpected error occurred.',
    },
    'zh-CN': {
      [StreamingAsrErrorCode.CONNECTION_FAILED]:
        '无法连接到转写服务，请检查网络连接。',
      [StreamingAsrErrorCode.CONNECTION_TIMEOUT]: '连接超时，请重试。',
      [StreamingAsrErrorCode.CONNECTION_LOST]: '连接已断开，正在尝试重连...',
      [StreamingAsrErrorCode.SSE_ERROR]: '实时更新连接错误。',
      [StreamingAsrErrorCode.WEBSOCKET_ERROR]: 'WebSocket连接错误。',
      [StreamingAsrErrorCode.AUTH_REQUIRED]: '请登录后使用此功能。',
      [StreamingAsrErrorCode.AUTH_EXPIRED]: '登录已过期，请重新登录。',
      [StreamingAsrErrorCode.AUTH_INVALID]: '认证失败，请重新登录。',
      [StreamingAsrErrorCode.MICROPHONE_DENIED]:
        '麦克风权限被拒绝，请在浏览器设置中允许访问。',
      [StreamingAsrErrorCode.MICROPHONE_NOT_FOUND]:
        '未检测到麦克风，请连接麦克风后重试。',
      [StreamingAsrErrorCode.AUDIO_CONTEXT_ERROR]: '音频系统错误，请刷新页面。',
      [StreamingAsrErrorCode.AUDIO_FORMAT_ERROR]: '不支持的音频格式。',
      [StreamingAsrErrorCode.AUDIO_BUFFER_OVERFLOW]:
        '音频缓冲区溢出，正在处理...',
      [StreamingAsrErrorCode.SESSION_CREATE_FAILED]: '无法启动转写会话。',
      [StreamingAsrErrorCode.SESSION_NOT_FOUND]: '会话不存在或已过期。',
      [StreamingAsrErrorCode.SESSION_EXPIRED]: '会话已过期，请开始新的录音。',
      [StreamingAsrErrorCode.SESSION_ALREADY_COMPLETED]: '此会话已结束。',
      [StreamingAsrErrorCode.API_ERROR]: '服务器错误，请稍后重试。',
      [StreamingAsrErrorCode.API_RATE_LIMITED]: '请求过于频繁，请稍候。',
      [StreamingAsrErrorCode.API_UNAVAILABLE]: '服务暂时不可用。',
      [StreamingAsrErrorCode.API_RESPONSE_INVALID]: '服务器响应无效。',
      [StreamingAsrErrorCode.UNKNOWN]: '发生未知错误。',
    },
  };

  const localeMessages = messages[locale] ?? messages['en'];
  const enMessages = messages['en'];
  return (
    localeMessages?.[error.code] ?? enMessages?.[error.code] ?? error.message
  );
}

/**
 * Get recovery action text for display
 */
export function getRecoveryActionText(
  strategy: RecoveryStrategy,
  locale = 'en',
): string {
  const actions: Record<string, Record<RecoveryStrategy, string>> = {
    en: {
      [RecoveryStrategy.RETRY]: 'Retry',
      [RecoveryStrategy.USER_ACTION]: 'Grant Permission',
      [RecoveryStrategy.REAUTH]: 'Log In Again',
      [RecoveryStrategy.NEW_SESSION]: 'Start New Session',
      [RecoveryStrategy.FATAL]: 'Contact Support',
    },
    'zh-CN': {
      [RecoveryStrategy.RETRY]: '重试',
      [RecoveryStrategy.USER_ACTION]: '授权权限',
      [RecoveryStrategy.REAUTH]: '重新登录',
      [RecoveryStrategy.NEW_SESSION]: '开始新会话',
      [RecoveryStrategy.FATAL]: '联系支持',
    },
  };

  const localeActions = actions[locale] ?? actions['en'];
  const enActions = actions['en'];
  return localeActions?.[strategy] ?? enActions?.[strategy] ?? strategy;
}
