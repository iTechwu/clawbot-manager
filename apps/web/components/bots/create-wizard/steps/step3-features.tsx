'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useWizard } from '../wizard-context';
import { PROVIDERS, POPULAR_CHANNELS, OTHER_CHANNELS } from '@/lib/config';
import type { SessionScope } from '@repo/contracts';
import { Input, Badge } from '@repo/ui';
import { ChevronDown, ChevronUp } from 'lucide-react';

const POPULAR_PROVIDERS = ['openai', 'anthropic', 'venice'];

export function Step3Features() {
  const t = useTranslations('bots.wizard.step3');
  const { state, dispatch } = useWizard();
  const [showAllProviders, setShowAllProviders] = useState(false);
  const [showAllChannels, setShowAllChannels] = useState(false);

  const popularProviders = PROVIDERS.filter((p) =>
    POPULAR_PROVIDERS.includes(p.id)
  );
  const otherProviders = PROVIDERS.filter(
    (p) => !POPULAR_PROVIDERS.includes(p.id)
  );

  const handleProviderToggle = (providerId: string) => {
    dispatch({ type: 'TOGGLE_PROVIDER', providerId });
  };

  const handleChannelToggle = (channelId: string) => {
    dispatch({ type: 'TOGGLE_CHANNEL', channelId });
  };

  const handleFeatureChange = (
    feature: 'commands' | 'tts' | 'sandbox',
    value: boolean
  ) => {
    dispatch({ type: 'SET_FEATURE', feature, value });
  };

  const handleSessionScopeChange = (scope: SessionScope) => {
    dispatch({ type: 'SET_FEATURE', feature: 'sessionScope', value: scope });
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Parse comma-separated tags, trim whitespace
    const tags = value
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0 && /^[a-z0-9-]+$/.test(t));
    dispatch({ type: 'SET_ROUTING_TAGS', tags });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      {/* LLM Providers */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">{t('llmProviders')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {popularProviders.map((provider) => (
            <label
              key={provider.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                state.enabledProviders.includes(provider.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={state.enabledProviders.includes(provider.id)}
                onChange={() => handleProviderToggle(provider.id)}
                className="size-4 rounded border-gray-300"
              />
              <span className="text-sm">{provider.label}</span>
            </label>
          ))}
        </div>
        {otherProviders.length > 0 && (
          <>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
              onClick={() => setShowAllProviders(!showAllProviders)}
            >
              {showAllProviders ? (
                <>
                  <ChevronUp className="size-4" />
                  {t('showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  {t('showAll', { count: otherProviders.length })}
                </>
              )}
            </button>
            {showAllProviders && (
              <div className="grid grid-cols-3 gap-2">
                {otherProviders.map((provider) => (
                  <label
                    key={provider.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                      state.enabledProviders.includes(provider.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.enabledProviders.includes(provider.id)}
                      onChange={() => handleProviderToggle(provider.id)}
                      className="size-4 rounded border-gray-300"
                    />
                    <span className="text-sm">{provider.label}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Channels */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">{t('channels')}</h4>
        <div className="grid grid-cols-3 gap-2">
          {POPULAR_CHANNELS.map((channel) => (
            <label
              key={channel.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 transition-colors ${
                state.enabledChannels.includes(channel.id)
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-muted-foreground'
              }`}
            >
              <input
                type="checkbox"
                checked={state.enabledChannels.includes(channel.id)}
                onChange={() => handleChannelToggle(channel.id)}
                className="size-4 rounded border-gray-300"
              />
              <span className="mr-1">{channel.icon}</span>
              <span className="text-sm">{channel.label}</span>
            </label>
          ))}
        </div>
        {OTHER_CHANNELS.length > 0 && (
          <>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm"
              onClick={() => setShowAllChannels(!showAllChannels)}
            >
              {showAllChannels ? (
                <>
                  <ChevronUp className="size-4" />
                  {t('showLess')}
                </>
              ) : (
                <>
                  <ChevronDown className="size-4" />
                  {t('showAll', { count: OTHER_CHANNELS.length })}
                </>
              )}
            </button>
            {showAllChannels && (
              <div className="grid grid-cols-4 gap-2">
                {OTHER_CHANNELS.map((channel) => (
                  <label
                    key={channel.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors ${
                      state.enabledChannels.includes(channel.id)
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-muted-foreground'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={state.enabledChannels.includes(channel.id)}
                      onChange={() => handleChannelToggle(channel.id)}
                      className="size-3 rounded border-gray-300"
                    />
                    <span className="text-xs">{channel.icon}</span>
                    <span className="truncate text-xs">{channel.label}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* Features */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">{t('features')}</h4>
        <div className="grid grid-cols-3 gap-2">
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={state.features.commands}
              onChange={(e) => handleFeatureChange('commands', e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <div>
              <div className="text-sm">{t('commands')}</div>
              <div className="text-muted-foreground text-xs">
                {t('commandsDesc')}
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={state.features.tts}
              onChange={(e) => handleFeatureChange('tts', e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <div>
              <div className="text-sm">{t('tts')}</div>
              <div className="text-muted-foreground text-xs">
                {t('ttsDesc')}
              </div>
            </div>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border p-3">
            <input
              type="checkbox"
              checked={state.features.sandbox}
              onChange={(e) => handleFeatureChange('sandbox', e.target.checked)}
              className="size-4 rounded border-gray-300"
            />
            <div>
              <div className="text-sm">{t('sandbox')}</div>
              <div className="text-muted-foreground text-xs">
                {t('sandboxDesc')}
              </div>
            </div>
          </label>
        </div>
      </section>

      {/* Session Scope */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">{t('sessionScope')}</h4>
        <div className="flex gap-4">
          {(['user', 'channel', 'global'] as SessionScope[]).map((scope) => (
            <label key={scope} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="sessionScope"
                value={scope}
                checked={state.features.sessionScope === scope}
                onChange={() => handleSessionScopeChange(scope)}
                className="size-4"
              />
              <span className="text-sm">{t(`sessionScopes.${scope}`)}</span>
            </label>
          ))}
        </div>
      </section>

      {/* API Routing Tags */}
      <section className="space-y-3">
        <h4 className="text-sm font-medium">{t('routingTags')}</h4>
        <div className="space-y-2">
          <Input
            type="text"
            placeholder={t('routingTagsPlaceholder')}
            defaultValue={state.routingTags.join(', ')}
            onChange={handleTagsChange}
          />
          <p className="text-muted-foreground text-xs">
            {t('routingTagsHint')}
          </p>
          {state.routingTags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {state.routingTags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
