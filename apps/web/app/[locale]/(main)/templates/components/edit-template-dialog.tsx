'use client';

import { useEffect, useState } from 'react';
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
import type {
  PersonaTemplate,
  UpdatePersonaTemplateInput,
} from '@repo/contracts';
import { IconSelector } from './icon-selector';

interface EditTemplateDialogProps {
  template: PersonaTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UpdatePersonaTemplateInput) => Promise<unknown>;
  loading?: boolean;
}

interface FormState {
  name?: string;
  emoji?: string | null;
  avatarFileId?: string | null;
  avatarPreviewUrl?: string;
  tagline?: string;
  soulMarkdown?: string;
  soulPreview?: string | null;
}

export function EditTemplateDialog({
  template,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: EditTemplateDialogProps) {
  const t = useTranslations('templates');
  const [formData, setFormData] = useState<FormState>({});

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name,
        emoji: template.emoji,
        avatarFileId: template.avatarFileId,
        avatarPreviewUrl: template.avatarUrl || undefined,
        tagline: template.tagline,
        soulMarkdown: template.soulMarkdown,
        soulPreview: template.soulPreview || '',
      });
    }
  }, [template]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const submitData: UpdatePersonaTemplateInput = {
      name: formData.name,
      tagline: formData.tagline,
      soulMarkdown: formData.soulMarkdown,
      soulPreview: formData.soulPreview,
    };

    // Handle icon changes
    if (formData.avatarFileId) {
      // Using uploaded avatar
      submitData.avatarFileId = formData.avatarFileId;
      submitData.emoji = null; // Clear emoji
    } else if (formData.emoji) {
      // Using emoji
      submitData.emoji = formData.emoji;
      submitData.avatarFileId = null; // Clear avatar
    }

    await onSubmit(submitData);
    onOpenChange(false);
  };

  const handleEmojiChange = (emoji: string) => {
    setFormData({
      ...formData,
      emoji,
      avatarFileId: null,
      avatarPreviewUrl: undefined,
    });
  };

  const handleAvatarChange = (fileId: string, previewUrl: string) => {
    setFormData({
      ...formData,
      avatarFileId: fileId,
      avatarPreviewUrl: previewUrl,
      emoji: null,
    });
  };

  const handleClearIcon = () => {
    setFormData({
      ...formData,
      avatarFileId: null,
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
            <DialogTitle>{t('dialog.edit.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.edit.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="pt-2 text-right">{t('fields.icon')} *</Label>
              <div className="col-span-3">
                <IconSelector
                  emoji={formData.emoji || undefined}
                  avatarFileId={formData.avatarFileId || undefined}
                  avatarPreviewUrl={formData.avatarPreviewUrl}
                  onEmojiChange={handleEmojiChange}
                  onAvatarChange={handleAvatarChange}
                  onClear={handleClearIcon}
                />
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                {t('fields.name')} *
              </Label>
              <Input
                id="edit-name"
                value={formData.name || ''}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="col-span-3"
                required
                maxLength={255}
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-tagline" className="text-right">
                {t('fields.tagline')} *
              </Label>
              <Input
                id="edit-tagline"
                value={formData.tagline || ''}
                onChange={(e) =>
                  setFormData({ ...formData, tagline: e.target.value })
                }
                className="col-span-3"
                required
                maxLength={500}
              />
            </div>
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="edit-soulMarkdown" className="pt-2 text-right">
                {t('fields.soulMarkdown')} *
              </Label>
              <Textarea
                id="edit-soulMarkdown"
                value={formData.soulMarkdown || ''}
                onChange={(e) =>
                  setFormData({ ...formData, soulMarkdown: e.target.value })
                }
                className="col-span-3 min-h-[200px] font-mono text-sm"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-soulPreview" className="text-right">
                {t('fields.soulPreview')}
              </Label>
              <Input
                id="edit-soulPreview"
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
              {loading ? t('actions.saving') : t('actions.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
