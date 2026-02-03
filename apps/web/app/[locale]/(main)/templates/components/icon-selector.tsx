'use client';

import * as React from 'react';
import { useRef, useState, useEffect } from 'react';
import { cn } from '@repo/utils';
import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui';
import { Camera, X, Upload } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { uploadAvatar } from '@/lib/api/avatar-upload';

type IconType = 'emoji' | 'upload';

interface IconSelectorProps {
  emoji?: string;
  avatarFileId?: string;
  avatarPreviewUrl?: string;
  onEmojiChange: (emoji: string) => void;
  onAvatarChange: (fileId: string, previewUrl: string) => void;
  onClear: () => void;
  className?: string;
}

export function IconSelector({
  emoji,
  avatarFileId,
  avatarPreviewUrl,
  onEmojiChange,
  onAvatarChange,
  onClear,
  className,
}: IconSelectorProps) {
  const t = useTranslations('templates');
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Track selected tab independently
  const [selectedTab, setSelectedTab] = useState<IconType>(
    avatarFileId ? 'upload' : 'emoji'
  );

  // Sync tab with props when they change externally
  useEffect(() => {
    if (avatarFileId) {
      setSelectedTab('upload');
    } else if (emoji) {
      setSelectedTab('emoji');
    }
  }, [avatarFileId, emoji]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);
      const result = await uploadAvatar(file, setUploadProgress);
      onAvatarChange(result.fileId, result.url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleUploadClick = () => {
    inputRef.current?.click();
  };

  const handleClearAvatar = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inputRef.current) {
      inputRef.current.value = '';
    }
    onClear();
  };

  const handleTabChange = (value: string) => {
    setSelectedTab(value as IconType);
    if (value === 'emoji' && avatarFileId) {
      // Switching to emoji, clear avatar
      onClear();
      onEmojiChange(emoji || '🤖');
    }
  };

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <Tabs
        value={selectedTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="emoji">{t('icon.emoji')}</TabsTrigger>
          <TabsTrigger value="upload">{t('icon.upload')}</TabsTrigger>
        </TabsList>

        <TabsContent value="emoji" className="mt-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 text-3xl">
              {emoji || '🤖'}
            </div>
            <Input
              value={emoji || ''}
              onChange={(e) => onEmojiChange(e.target.value)}
              className="w-24 text-center text-xl"
              maxLength={10}
              placeholder="🤖"
            />
            <span className="text-xs text-muted-foreground">
              {t('icon.emojiHint')}
            </span>
          </div>
        </TabsContent>

        <TabsContent value="upload" className="mt-3">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-muted-foreground/30 transition-colors hover:border-primary/50 group"
              onClick={handleUploadClick}
              disabled={uploading}
            >
              {avatarPreviewUrl ? (
                <img
                  src={avatarPreviewUrl}
                  alt="Icon preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Upload className="h-6 w-6 text-muted-foreground" />
              )}
              {!uploading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4" />
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <span className="text-xs text-white">{uploadProgress}%</span>
                </div>
              )}
            </button>
            {avatarPreviewUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearAvatar}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="mr-1 h-4 w-4" />
                {t('icon.remove')}
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                {t('icon.uploadHint')}
              </span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
