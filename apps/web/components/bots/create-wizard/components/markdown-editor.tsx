'use client';

import * as React from 'react';
import { cn } from '@repo/utils';
import { Textarea } from '@repo/ui';
import { useTranslations } from 'next-intl';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder,
  className,
}: MarkdownEditorProps) {
  const t = useTranslations('wizard.markdown');

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between px-3 py-2 border rounded-t-md bg-muted/30">
        <span className="font-mono text-xs font-medium uppercase tracking-wide text-muted-foreground">
          SOUL.md
        </span>
        <span className="text-xs text-muted-foreground">{t('hint')}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('placeholder')}
        spellCheck={false}
        className="min-h-[200px] font-mono text-sm rounded-t-none -mt-2 resize-y"
      />
    </div>
  );
}
