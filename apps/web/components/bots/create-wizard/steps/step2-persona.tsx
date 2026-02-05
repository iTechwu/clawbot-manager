'use client';

import { useTranslations } from 'next-intl';
import { useWizard } from '../wizard-context';
import { Label, Textarea } from '@repo/ui';

export function Step2Persona() {
  const t = useTranslations('bots.wizard.step2');
  const { state, dispatch } = useWizard();

  const handleSoulChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_SOUL_MARKDOWN', markdown: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">{t('description')}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="soul-markdown">{t('systemPrompt')}</Label>
        <Textarea
          id="soul-markdown"
          value={state.soulMarkdown}
          onChange={handleSoulChange}
          placeholder={t('systemPromptPlaceholder')}
          rows={16}
          className="font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">{t('systemPromptHint')}</p>
      </div>
    </div>
  );
}
