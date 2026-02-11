'use client';

import { useTranslations } from 'next-intl';
import {
  Button,
  Badge,
  Switch,
} from '@repo/ui';
import {
  Trash2,
  Edit,
  Route,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { BotModelRouting } from '@repo/contracts';
import { ROUTING_TYPE_ICONS, type RoutingType } from './constants';

interface RoutingListProps {
  routings: BotModelRouting[];
  expandedId: string | null;
  actionLoading: boolean;
  onToggleExpand: (id: string) => void;
  onToggleEnabled: (routing: BotModelRouting) => void;
  onEdit: (routing: BotModelRouting) => void;
  onDelete: (routingId: string) => void;
}

export function RoutingList({
  routings,
  expandedId,
  actionLoading,
  onToggleExpand,
  onToggleEnabled,
  onEdit,
  onDelete,
}: RoutingListProps) {
  const t = useTranslations('bots.detail.modelRouting');

  if (routings.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {routings.map((routing) => (
        <div
          key={routing.id}
          className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                {ROUTING_TYPE_ICONS[routing.routingType as RoutingType]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{routing.name}</span>
                  <Badge
                    variant={routing.isEnabled ? 'default' : 'secondary'}
                  >
                    {routing.isEnabled ? t('enabled') : t('disabled')}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t(`types.${routing.routingType}`)} · {t('priority')}:{' '}
                  {routing.priority}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={routing.isEnabled}
                onCheckedChange={() => onToggleEnabled(routing)}
                disabled={actionLoading}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onToggleExpand(routing.id)}
              >
                {expandedId === routing.id ? (
                  <ChevronUp className="size-4" />
                ) : (
                  <ChevronDown className="size-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(routing)}
              >
                <Edit className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(routing.id)}
                disabled={actionLoading}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
          {expandedId === routing.id && (
            <div className="mt-4 pt-4 border-t">
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {JSON.stringify(routing.config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

interface EmptyRoutingListProps {
  onAddFirst: () => void;
}

export function EmptyRoutingList({ onAddFirst }: EmptyRoutingListProps) {
  const t = useTranslations('bots.detail.modelRouting');

  return (
    <div className="text-center py-8">
      <Route className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
      <p className="text-muted-foreground mb-4">{t('noRoutings')}</p>
      <Button onClick={onAddFirst} variant="outline">
        {t('addFirst')}
      </Button>
    </div>
  );
}
