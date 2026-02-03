'use client';

import { useTranslations } from 'next-intl';
import { useWizard } from '../wizard-context';
import { Input, Label, Textarea } from '@repo/ui';

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

export function Step2Personality() {
  const t = useTranslations('bots.wizard.step2');
  const { state, dispatch } = useWizard();

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    dispatch({ type: 'SET_BOT_NAME', name });
    // Auto-derive hostname from name (user can override)
    const derivedHostname = deriveHostname(name);
    dispatch({ type: 'SET_HOSTNAME', hostname: derivedHostname });
  };

  const handleHostnameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    dispatch({ type: 'SET_HOSTNAME', hostname: value.slice(0, 64) });
  };

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({ type: 'SET_EMOJI', emoji: e.target.value });
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    dispatch({
      type: 'SET_AVATAR',
      file: null,
      previewUrl: e.target.value,
    });
  };

  const handleSoulChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    dispatch({ type: 'SET_SOUL_MARKDOWN', markdown: e.target.value });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      <div className="grid grid-cols-[120px_1fr] gap-6">
        {/* Avatar Column */}
        <div className="space-y-3">
          <Label>{t('avatar')}</Label>
          <div className="bg-muted flex size-24 items-center justify-center rounded-lg border">
            {state.avatarPreviewUrl ? (
              <img
                src={state.avatarPreviewUrl}
                alt="Avatar"
                className="size-full rounded-lg object-cover"
              />
            ) : (
              <span className="text-4xl">{state.emoji}</span>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="emoji" className="text-xs">
              {t('emoji')}
            </Label>
            <Input
              id="emoji"
              type="text"
              value={state.emoji}
              onChange={handleEmojiChange}
              placeholder="🤖"
              maxLength={2}
              className="h-8 text-center"
            />
          </div>
        </div>

        {/* Fields Column */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bot-name">{t('botName')}</Label>
            <Input
              id="bot-name"
              type="text"
              value={state.botName}
              onChange={handleNameChange}
              placeholder={t('botNamePlaceholder')}
              autoFocus
            />
            <p className="text-muted-foreground text-xs">
              {t('botNameHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hostname">{t('hostname')}</Label>
            <Input
              id="hostname"
              type="text"
              value={state.hostname}
              onChange={handleHostnameChange}
              placeholder={t('hostnamePlaceholder')}
            />
            <p className="text-muted-foreground text-xs">
              {t('hostnameHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="avatar-url">{t('avatarUrl')}</Label>
            <Input
              id="avatar-url"
              type="url"
              value={state.avatarPreviewUrl}
              onChange={handleAvatarUrlChange}
              placeholder={t('avatarUrlPlaceholder')}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="soul-markdown">{t('systemPrompt')}</Label>
        <Textarea
          id="soul-markdown"
          value={state.soulMarkdown}
          onChange={handleSoulChange}
          placeholder={t('systemPromptPlaceholder')}
          rows={12}
          className="font-mono text-sm"
        />
        <p className="text-muted-foreground text-xs">
          {t('systemPromptHint')}
        </p>
      </div>
    </div>
  );
}
