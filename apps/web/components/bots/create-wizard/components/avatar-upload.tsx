'use client';

import * as React from 'react';
import { useRef } from 'react';
import { cn } from '@repo/utils';
import { Button } from '@repo/ui';
import { Camera, X } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface AvatarUploadProps {
  previewUrl: string;
  emoji: string;
  onUpload: (file: File, previewUrl: string) => void;
  onClear: () => void;
  className?: string;
}

export function AvatarUpload({
  previewUrl,
  emoji,
  onUpload,
  onClear,
  className,
}: AvatarUploadProps) {
  const t = useTranslations('wizard.avatar');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    const url = URL.createObjectURL(file);
    onUpload(file, url);
  };

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear();
  };

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <button
        type="button"
        className="relative w-24 h-24 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-colors overflow-hidden group"
        onClick={handleClick}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Avatar preview"
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-4xl">{emoji}</span>
        )}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
          <Camera className="w-5 h-5" />
          <span className="text-xs mt-1">{t('upload')}</span>
        </div>
      </button>
      {previewUrl && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
          className="text-muted-foreground hover:text-destructive"
        >
          <X className="w-4 h-4 mr-1" />
          {t('remove')}
        </Button>
      )}
      <span className="text-xs text-muted-foreground">{t('hint')}</span>
    </div>
  );
}
