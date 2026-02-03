'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useWizard } from '../wizard-context';
import { usePersonaTemplates } from '@/hooks/usePersonaTemplates';
import { SCRATCH_TEMPLATE } from '@/lib/config';
import { Input, Skeleton } from '@repo/ui';
import { Search, User } from 'lucide-react';
import type { PersonaTemplate } from '@repo/contracts';

function TemplateIcon({ template }: { template: Pick<PersonaTemplate, 'emoji' | 'avatarUrl' | 'name'> }) {
  if (template.emoji) {
    return <span className="text-2xl">{template.emoji}</span>;
  }

  if (template.avatarUrl) {
    return (
      <Image
        src={template.avatarUrl}
        alt={template.name}
        width={32}
        height={32}
        className="size-8 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="bg-muted flex size-8 items-center justify-center rounded-full">
      <User className="text-muted-foreground size-4" />
    </div>
  );
}

export function Step1Templates() {
  const t = useTranslations('bots.wizard.step1');
  const { state, dispatch } = useWizard();
  const [searchQuery, setSearchQuery] = useState('');
  const { templates, loading } = usePersonaTemplates();

  // Localized scratch template
  const localizedScratchTemplate = {
    ...SCRATCH_TEMPLATE,
    name: t('scratchTemplate.name'),
    tagline: t('scratchTemplate.tagline'),
    soulPreview: t('scratchTemplate.soulPreview'),
  };

  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.tagline.toLowerCase().includes(query)
    );
  }, [searchQuery, templates]);

  const handleSelect = (templateId: string, template?: { emoji: string; soulMarkdown: string }) => {
    dispatch({ type: 'SELECT_TEMPLATE', templateId, template });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-1/2 size-4 -translate-y-1/2" />
        <Input
          type="text"
          className="pl-9"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid max-h-[400px] grid-cols-2 gap-3 overflow-y-auto pr-1">
        {/* Scratch Template */}
        <div
          className={`cursor-pointer rounded-lg border p-4 transition-colors ${
            state.selectedTemplateId === 'scratch'
              ? 'border-primary bg-primary/10'
              : 'border-border hover:border-muted-foreground'
          }`}
          onClick={() => handleSelect('scratch', SCRATCH_TEMPLATE)}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{localizedScratchTemplate.emoji}</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{localizedScratchTemplate.name}</div>
              <div className="text-muted-foreground mt-1 text-xs">
                {localizedScratchTemplate.tagline}
              </div>
              {localizedScratchTemplate.soulPreview && (
                <div className="text-muted-foreground mt-2 truncate text-xs italic">
                  {localizedScratchTemplate.soulPreview}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading &&
          [1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="rounded-lg border p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="size-8 rounded" />
                <div className="min-w-0 flex-1">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="mt-1 h-4 w-full" />
                  <Skeleton className="mt-2 h-3 w-3/4" />
                </div>
              </div>
            </div>
          ))}

        {/* API Templates */}
        {!loading &&
          filteredTemplates.map((template) => (
            <div
              key={template.id}
              className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                state.selectedTemplateId === template.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
              onClick={() =>
                handleSelect(template.id, {
                  emoji: template.emoji,
                  soulMarkdown: template.soulMarkdown,
                })
              }
            >
              <div className="flex items-start gap-3">
                <TemplateIcon template={template} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{template.name}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {template.tagline}
                  </div>
                  {template.soulPreview && (
                    <div className="text-muted-foreground mt-2 truncate text-xs italic">
                      {template.soulPreview}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
      </div>

      {!loading && filteredTemplates.length === 0 && searchQuery && (
        <div className="text-muted-foreground py-8 text-center">
          {t('noMatch', { query: searchQuery })}
        </div>
      )}
    </div>
  );
}
