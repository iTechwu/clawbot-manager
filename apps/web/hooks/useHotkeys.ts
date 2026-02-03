'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Hotkey definition
 */
export interface HotkeyConfig {
  /** Key combination (e.g., 'Space', 'Ctrl+S', 'Meta+Shift+P') */
  key: string;
  /** Callback when hotkey is pressed */
  handler: (event: KeyboardEvent) => void;
  /** Whether to prevent default behavior (default: true) */
  preventDefault?: boolean;
  /** Whether to stop propagation (default: false) */
  stopPropagation?: boolean;
  /** Only trigger when these elements are NOT focused */
  ignoreInputs?: boolean;
  /** Description for accessibility */
  description?: string;
  /** Whether the hotkey is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Parse key combination string into parts
 */
function parseKey(key: string): {
  key: string;
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  meta: boolean;
} {
  const parts = key
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const mainKey = parts[parts.length - 1] ?? '';

  return {
    key: mainKey === 'space' ? ' ' : mainKey,
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt') || parts.includes('option'),
    shift: parts.includes('shift'),
    meta:
      parts.includes('meta') ||
      parts.includes('cmd') ||
      parts.includes('command'),
  };
}

/**
 * Check if an element is an input element
 */
function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  return false;
}

/**
 * Custom hook for keyboard shortcuts
 *
 * Features:
 * - Support for key combinations (Ctrl, Alt, Shift, Meta)
 * - Option to ignore when input elements are focused
 * - Enable/disable hotkeys dynamically
 * - Prevent default and stop propagation options
 *
 * @example
 * ```tsx
 * useHotkeys([
 *   { key: 'Space', handler: toggleRecording, description: 'Toggle recording' },
 *   { key: 'Escape', handler: cancelRecording, description: 'Cancel recording' },
 *   { key: 'Ctrl+S', handler: saveRecording, description: 'Save recording' },
 * ]);
 * ```
 */
export function useHotkeys(
  hotkeys: HotkeyConfig[],
  deps: React.DependencyList = [],
) {
  const hotkeysRef = useRef(hotkeys);

  // Update ref when hotkeys change
  useEffect(() => {
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const activeElement = document.activeElement;

    for (const hotkey of hotkeysRef.current) {
      // Skip if disabled
      if (hotkey.enabled === false) continue;

      // Skip if focused on input and ignoreInputs is true
      if (hotkey.ignoreInputs !== false && isInputElement(activeElement)) {
        continue;
      }

      const parsed = parseKey(hotkey.key);

      // Check if key matches
      const keyMatches =
        event.key.toLowerCase() === parsed.key ||
        event.code.toLowerCase() === parsed.key ||
        event.code.toLowerCase() === `key${parsed.key}`;

      // Check modifiers
      const modifiersMatch =
        event.ctrlKey === parsed.ctrl &&
        event.altKey === parsed.alt &&
        event.shiftKey === parsed.shift &&
        event.metaKey === parsed.meta;

      if (keyMatches && modifiersMatch) {
        if (hotkey.preventDefault !== false) {
          event.preventDefault();
        }

        if (hotkey.stopPropagation) {
          event.stopPropagation();
        }

        hotkey.handler(event);
        return;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, ...deps]);
}

/**
 * Hook for a single hotkey
 */
export function useHotkey(
  key: string,
  handler: (event: KeyboardEvent) => void,
  options: Omit<HotkeyConfig, 'key' | 'handler'> = {},
  deps: React.DependencyList = [],
) {
  useHotkeys([{ key, handler, ...options }], deps);
}

/**
 * Recording-specific hotkeys preset
 */
export interface RecordingHotkeysConfig {
  onToggleRecording?: () => void;
  onPauseResume?: () => void;
  onStop?: () => void;
  onCancel?: () => void;
  enabled?: boolean;
}

/**
 * Hook for recording-specific keyboard shortcuts
 *
 * Default shortcuts:
 * - Space: Pause/Resume
 * - Enter: Stop recording
 * - Escape: Cancel recording
 * - R: Start recording (when idle)
 *
 * @example
 * ```tsx
 * useRecordingHotkeys({
 *   onToggleRecording: handleToggle,
 *   onPauseResume: handlePauseResume,
 *   onStop: handleStop,
 *   onCancel: handleCancel,
 *   enabled: isRecordingActive,
 * });
 * ```
 */
export function useRecordingHotkeys(config: RecordingHotkeysConfig) {
  const {
    onToggleRecording,
    onPauseResume,
    onStop,
    onCancel,
    enabled = true,
  } = config;

  const hotkeys: HotkeyConfig[] = [];

  if (onPauseResume) {
    hotkeys.push({
      key: 'Space',
      handler: onPauseResume,
      description: 'Pause/Resume recording',
      enabled,
      ignoreInputs: true,
    });
  }

  if (onStop) {
    hotkeys.push({
      key: 'Enter',
      handler: onStop,
      description: 'Stop recording',
      enabled,
      ignoreInputs: true,
    });
  }

  if (onCancel) {
    hotkeys.push({
      key: 'Escape',
      handler: onCancel,
      description: 'Cancel recording',
      enabled,
      ignoreInputs: true,
    });
  }

  if (onToggleRecording) {
    hotkeys.push({
      key: 'r',
      handler: onToggleRecording,
      description: 'Toggle recording',
      enabled,
      ignoreInputs: true,
    });
  }

  useHotkeys(hotkeys, [
    enabled,
    onToggleRecording,
    onPauseResume,
    onStop,
    onCancel,
  ]);
}

export default useHotkeys;
