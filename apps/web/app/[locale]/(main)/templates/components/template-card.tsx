'use client';

import { useTranslations } from 'next-intl';
import { Copy, Edit, MoreVertical, Trash2, User } from 'lucide-react';
import Image from 'next/image';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Skeleton,
} from '@repo/ui';
import type { PersonaTemplate } from '@repo/contracts';

interface TemplateCardProps {
  template: PersonaTemplate;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

function TemplateIcon({ template }: { template: PersonaTemplate }) {
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

export function TemplateCard({
  template,
  onEdit,
  onDelete,
  onDuplicate,
}: TemplateCardProps) {
  const t = useTranslations('templates');

  return (
    <Card className="group relative">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <TemplateIcon template={template} />
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              {template.isSystem && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  {t('badge.system')}
                </Badge>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <MoreVertical className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="mr-2 size-4" />
                  {t('actions.edit')}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate}>
                  <Copy className="mr-2 size-4" />
                  {t('actions.duplicate')}
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 size-4" />
                  {t('actions.delete')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <CardDescription className="line-clamp-2">
          {template.tagline}
        </CardDescription>
        {template.soulPreview && (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
            {template.soulPreview}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TemplateCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <Skeleton className="size-8 rounded" />
          <div className="flex-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="mt-1 h-4 w-16" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-1 h-4 w-3/4" />
        <Skeleton className="mt-2 h-3 w-full" />
      </CardContent>
    </Card>
  );
}
