'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { cn } from '@repo/ui/lib/utils';
import { Key, User, Shield, Bell } from 'lucide-react';

const settingsNav = [
  { href: '/settings/api-keys', icon: Key, labelKey: 'apiKeys' },
  { href: '/settings/account', icon: User, labelKey: 'account' },
  { href: '/settings/security', icon: Shield, labelKey: 'security' },
  { href: '/settings/notifications', icon: Bell, labelKey: 'notifications' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations('settings');
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-48">
          <nav className="flex flex-row gap-1 lg:flex-col">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
