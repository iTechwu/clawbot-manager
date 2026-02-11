'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Scale,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  LoadBalanceTarget,
} from '@repo/contracts';
import { LOAD_BALANCE_TEMPLATE_KEYS } from './constants';
import { EnhancedModelSelector } from '../enhanced-model-selector';
import { CostStrategySelector } from '../cost-strategy-selector';

type LoadBalanceStrategy = 'round_robin' | 'weighted' | 'least_latency';

/**
 * Provider info needed for model selection
 */
interface ProviderInfo {
  providerKeyId: string;
  vendor: string;
  label?: string;
  allowedModels: string[];
}

interface LoadBalanceFormProps {
  strategy: LoadBalanceStrategy;
  targets: LoadBalanceTarget[];
  providers: ProviderInfo[];
  onStrategyChange: (strategy: LoadBalanceStrategy) => void;
  onTargetsChange: (targets: LoadBalanceTarget[]) => void;
}

export function LoadBalanceForm({
  strategy,
  targets,
  providers,
  onStrategyChange,
  onTargetsChange,
}: LoadBalanceFormProps) {
  const t = useTranslations('bots.detail.modelRouting');

  const handleAddTarget = () => {
    onTargetsChange([
      ...targets,
      { providerKeyId: '', model: '', weight: 1 },
    ]);
  };

  const handleRemoveTarget = (index: number) => {
    onTargetsChange(targets.filter((_, i) => i !== index));
  };

  const handleTargetChange = (index: number, updates: Partial<LoadBalanceTarget>) => {
    const newTargets = [...targets];
    const currentTarget = newTargets[index];
    if (currentTarget) {
      newTargets[index] = { ...currentTarget, ...updates };
      onTargetsChange(newTargets);
    }
  };

  const handleApplyTemplate = (key: string) => {
    if (key === 'dualEqual') {
      onStrategyChange('round_robin');
      onTargetsChange([
        { providerKeyId: '', model: '', weight: 1 },
        { providerKeyId: '', model: '', weight: 1 },
      ]);
    } else if (key === 'tripleEqual') {
      onStrategyChange('round_robin');
      onTargetsChange([
        { providerKeyId: '', model: '', weight: 1 },
        { providerKeyId: '', model: '', weight: 1 },
        { providerKeyId: '', model: '', weight: 1 },
      ]);
    } else if (key === 'primaryHeavy') {
      onStrategyChange('weighted');
      onTargetsChange([
        { providerKeyId: '', model: '', weight: 70 },
        { providerKeyId: '', model: '', weight: 30 },
      ]);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">{t('loadBalance.title')}</h4>

      {/* Cost Strategy Selector */}
      <div className="p-4 bg-muted/30 rounded-lg space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Scale className="size-4" />
          {t('loadBalance.costOptimization')}
        </div>
        <CostStrategySelector
          value={null}
          onChange={(strategyId) => {
            if (strategyId) {
              toast.info(t('loadBalance.strategySelected', { strategyId }));
            }
          }}
        />
        <p className="text-xs text-muted-foreground">
          {t('loadBalance.costOptimizationHint')}
        </p>
      </div>

      <Separator />

      {/* Strategy */}
      <div className="space-y-2">
        <Label>{t('loadBalance.strategy')}</Label>
        <Select
          value={strategy}
          onValueChange={(v: LoadBalanceStrategy) => onStrategyChange(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="round_robin">
              {t('loadBalance.strategies.round_robin')}
            </SelectItem>
            <SelectItem value="weighted">
              {t('loadBalance.strategies.weighted')}
            </SelectItem>
            <SelectItem value="least_latency">
              {t('loadBalance.strategies.least_latency')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Targets */}
      <div className="space-y-3">
        <Label>{t('loadBalance.targets')}</Label>
        {targets.map((target, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Target {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveTarget(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <EnhancedModelSelector
              providers={providers}
              value={target.providerKeyId && target.model ? target : null}
              onChange={(newTarget) =>
                handleTargetChange(index, { ...newTarget })
              }
              label={t('form.model')}
              showAvailability={true}
            />
            {strategy === 'weighted' && (
              <div className="space-y-2">
                <Label>{t('loadBalance.weight')}</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={target.weight}
                  onChange={(e) =>
                    handleTargetChange(index, {
                      weight: parseInt(e.target.value) || 1,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {t('loadBalance.weightHint')}
                </p>
              </div>
            )}
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddTarget}>
            <Plus className="size-4 mr-2" />
            {t('loadBalance.addTarget')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Sparkles className="size-4 mr-2" />
                {t('loadBalance.quickAdd')}
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              <DropdownMenuLabel>
                {t('loadBalance.templates.title')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {LOAD_BALANCE_TEMPLATE_KEYS.map((key) => (
                <DropdownMenuItem
                  key={key}
                  onClick={() => handleApplyTemplate(key)}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {t(`loadBalance.templates.${key}.name`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t(`loadBalance.templates.${key}.description`)}
                    </span>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}
