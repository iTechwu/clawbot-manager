/**
 * Image Factory 类型定义
 * 图片工厂 - AI 图像生成与编辑
 */

/** 图像生成模型 */
export type ImageModel = 'gemini-2.5-flash-image-preview' | 'gemini-3-pro-image-preview';

/** 图像纵横比 */
export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '4:3'
  | '3:4'
  | '3:2'
  | '2:3';

/** 图像分辨率 */
export type ImageSize = '1K' | '2K' | '4K';

/** 图像生成请求 */
export interface ImageGenerationRequest {
  /** 模型 */
  model: ImageModel;
  /** 提示词 */
  prompt: string;
  /** 纵横比 */
  aspect_ratio: AspectRatio;
  /** 分辨率 */
  image_size: ImageSize;
}

/** 图像编辑请求 */
export interface ImageEditRequest extends ImageGenerationRequest {
  /** 上传图片的 URL 或 base64 */
  images: string[];
}

/** 图像结果项 */
export interface ImageResultItem {
  /** 图片 URL */
  url: string;
  /** 修正后的提示词 */
  revised_prompt?: string;
}

/** 图像生成响应 */
export interface ImageGenerationResponse {
  /** 创建时间戳 */
  created: number;
  /** 生成的图片列表 */
  data: ImageResultItem[];
}

/** 历史记录 */
export interface ImageHistoryRecord {
  /** 唯一 ID */
  id: string;
  /** 时间戳 */
  timestamp: number;
  /** 类型：生成或编辑 */
  type: 'generate' | 'edit';
  /** 提示词 */
  prompt: string;
  /** 使用的模型 */
  model: ImageModel;
  /** 纵横比 */
  aspectRatio: AspectRatio;
  /** 分辨率 */
  imageSize: ImageSize;
  /** 输入图片（编辑模式） */
  inputImages: string[];
  /** 输出图片 */
  outputImages: string[];
}

/** 模型选项配置 */
export interface ImageModelOption {
  value: ImageModel;
  label: string;
  supports4K: boolean;
}

/** 纵横比选项配置 */
export interface AspectRatioOption {
  value: AspectRatio;
  label: string;
  width: number;
  height: number;
}

/** 分辨率选项配置 */
export interface ImageSizeOption {
  value: ImageSize;
  label: string;
  pixels: string;
}

/** 模型选项列表 */
export const IMAGE_MODEL_OPTIONS: ImageModelOption[] = [
  { value: 'gemini-2.5-flash-image-preview', label: 'Gemini 2.5 Flash', supports4K: false },
  { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro', supports4K: true },
];

/** 纵横比选项列表 */
export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  { value: '1:1', label: '1:1 正方形', width: 1, height: 1 },
  { value: '16:9', label: '16:9 横屏', width: 16, height: 9 },
  { value: '9:16', label: '9:16 竖屏', width: 9, height: 16 },
  { value: '4:3', label: '4:3 传统', width: 4, height: 3 },
  { value: '3:4', label: '3:4 竖版', width: 3, height: 4 },
  { value: '3:2', label: '3:2 相机', width: 3, height: 2 },
  { value: '2:3', label: '2:3 竖版相机', width: 2, height: 3 },
];

/** 分辨率选项列表 */
export const IMAGE_SIZE_OPTIONS: ImageSizeOption[] = [
  { value: '1K', label: '1K', pixels: '1024px' },
  { value: '2K', label: '2K', pixels: '2048px' },
  { value: '4K', label: '4K', pixels: '4096px' },
];
