'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Badge,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  FunctionRouteRule,
  RoutingTarget,
} from '@repo/contracts';
import {
  PREDEFINED_INTENT_KEYS,
  SCENARIO_MODEL_RECOMMENDATIONS,
} from './constants';
import { EnhancedModelSelector } from '../enhanced-model-selector';

/**
 * Provider info needed for model selection
 */
interface ProviderInfo {
  providerKeyId: string;
  vendor: string;
  label?: string;
  allowedModels: string[];
}

interface FunctionRouteFormProps {
  rules: FunctionRouteRule[];
  defaultTarget: RoutingTarget;
  providers: ProviderInfo[];
  selectedScenario: string | null;
  onRulesChange: (rules: FunctionRouteRule[]) => void;
  onDefaultTargetChange: (target: RoutingTarget) => void;
  onScenarioChange: (scenario: string | null) => void;
}

export function FunctionRouteForm({
  rules,
  defaultTarget,
  providers,
  selectedScenario,
  onRulesChange,
  onDefaultTargetChange,
  onScenarioChange,
}: FunctionRouteFormProps) {
  const t = useTranslations('bots.detail.modelRouting');

  // Get all providers that have a specific model
  const getProvidersForModel = useCallback(
    (modelId: string): ProviderInfo[] => {
      return providers.filter((p) => p.allowedModels.includes(modelId));
    },
    [providers],
  );

  // Apply a recommended model to the last rule
  const applyRecommendedModel = useCallback(
    (model: string, modelProviders: ProviderInfo[]) => {
      if (modelProviders.length === 0) {
        toast.error(
          t('functionRoute.recommendedModels.notAvailable', { model }),
        );
        return;
      }

      if (rules.length === 0) {
        toast.error(t('functionRoute.recommendedModels.noRuleToApply'));
        return;
      }

      const lastRuleIndex = rules.length - 1;
      const lastRule = rules[lastRuleIndex];
      if (!lastRule) return;

      // Use the first available provider
      const provider = modelProviders[0];
      if (!provider) return;

      const newRules = [...rules];
      newRules[lastRuleIndex] = {
        pattern: lastRule.pattern,
        matchType: lastRule.matchType,
        target: {
          providerKeyId: provider.providerKeyId,
          model,
        },
      };
      onRulesChange(newRules);

      const providerInfo =
        modelProviders.length > 1 ? ` (${provider.label || provider.vendor})` : '';
      toast.success(
        t('functionRoute.recommendedModels.applied', {
          model: model + providerInfo,
        }),
      );
    },
    [rules, onRulesChange, t],
  );

  const handleAddRule = () => {
    onRulesChange([
      ...rules,
      {
        pattern: '',
        matchType: 'keyword',
        target: { providerKeyId: '', model: '' },
      },
    ]);
  };

  const handleRemoveRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  const handleRuleChange = (index: number, updates: Partial<FunctionRouteRule>) => {
    const newRules = [...rules];
    const currentRule = newRules[index];
    if (currentRule) {
      newRules[index] = { ...currentRule, ...updates };
      onRulesChange(newRules);
    }
  };

  const handleQuickAddIntent = (key: string) => {
    const pattern = t(`functionRoute.predefinedIntents.${key}.pattern`);
    onRulesChange([
      ...rules,
      {
        pattern,
        matchType: 'keyword',
        target: { providerKeyId: '', model: '' },
      },
    ]);
    onScenarioChange(key);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium">{t('functionRoute.title')}</h4>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Rule {index + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveRule(index)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t('functionRoute.pattern')}</Label>
                <Input
                  value={rule.pattern}
                  onChange={(e) =>
                    handleRuleChange(index, { pattern: e.target.value })
                  }
                  placeholder={t('functionRoute.patternPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('functionRoute.matchType')}</Label>
                <Select
                  value={rule.matchType}
                  onValueChange={(value: 'keyword' | 'regex' | 'intent') =>
                    handleRuleChange(index, { matchType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keyword">
                      {t('functionRoute.matchTypes.keyword')}
                    </SelectItem>
                    <SelectItem value="regex">
                      {t('functionRoute.matchTypes.regex')}
                    </SelectItem>
                    <SelectItem value="intent">
                      {t('functionRoute.matchTypes.intent')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <EnhancedModelSelector
              providers={providers}
              value={rule.target.providerKeyId && rule.target.model ? rule.target : null}
              onChange={(target) => handleRuleChange(index, { target })}
              label={t('functionRoute.target')}
              showAvailability={true}
            />
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" onClick={handleAddRule}>
            <Plus className="size-4 mr-2" />
            {t('functionRoute.addRule')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Sparkles className="size-4 mr-2" />
                {t('functionRoute.quickAdd')}
                <ChevronDown className="size-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-96 max-h-[400px] overflow-y-auto"
            >
              <DropdownMenuLabel>
                {t('functionRoute.predefinedIntents.title')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {PREDEFINED_INTENT_KEYS.map((key) => {
                const recommendations = SCENARIO_MODEL_RECOMMENDATIONS[key];
                return (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => handleQuickAddIntent(key)}
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {t(`functionRoute.predefinedIntents.${key}.name`)}
                        </span>
                        {(key === 'video' || key === 'audio' || key === '3d') && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1 py-0"
                          >
                            {key === 'video'
                              ? 'Video'
                              : key === 'audio'
                                ? 'Audio'
                                : '3D'}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {t(`functionRoute.predefinedIntents.${key}.description`)}
                      </span>
                      {recommendations && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {recommendations.primary.slice(0, 3).map((model) => (
                            <Badge
                              key={model}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 bg-primary/5"
                            >
                              {model}
                            </Badge>
                          ))}
                          {recommendations.primary.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-1.5 py-0"
                            >
                              +{recommendations.primary.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Model Recommendations Panel */}
        {selectedScenario && SCENARIO_MODEL_RECOMMENDATIONS[selectedScenario] && (
          <ModelRecommendationsPanel
            scenario={selectedScenario}
            recommendations={SCENARIO_MODEL_RECOMMENDATIONS[selectedScenario]}
            getProvidersForModel={getProvidersForModel}
            onApplyModel={applyRecommendedModel}
            onDismiss={() => onScenarioChange(null)}
          />
        )}
      </div>

      {/* Default Target */}
      <div className="border-t pt-4">
        <EnhancedModelSelector
          providers={providers}
          value={defaultTarget.providerKeyId && defaultTarget.model ? defaultTarget : null}
          onChange={onDefaultTargetChange}
          label={t('functionRoute.defaultTarget')}
          showAvailability={true}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {t('functionRoute.defaultTargetHint')}
        </p>
      </div>
    </div>
  );
}

interface ModelRecommendationsPanelProps {
  scenario: string;
  recommendations: { primary: string[]; alternatives: string[] };
  getProvidersForModel: (modelId: string) => ProviderInfo[];
  onApplyModel: (model: string, providers: ProviderInfo[]) => void;
  onDismiss: () => void;
}

function ModelRecommendationsPanel({
  scenario,
  recommendations,
  getProvidersForModel,
  onApplyModel,
  onDismiss,
}: ModelRecommendationsPanelProps) {
  const t = useTranslations('bots.detail.modelRouting');

  return (
    <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" />
          <span className="font-medium text-sm">
            {t('functionRoute.recommendedModels.title', {
              scenario: t(`functionRoute.predefinedIntents.${scenario}.name`),
            })}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs"
          onClick={onDismiss}
        >
          {t('functionRoute.recommendedModels.dismiss')}
        </Button>
      </div>
      <div className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {t('functionRoute.recommendedModels.primary')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recommendations.primary.map((model) => {
              const modelProviders = getProvidersForModel(model);
              const isAvailable = modelProviders.length > 0;
              return (
                <Badge
                  key={model}
                  variant={isAvailable ? 'default' : 'secondary'}
                  className={`text-xs ${
                    isAvailable
                      ? 'cursor-pointer hover:bg-primary/80'
                      : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => {
                    if (isAvailable) {
                      onApplyModel(model, modelProviders);
                    } else {
                      toast.error(
                        t('functionRoute.recommendedModels.notAvailable', { model }),
                      );
                    }
                  }}
                >
                  {model}
                  {isAvailable && modelProviders.length > 1 && (
                    <span className="ml-1 text-[10px] opacity-70">
                      ({modelProviders.length})
                    </span>
                  )}
                  {!isAvailable && <span className="ml-1 text-[10px]">✗</span>}
                </Badge>
              );
            })}
          </div>
        </div>
        {recommendations.alternatives.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              {t('functionRoute.recommendedModels.alternatives')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommendations.alternatives.map((model) => {
                const modelProviders = getProvidersForModel(model);
                const isAvailable = modelProviders.length > 0;
                return (
                  <Badge
                    key={model}
                    variant="outline"
                    className={`text-xs ${
                      isAvailable
                        ? 'cursor-pointer hover:bg-muted'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => {
                      if (isAvailable) {
                        onApplyModel(model, modelProviders);
                      } else {
                        toast.error(
                          t('functionRoute.recommendedModels.notAvailable', { model }),
                        );
                      }
                    }}
                  >
                    {model}
                    {isAvailable && modelProviders.length > 1 && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({modelProviders.length})
                      </span>
                    )}
                    {!isAvailable && <span className="ml-1 text-[10px]">✗</span>}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground mt-3 flex items-center gap-1">
        <Info className="size-3" />
        {t('functionRoute.recommendedModels.availabilityHint')}
      </p>
    </div>
  );
}
