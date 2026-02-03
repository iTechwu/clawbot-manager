'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
} from '@repo/ui';
import type { PersonaTemplate } from '@repo/contracts';

interface DeleteTemplateDialogProps {
  template: PersonaTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<unknown>;
  loading?: boolean;
}

export function DeleteTemplateDialog({
  template,
  open,
  onOpenChange,
  onConfirm,
  loading,
}: DeleteTemplateDialogProps) {
  const t = useTranslations('templates');

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('dialog.delete.title')}</DialogTitle>
          <DialogDescription>
            {t('dialog.delete.description', { name: template?.name || '' })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? t('actions.deleting') : t('actions.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
