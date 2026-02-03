'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Separator,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui';
import {
  Moon,
  Sun,
  Search,
  Bell,
  Sparkles,
  Settings,
  LogOut,
  User,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useTranslations } from 'next-intl';
import { LocaleSwitcher } from './locale-switcher';
import { ClientOnly } from '@/components/client-only';
import { getUser, clearAll } from '@/lib/storage';
import type { UserInfo } from '@repo/contracts';

/**
 * Get initials from nickname
 * Returns first character of nickname (uppercase)
 */
function getInitials(nickname: string | null | undefined): string {
  if (!nickname) return '';
  return nickname.charAt(0).toUpperCase();
}

export function AppNavbar() {
  const t = useTranslations('common.navbar');
  const tNav = useTranslations('common.nav');
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    // Get user from localStorage
    const storedUser = getUser();
    setUser(storedUser);

    // Listen for user info updates
    const handleUserUpdate = () => {
      const updatedUser = getUser();
      setUser(updatedUser);
    };

    window.addEventListener('userInfoUpdated', handleUserUpdate);
    return () => {
      window.removeEventListener('userInfoUpdated', handleUserUpdate);
    };
  }, []);

  const handleLogout = () => {
    clearAll();
    router.push('/login');
  };

  const initials = getInitials(user?.nickname);

  return (
    <header className="bg-background flex h-14 shrink-0 items-center justify-between border-b px-4">
      <Link
        href="/bots"
        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold tracking-tight">
            {tNav('title')}
          </span>
          <span className="text-xs text-muted-foreground">
            {tNav('subtitle')}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="size-8">
          <Search className="size-4" />
          <span className="sr-only">{t('search')}</span>
        </Button>
        <Button variant="ghost" size="icon" className="size-8">
          <Bell className="size-4" />
          <span className="sr-only">{t('notifications')}</span>
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <LocaleSwitcher />
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="size-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t('toggleTheme')}</span>
        </Button>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <ClientOnly
          fallback={
            <Button variant="ghost" size="icon" className="size-8 rounded-full">
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  <User className="size-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          }
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full">
                <Avatar className="size-8">
                  <AvatarImage src={user?.headerImg || ''} alt={user?.nickname || 'User'} />
                  <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                    {initials || <User className="size-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>
                {user?.nickname || t('user.account')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/settings/account">
                  <User className="mr-2 size-4" />
                  {t('user.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">
                  <Settings className="mr-2 size-4" />
                  {t('user.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={handleLogout}>
                <LogOut className="mr-2 size-4" />
                {t('user.logout')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </ClientOnly>
      </div>
    </header>
  );
}
