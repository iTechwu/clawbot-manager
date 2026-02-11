'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Input,
  Label,
  Separator,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@repo/ui';
import {
  Plus,
  Trash2,
  ChevronDown,
  Sparkles,
  Shield,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  RoutingTarget,
} from '@repo/contracts';
import { FAILOVER_TEMPLATE_KEYS } from './constants';
import { EnhancedModelSelector } from '../enhanced-model-selector';
import { FallbackChainSelector } from '../fallback-chain-selector';

/**
 * Provider info needed for model selection
 */
interface ProviderInfo {
  providerKeyId: string;
  vendor: string;
  label?: string;
  allowedModels: string[];
}

interface FailoverFormProps {
  primary: RoutingTarget;
  fallbackChain: RoutingTarget[];
  retryMaxAttempts: number;
  retryDelayMs: number;
  providers: ProviderInfo[];
  onPrimaryChange: (target: RoutingTarget) => void;
  onFallbackChainChange: (chain: RoutingTarget[]) => void;
  onRetryMaxAttemptsChange: (value: number) => void;
  onRetryDelayMsChange: (value: number) => void;
}

export function FailoverForm({
  primary,
  fallbackChain,
  retryMaxAttempts,
  retryDelayMs,
  providers,
  onPrimaryChange,
  onFallbackChainChange,
  onRetryMaxAttemptsChange,
  onRetryDelayMsChange,
}: FailoverFormProps) {
  const t = useTranslations('bots.detail.modelRouting');

  const handleAddFallback = () => {
    onFallbackChainChange([
      ...fallbackChain,
      { providerKeyId: '', model: '' },
    ]);
  };

  const handleRemoveFallback = (index: number) => {
    onFallbackChainChange(fallbackChain.filter((_, i) => i !== index));
  };

  const handleFallbackChange = (index: number, target: RoutingTarget) => {
    const newChain = [...fallbackChain];
    newChain[index] = target;
    onFallbackChainChange(newChain);
  };

  const handleApplyTemplate = (key: string) => {
    const fallbackCount =
      key === 'singleFallback' ? 1 : key === 'doubleFallback' ? 2 : 3;
    const newChain = Array.from({ length: fallbackCount }, () => ({
      providerKeyId: '',
      model: '',
    }));
    onFallbackChainChange(newChain);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">{t('failover.title')}</h4>

      {/* Option to use existing FallbackChain */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Shield className="size-4" />
          {t('failover.useExistingChain')}
        </div>
        <FallbackChainSelector
          value={null}
          onChange={(chainId) => {
            if (chainId) {
              toast.info(t('failover.chainSelected', { chainId }));
            }
          }}
          providers={providers}
        />
        <p className="text-xs text-muted-foreground">
          {t('failover.useExistingChainHint')}
        </p>
      </div>

      <Separator />

      <p className="text-sm text-muted-foreground">
        {t('failover.orConfigureManually')}
      </p>

      {/* Primary */}
      <EnhancedModelSelector
        providers={providers}
        value={primary.providerKeyId && primary.model ? primary : null}
        onChange={onPrimaryChange}
        label={t('failover.primary')}
        showAvailability={true}
      />

      {/* Fallback Chain */}
      <div className="space-y-3">
        <Label>{t('failover.fallbackChain')}</Label>
        {fallbackChain.map((target, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Fallback {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveFallback(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <EnhancedModelSelector
              providers={providers}
              value={target.providerKeyId && target.model ? target : null}
              onChange={(newTarget) => handleFallbackChange(index, newTarget)}
              label={t('form.model')}
              showAvailability={true}
            />
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddFallback}>
            <Plus className="size-4 mr-2" />
            {t('failover.addFallback')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Sparkles className="size-4 mr-2" />
                {t('failover.quickAdd')}
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>
                {t('failover.templates.title')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FAILOVER_TEMPLATE_KEYS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleApplyTemplate(key)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t(`failover.templates.${key}.name`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(`failover.templates.${key}.description`)}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Retry Config */}
      <div className="border-t pt-4">
        <h5 className="font-medium mb-3">{t('failover.retry')}</h5>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('failover.maxAttempts')}</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={retryMaxAttempts}
              onChange={(e) =>
                onRetryMaxAttemptsChange(parseInt(e.target.value) || 3)
              }
            />
          </div>
          <div className="space-y-2">
            <Label>{t('failover.delayMs')}</Label>
            <Input
              type="number"
              min={100}
              max={10000}
              value={retryDelayMs}
              onChange={(e) =>
                onRetryDelayMsChange(parseInt(e.target.value) || 1000)
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
