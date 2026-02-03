import { useState, useCallback, useEffect } from 'react';

// 解析宽高比字符串为数字
const parseAspectRatio = (ratio: string): [number, number] => {
  const [w, h] = ratio.split(':').map(Number);
  return [w ?? 0, h ?? 0];
};

// 根据分辨率获取基准尺寸
const getBaseSize = (resolution: string): number => {
  switch (resolution) {
    case '1K':
      return 1024;
    case '2K':
      return 2048;
    case '4K':
      return 4096;
    default:
      return 2048;
  }
};

// 根据比例计算最大尺寸限制
const getMaxDimensions = (aspectRatio: string): [number, number] => {
  const [w, h] = parseAspectRatio(aspectRatio);
  const maxDimension = 6240;

  if (w > h) {
    // 横向比例：以高度为基准计算宽度
    const maxHeight = maxDimension;
    const maxWidth = Math.round(maxDimension * (w / h));
    // 如果计算出的宽度超过最大限制，则以宽度为基准重新计算
    return maxWidth > maxDimension
      ? [maxDimension, Math.round(maxDimension * (h / w))]
      : [maxWidth, maxHeight];
  } else {
    // 纵向比例：以宽度为基准计算高度
    const maxWidth = maxDimension;
    const maxHeight = Math.round(maxDimension * (h / w));
    // 如果计算出的高度超过最大限制，则以高度为基准重新计算
    return maxHeight > maxDimension
      ? [Math.round(maxDimension * (w / h)), maxDimension]
      : [maxWidth, maxHeight];
  }
};

// 根据宽高比和分辨率计算尺寸
const calculateSize = (
  aspectRatio: string,
  resolution: string,
): [number, number] => {
  const [w, h] = parseAspectRatio(aspectRatio);
  const baseSize = getBaseSize(resolution);
  const [maxWidth, maxHeight] = getMaxDimensions(aspectRatio);

  // 计算最适合的尺寸，保持比例
  if (w > h) {
    // 横向比例：宽度为主导
    const width = Math.min(baseSize, maxWidth, Math.round(baseSize * (w / h)));
    const height = Math.round(width * (h / w));
    return [width, height];
  } else {
    // 纵向比例：高度为主导
    const height = Math.min(
      baseSize,
      maxHeight,
      Math.round(baseSize * (h / w)),
    );
    const width = Math.round(height * (w / h));
    return [width, height];
  }
};

interface UseAspectRatioSizeOptions {
  initialAspectRatio?: string;
  initialResolution?: string;
  initialRatioLocked?: boolean;
  onSizeChange?: (width: number, height: number) => void;
}

interface UseAspectRatioSizeReturn {
  width: number;
  height: number;
  ratioLocked: boolean;
  setRatioLocked: (locked: boolean) => void;
  handleWidthChange: (value: string, aspectRatio: string) => void;
  handleHeightChange: (value: string, aspectRatio: string) => void;
  updateSizeFromRatio: (aspectRatio: string, resolution: string) => void;
}

export function useAspectRatioSize({
  initialAspectRatio = '3:4',
  initialResolution = '2K',
  initialRatioLocked = true,
  onSizeChange,
}: UseAspectRatioSizeOptions): UseAspectRatioSizeReturn {
  const [width, setWidth] = useState<number>(() => {
    const [w] = calculateSize(initialAspectRatio, initialResolution);
    return w;
  });
  const [height, setHeight] = useState<number>(() => {
    const [, h] = calculateSize(initialAspectRatio, initialResolution);
    return h;
  });
  const [ratioLocked, setRatioLocked] = useState<boolean>(initialRatioLocked);

  // 更新尺寸的方法
  const updateSizeFromRatio = useCallback(
    (aspectRatio: string, resolution: string) => {
      const [newWidth, newHeight] = calculateSize(aspectRatio, resolution);
      setWidth(newWidth);
      setHeight(newHeight);
    },
    [],
  );

  // 处理宽度输入 - 需要外部传入当前aspectRatio
  const handleWidthChange = useCallback(
    (value: string, currentAspectRatio: string) => {
      const numValue = parseInt(value);

      // 如果输入不是有效数字，忽略
      if (isNaN(numValue) || value === '') return;

      // 根据比例获取最大尺寸限制
      const [maxWidth] = getMaxDimensions(currentAspectRatio);

      // 限制在有效范围内，如果超出范围则修正
      const clampedValue = Math.max(1, Math.min(maxWidth, numValue));
      setWidth(clampedValue);

      if (ratioLocked) {
        const [w, h] = parseAspectRatio(currentAspectRatio);
        const newHeight = Math.round(clampedValue * (h / w));
        // 根据比例获取最大高度限制
        const [, maxHeight] = getMaxDimensions(currentAspectRatio);
        const clampedHeight = Math.max(1, Math.min(maxHeight, newHeight));
        setHeight(clampedHeight);
      }
    },
    [ratioLocked],
  );

  // 处理高度输入 - 需要外部传入当前aspectRatio
  const handleHeightChange = useCallback(
    (value: string, currentAspectRatio: string) => {
      const numValue = parseInt(value);

      // 如果输入不是有效数字，忽略
      if (isNaN(numValue) || value === '') return;

      // 根据比例获取最大尺寸限制
      const [, maxHeight] = getMaxDimensions(currentAspectRatio);

      // 限制在有效范围内，如果超出范围则修正
      const clampedValue = Math.max(1, Math.min(maxHeight, numValue));
      setHeight(clampedValue);

      if (ratioLocked) {
        const [w, h] = parseAspectRatio(currentAspectRatio);
        const newWidth = Math.round(clampedValue * (w / h));
        // 根据比例获取最大宽度限制
        const [maxWidth] = getMaxDimensions(currentAspectRatio);
        const clampedWidth = Math.max(1, Math.min(maxWidth, newWidth));
        setWidth(clampedWidth);
      }
    },
    [ratioLocked],
  );

  // 同步尺寸变化到外部（如 form）
  useEffect(() => {
    if (onSizeChange) {
      onSizeChange(width, height);
    }
  }, [width, height, onSizeChange]);

  return {
    width,
    height,
    ratioLocked,
    setRatioLocked,
    handleWidthChange,
    handleHeightChange,
    updateSizeFromRatio,
  };
}
