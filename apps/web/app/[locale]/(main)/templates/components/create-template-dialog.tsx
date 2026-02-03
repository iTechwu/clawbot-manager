'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Textarea,
} from '@repo/ui';
import type { CreatePersonaTemplateInput } from '@repo/contracts';
import { IconSelector } from './icon-selector';

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePersonaTemplateInput) => Promise<unknown>;
  loading?: boolean;
}

interface FormState {
  name: string;
  emoji?: string;
  avatarFileId?: string;
  avatarPreviewUrl?: string;
  tagline: string;
  soulMarkdown: string;
  soulPreview?: string;
}

const initialFormState: FormState = {
  name: '',
  emoji: '🤖',
  avatarFileId: undefined,
  avatarPreviewUrl: undefined,
  tagline: '',
  soulMarkdown: '',
  soulPreview: '',
};

export function CreateTemplateDialog({
  open,
  onOpenChange,
  onSubmit,
  loading,
}: CreateTemplateDialogProps) {
  const t = useTranslations('templates');
  const [formData, setFormData] = useState<FormState>(initialFormState);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: CreatePersonaTemplateInput = {
      name: formData.name,
      tagline: formData.tagline,
      soulMarkdown: formData.soulMarkdown,
      soulPreview: formData.soulPreview || undefined,
    };

    // Set either emoji or avatarFileId
    if (formData.avatarFileId) {
      submitData.avatarFileId = formData.avatarFileId;
    } else {
      submitData.emoji = formData.emoji || '🤖';
    }

    await onSubmit(submitData);
    onOpenChange(false);
    setFormData(initialFormState);
  };

  const handleEmojiChange = (emoji: string) => {
    setFormData({
      ...formData,
      emoji,
      avatarFileId: undefined,
      avatarPreviewUrl: undefined,
    });
  };

  const handleAvatarChange = (fileId: string, previewUrl: string) => {
    setFormData({
      ...formData,
      avatarFileId: fileId,
      avatarPreviewUrl: previewUrl,
      emoji: undefined,
    });
  };

  const handleClearIcon = () => {
    setFormData({
      ...formData,
      avatarFileId: undefined,
      avatarPreviewUrl: undefined,
      emoji: '🤖',
    });
  };

  // Validate: must have either emoji or avatarFileId
  const isIconValid = !!(formData.emoji || formData.avatarFileId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('dialog.create.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.create.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="pt-2 text-right">{t('fields.icon')} *</Label>
              <div className="col-span-3">
                <IconSelector
                  emoji={formData.emoji}
                  avatarFileId={formData.avatarFileId}
                  avatarPreviewUrl={formData.avatarPreviewUrl}
                  onEmojiChange={handleEmojiChange}
                  onAvatarChange={handleAvatarChange}
                  onClear={handleClearIcon}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                {t('fields.name')} *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                required
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tagline" className="text-right">
                {t('fields.tagline')} *
              </Label>
              <Input
                id="tagline"
                value={formData.tagline}
                onChange={(e) =>
                  setFormData({ ...formData, tagline: e.target.value })
                }
                className="col-span-3"
                required
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="soulMarkdown" className="pt-2 text-right">
                {t('fields.soulMarkdown')} *
              </Label>
              <Textarea
                id="soulMarkdown"
                value={formData.soulMarkdown}
                onChange={(e) =>
                  setFormData({ ...formData, soulMarkdown: e.target.value })
                }
                className="col-span-3 min-h-[200px] font-mono text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="soulPreview" className="text-right">
                {t('fields.soulPreview')}
              </Label>
              <Input
                id="soulPreview"
                value={formData.soulPreview || ''}
                onChange={(e) =>
                  setFormData({ ...formData, soulPreview: e.target.value })
                }
                className="col-span-3"
                maxLength={500}
                placeholder={t('fields.soulPreviewPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading || !isIconValid}>
              {loading ? t('actions.creating') : t('actions.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
