'use client';

import { useTranslations } from 'next-intl';
import { useWizard } from '../wizard-context';
import { getProvider, getModels, getChannel } from '@/lib/config';
import { Input, Label, Badge } from '@repo/ui';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui';
import { Key } from 'lucide-react';
import { useProviderKeys } from '@/hooks/useProviderKeys';

const TTS_VOICES = [
  { id: 'alloy', label: 'Alloy' },
  { id: 'echo', label: 'Echo' },
  { id: 'fable', label: 'Fable' },
  { id: 'onyx', label: 'Onyx' },
  { id: 'nova', label: 'Nova' },
  { id: 'shimmer', label: 'Shimmer' },
];

export function Step4Config() {
  const t = useTranslations('bots.wizard.step4');
  const { state, dispatch } = useWizard();
  const { keys: providerKeys } = useProviderKeys();

  const handleModelChange = (providerId: string, model: string) => {
    dispatch({ type: 'SET_PROVIDER_CONFIG', providerId, config: { model } });
  };

  const handleTokenChange = (channelId: string, token: string) => {
    dispatch({ type: 'SET_CHANNEL_CONFIG', channelId, config: { token } });
  };

  const handleTtsVoiceChange = (voice: string) => {
    dispatch({ type: 'SET_FEATURE', feature: 'ttsVoice', value: voice });
  };

  const handleSandboxTimeoutChange = (timeout: number) => {
    dispatch({ type: 'SET_FEATURE', feature: 'sandboxTimeout', value: timeout });
  };

  // Get display name for a key
  const getKeyDisplayName = (keyId: string) => {
    const key = providerKeys.find((k) => k.id === keyId);
    if (!key) return keyId.slice(0, 8) + '...';
    if (key.label) return key.label;
    if (key.tag) return key.tag;
    return key.id.slice(0, 8) + '...';
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{t('title')}</h3>
        <p className="text-muted-foreground text-sm">
          {t('description')}
        </p>
      </div>

      {/* Provider Configuration */}
      {state.enabledProviders.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-sm font-medium">{t('llmConfig')}</h4>
          {state.enabledProviders.map((providerId) => {
            const provider = getProvider(providerId);
            const models = getModels(providerId);
            const config = state.providerConfigs[providerId] || { model: '' };
            const keyId = config.keyId;

            return (
              <div
                key={providerId}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-muted flex size-10 items-center justify-center rounded-lg text-lg font-semibold">
                      {provider?.label.charAt(0) || '?'}
                    </div>
                    <div>
                      <div className="font-medium">
                        {provider?.label || providerId}
                      </div>
                      {provider?.baseUrl && (
                        <div className="text-muted-foreground text-xs">
                          {provider.baseUrl}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Show selected API Key */}
                  {keyId && (
                    <Badge variant="secondary" className="gap-1.5">
                      <Key className="size-3" />
                      {getKeyDisplayName(keyId)}
                    </Badge>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t('model')}</Label>
                  <Select
                    value={config.model}
                    onValueChange={(value) => handleModelChange(providerId, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('selectModel')} />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label || m.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Channel Configuration */}
      {state.enabledChannels.length > 0 && (
        <section className="space-y-4">
          <h4 className="text-sm font-medium">{t('channelConfig')}</h4>
          {state.enabledChannels.map((channelId) => {
            const channel = getChannel(channelId);
            const config = state.channelConfigs[channelId] || { token: '' };

            return (
              <div
                key={channelId}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg text-lg">
                    {channel?.icon || '?'}
                  </div>
                  <div>
                    <div className="font-medium">
                      {channel?.label || channelId}
                    </div>
                    {channel?.tokenHint && (
                      <div className="text-muted-foreground text-xs">
                        {channel.tokenHint}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('botToken')}</Label>
                  <Input
                    type="password"
                    value={config.token}
                    onChange={(e) => handleTokenChange(channelId, e.target.value)}
                    placeholder={channel?.tokenPlaceholder || 'Token...'}
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Feature Settings */}
      {(state.features.tts || state.features.sandbox) && (
        <section className="space-y-4">
          <h4 className="text-sm font-medium">{t('featureSettings')}</h4>

          {state.features.tts && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex size-10 items-center justify-center rounded-lg text-lg">
                  🔊
                </div>
                <div className="font-medium">{t('tts')}</div>
              </div>
              <div className="space-y-2">
                <Label>{t('voice')}</Label>
                <Select
                  value={state.features.ttsVoice}
                  onValueChange={handleTtsVoiceChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('selectVoice')} />
                  </SelectTrigger>
                  <SelectContent>
                    {TTS_VOICES.map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {state.features.sandbox && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex size-10 items-center justify-center rounded-lg text-lg">
                  📦
                </div>
                <div className="font-medium">{t('sandboxMode')}</div>
              </div>
              <div className="space-y-2">
                <Label>{t('timeout')}</Label>
                <Input
                  type="number"
                  value={state.features.sandboxTimeout}
                  onChange={(e) =>
                    handleSandboxTimeoutChange(parseInt(e.target.value) || 30)
                  }
                  min={5}
                  max={300}
                />
              </div>
            </div>
          )}
        </section>
      )}

      {/* Empty State */}
      {state.enabledProviders.length === 0 &&
        state.enabledChannels.length === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <p>{t('emptyState')}</p>
            <p>{t('emptyStateHint')}</p>
          </div>
        )}
    </div>
  );
}
