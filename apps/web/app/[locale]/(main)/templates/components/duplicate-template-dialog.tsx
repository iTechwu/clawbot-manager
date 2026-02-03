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
} from '@repo/ui';
import type { PersonaTemplate } from '@repo/contracts';

interface DuplicateTemplateDialogProps {
  template: PersonaTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name?: string) => Promise<unknown>;
  loading?: boolean;
}

export function DuplicateTemplateDialog({
  template,
  open,
  onOpenChange,
  onSubmit,
  loading,
}: DuplicateTemplateDialogProps) {
  const t = useTranslations('templates');
  const [name, setName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(name || undefined);
    onOpenChange(false);
    setName('');
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setName('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t('dialog.duplicate.title')}</DialogTitle>
            <DialogDescription>
              {t('dialog.duplicate.description', {
                name: template?.name || '',
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="duplicate-name" className="text-right">
                {t('fields.name')}
              </Label>
              <Input
                id="duplicate-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                placeholder={t('dialog.duplicate.namePlaceholder', {
                  name: template?.name || '',
                })}
                maxLength={255}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t('actions.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t('actions.duplicating') : t('actions.duplicate')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
