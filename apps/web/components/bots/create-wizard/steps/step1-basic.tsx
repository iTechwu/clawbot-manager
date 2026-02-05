'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useWizard } from '../wizard-context';
import { usePersonaTemplates } from '@/hooks/usePersonaTemplates';
import { SCRATCH_TEMPLATE } from '@/lib/config';
import { Input, Label, Skeleton } from '@repo/ui';
import { IconSelector } from '@/app/[locale]/(main)/templates/components/icon-selector';
import { Search, User } from 'lucide-react';
import type { PersonaTemplate } from '@repo/contracts';

/**
 * Derive hostname from display name.
 * Converts to lowercase, replaces non-alphanumeric chars with hyphens, trims to 64 chars.
 */
function deriveHostname(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function TemplateIcon({
  template,
}: {
  template: Pick<PersonaTemplate, 'emoji' | 'avatarUrl' | 'name'>;
}) {
  if (template.emoji) {
    return <span className="text-xl">{template.emoji}</span>;
  }

  if (template.avatarUrl) {
    return (
      <Image
        src={template.avatarUrl}
        alt={template.name}
        width={28}
        height={28}
        className="size-7 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="bg-muted flex size-7 items-center justify-center rounded-full">
      <User className="text-muted-foreground size-3.5" />
    </div>
  );
}

export function Step1Basic() {
  const t = useTranslations('bots.wizard.step1');
  const t2 = useTranslations('bots.wizard.step2');
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
        t.tagline.toLowerCase().includes(query),
    );
  }, [searchQuery, templates]);

  const handleSelect = (
    templateId: string,
    template?: { emoji?: string; avatarUrl?: string; soulMarkdown: string },
  ) => {
    dispatch({ type: 'SELECT_TEMPLATE', templateId, template });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    dispatch({ type: 'SET_BOT_NAME', name });
    const derivedHostname = deriveHostname(name);
    dispatch({ type: 'SET_HOSTNAME', hostname: derivedHostname });
  };

  const handleHostnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    dispatch({ type: 'SET_HOSTNAME', hostname: value.slice(0, 64) });
  };

  const handleEmojiChange = (emoji: string) => {
    dispatch({ type: 'SET_EMOJI', emoji });
  };

  const handleAvatarChange = (fileId: string, previewUrl: string) => {
    dispatch({ type: 'SET_AVATAR', fileId, previewUrl });
  };

  const handleClearIcon = () => {
    dispatch({ type: 'CLEAR_AVATAR' });
  };

  return (
    <div className="space-y-6">
      {/* Basic Info Section */}
      <div className="space-y-4">
        <div className="grid grid-cols-[120px_1fr] gap-4">
          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>{t2('avatar')}</Label>
            <IconSelector
              emoji={state.emoji || undefined}
              avatarFileId={state.avatarFileId || undefined}
              avatarPreviewUrl={state.avatarPreviewUrl || undefined}
              onEmojiChange={handleEmojiChange}
              onAvatarChange={handleAvatarChange}
              onClear={handleClearIcon}
            />
          </div>

          {/* Name and Hostname */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="bot-name">{t2('botName')}</Label>
              <Input
                id="bot-name"
                type="text"
                value={state.botName}
                onChange={handleNameChange}
                placeholder={t2('botNamePlaceholder')}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hostname">{t2('hostname')}</Label>
              <Input
                id="hostname"
                type="text"
                value={state.hostname}
                onChange={handleHostnameChange}
                placeholder={t2('hostnamePlaceholder')}
              />
              <p className="text-muted-foreground text-xs">
                {t2('hostnameHint')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Template Selection Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>{t('title')}</Label>
          <div className="relative w-48">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2" />
            <Input
              type="text"
              className="h-8 pl-8 text-sm"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="grid max-h-[200px] grid-cols-3 gap-2 overflow-y-auto pr-1">
          {/* Scratch Template */}
          <div
            className={`cursor-pointer rounded-lg border p-3 transition-colors ${
              state.selectedTemplateId === 'scratch'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-muted-foreground'
            }`}
            onClick={() => handleSelect('scratch', SCRATCH_TEMPLATE)}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{localizedScratchTemplate.emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {localizedScratchTemplate.name}
                </div>
                <div className="text-muted-foreground truncate text-xs">
                  {localizedScratchTemplate.tagline}
                </div>
              </div>
            </div>
          </div>

          {/* Loading Skeletons */}
          {loading &&
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="size-7 rounded" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="mt-1 h-3 w-full" />
                  </div>
                </div>
              </div>
            ))}

          {/* API Templates */}
          {!loading &&
            filteredTemplates.map((template) => (
              <div
                key={template.id}
                className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                  state.selectedTemplateId === template.id
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
                onClick={() =>
                  handleSelect(template.id, {
                    emoji: template.emoji ?? undefined,
                    avatarUrl: template.avatarUrl ?? undefined,
                    soulMarkdown: template.soulMarkdown,
                  })
                }
              >
                <div className="flex items-center gap-2">
                  <TemplateIcon template={template} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {template.name}
                    </div>
                    <div className="text-muted-foreground truncate text-xs">
                      {template.tagline}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {!loading && filteredTemplates.length === 0 && searchQuery && (
          <div className="text-muted-foreground py-4 text-center text-sm">
            {t('noMatch', { query: searchQuery })}
          </div>
        )}
      </div>
    </div>
  );
}
