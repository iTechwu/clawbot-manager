'use client';

import { useTranslations } from 'next-intl';
import { useWizard } from '../wizard-context';
import { Label, Textarea } from '@repo/ui';
import { Sparkles } from 'lucide-react';

export function Step2Persona() {
  const t = useTranslations('bots.wizard.step3');
  const { state, dispatch } = useWizard();

  const handleSoulChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_SOUL_MARKDOWN', markdown: e.target.value });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Header */}
      <div className="mb-4 shrink-0 text-center">
        <div className="bg-primary/10 mx-auto mb-2 flex size-10 items-center justify-center rounded-xl">
          <Sparkles className="text-primary size-5" />
        </div>
        <h2 className="text-base font-semibold">{t('title')}</h2>
        <p className="text-muted-foreground mt-0.5 text-xs">
          {t('description')}
        </p>
      </div>

      {/* Content */}
      <div className="min-h-0 flex-1 space-y-2">
        <Label htmlFor="soul-markdown">{t('systemPrompt')}</Label>
        <Textarea
          id="soul-markdown"
          value={state.soulMarkdown}
          onChange={handleSoulChange}
          placeholder={t('systemPromptPlaceholder')}
          className="h-full min-h-[200px] resize-none font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">{t('systemPromptHint')}</p>
      </div>
    </div>
  );
}
