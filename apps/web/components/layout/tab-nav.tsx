'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface NavItem {
  id: string;
  labelKey: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    id: 'bots',
    labelKey: 'bots',
    href: '/bots',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    id: 'secrets',
    labelKey: 'secrets',
    href: '/secrets',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="7" width="10" height="8" rx="1" />
        <path d="M5 7V5a3 3 0 116 0v2" />
        <circle cx="8" cy="11" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'diagnostics',
    labelKey: 'diagnostics',
    href: '/diagnostics',
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M8 1v14" />
        <path d="M1 8h14" />
        <circle cx="8" cy="8" r="6" />
        <circle cx="8" cy="8" r="2" />
      </svg>
    ),
  },
];

export function TabNav() {
  const t = useTranslations('common.nav');
  const pathname = usePathname();

  // Remove locale prefix from pathname for comparison
  const currentPath = pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?/i, '') || '/';

  return (
    <nav className="flex gap-1 border-b border-gray-200 px-4 dark:border-gray-700" role="tablist">
      {navItems.map((item) => {
        const isActive = currentPath === item.href || currentPath.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
            role="tab"
            aria-selected={isActive}
          >
            <span className="opacity-70">{item.icon}</span>
            <span>{t(item.labelKey)}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 dark:bg-blue-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
