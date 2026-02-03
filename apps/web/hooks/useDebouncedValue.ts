'use client';

import { useState, useEffect } from 'react';

/**
 * 防抖 hook，延迟更新值
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒），默认 500ms
 * @returns 防抖后的值
 */
export function useDebouncedValue<T>(value: T, delay = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
