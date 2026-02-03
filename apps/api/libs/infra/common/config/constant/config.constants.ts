export const TRANSCODE_CONSTANTS = {
  // 队列配置
  QUEUES: {
    TRANSCODE: 'transcode',
  },

  // 文件后缀
  SUFFIXES: {
    SNAPSHOT: '_snapshot',
    SPRITE: '_sprite_',
    MP3: '',
    E4K: '_4k',
    E1080P: '_1080p',
    E720P: '_720p',
    E360P: '_360p',
    HDR2SDR: '.hdr2sdr',
  },

  // 超时配置
  TIMEOUTS: {
    SIGNED_URL: 3600, // 1小时
    API_REQUEST: 30000, // 30秒
  },

  // 视频处理配置
  VIDEO: {
    SPRITE_INTERVAL: 3, // 雪碧图间隔秒数
    DEFAULT_PRIORITY: 5,
    MIN_DURATION: 0.1, // 最小时长
  },

  // API 路径
  API_PATHS: {
    TEMPLATES: '/templates',
    SCHEMA: '/schema',
    TASKS: '/tasks',
    INFO: '?info',
  },

  SNAPSHOT_KEY: 'video/snapshot,t_0',

  // 文件扩展名
  EXTENSIONS: {
    JPG: '.jpg',
    MP4: '.mp4',
    MP3: '.mp3',
    WEBP: '.webp',
  },

  // 错误消息
  ERROR_MESSAGES: {
    INVALID_FILE: 'Invalid file for transcoding',
    BUCKET_NOT_SUPPORTED: 'Bucket not supported for transcoding',
    TEMPLATE_SCHEMA_FAILED: 'Failed to get template schemas',
    TASK_CREATION_FAILED: 'Failed to create transcode task',
    VIDEO_INFO_FAILED: 'Failed to get video information',
  },
} as const;

export const SUPPORTED_VIDEO_FORMATS = [
  'mp4',
  'avi',
  'mov',
  'wmv',
  'flv',
  'webm',
  'mkv',
  'm4v',
  '3gp',
  'ogv',
] as const;

export const SUPPORTED_AUDIO_FORMATS = [
  'mp3',
  'wav',
  'flac',
  'aac',
  'ogg',
  'wma',
  'm4a',
] as const;

export const SUPPORTED_IMAGE_FORMATS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'bmp',
  'webp',
  'tiff',
  'svg',
] as const;
