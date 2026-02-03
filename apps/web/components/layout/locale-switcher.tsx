'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui';
import { useRouter, usePathname } from '@/i18n';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n';
import { ClientOnly } from '@/components/client-only';

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleLocaleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  const triggerButton = (
    <Button variant="ghost" size="icon" className="size-8">
      <Globe className="size-4" />
      <span className="sr-only">Switch language</span>
    </Button>
  );

  return (
    <ClientOnly fallback={triggerButton}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <Globe className="size-4" />
            <span className="sr-only">Switch language</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {locales.map((loc) => (
            <DropdownMenuItem
              key={loc}
              onClick={() => handleLocaleChange(loc)}
              className={locale === loc ? 'bg-accent' : ''}
            >
              <span className="mr-2">{localeFlags[loc]}</span>
              {localeNames[loc]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ClientOnly>
  );
}
