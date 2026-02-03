'use client';

import * as React from 'react';
import { useState } from 'react';
import { cn } from '@repo/utils';
import { Button, Input } from '@repo/ui';
import { useTranslations } from 'next-intl';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

const COMMON_EMOJIS = [
  '🤖', '🧠', '💬', '🎯', '⚡', '🔥', '💡', '🌟',
  '🎮', '📚', '✍️', '🔬', '🎨', '🎧', '💻', '🛠️',
  '🌍', '🚀', '🎭', '🦾', '👾', '🤝', '📊', '🔮',
  '🦊', '🐱', '🐶', '🦁', '🐼', '🦄', '🐉', '🦅',
];

export function EmojiPicker({ value, onChange, className }: EmojiPickerProps) {
  const t = useTranslations('wizard.emoji');
  const [showGrid, setShowGrid] = useState(false);
  const [textInput, setTextInput] = useState(value);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTextInput(newValue);
    if (newValue.length > 0) {
      onChange(newValue.slice(0, 2));
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setTextInput(emoji);
    onChange(emoji);
    setShowGrid(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <Input
          type="text"
          value={textInput}
          onChange={handleTextChange}
          placeholder="🤖"
          maxLength={2}
          className="w-16 text-center text-xl"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowGrid(!showGrid)}
        >
          {showGrid ? t('hide') : t('pick')}
        </Button>
      </div>
      {showGrid && (
        <div className="grid grid-cols-8 gap-1 p-2 border rounded-md bg-muted/30">
          {COMMON_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={cn(
                'w-8 h-8 text-xl rounded hover:bg-accent transition-colors',
                value === emoji && 'bg-accent ring-2 ring-primary',
              )}
              onClick={() => handleEmojiSelect(emoji)}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
