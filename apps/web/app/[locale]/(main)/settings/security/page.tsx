'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
} from '@repo/ui';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { userClient } from '@/lib/api/contracts/client';

export default function SecurityPage() {
  const t = useTranslations('settings');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChangePassword = async () => {
    // Validate passwords match
    if (newPassword !== confirmPassword) {
      toast.error(t('password.passwordMismatch'));
      return;
    }

    // Validate password length
    if (newPassword.length < 6) {
      toast.error(t('password.newPasswordPlaceholder'));
      return;
    }

    setIsChanging(true);
    try {
      const response = await userClient.changePassword({
        body: {
          currentPassword,
          newPassword,
        },
      });

      if (response.status === 200) {
        toast.success(t('password.changeSuccess'));
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(t('password.changeError'));
      }
    } catch {
      toast.error(t('password.changeError'));
    } finally {
      setIsChanging(false);
    }
  };

  const isFormValid =
    currentPassword.length >= 6 &&
    newPassword.length >= 6 &&
    confirmPassword.length >= 6;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('password.title')}</CardTitle>
        <CardDescription>{t('password.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Password */}
        <div className="space-y-2">
          <Label htmlFor="currentPassword">{t('password.currentPassword')}</Label>
          <div className="relative">
            <Input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={t('password.currentPasswordPlaceholder')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="newPassword">{t('password.newPassword')}</Label>
          <div className="relative">
            <Input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('password.newPasswordPlaceholder')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('password.confirmPassword')}</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('password.confirmPasswordPlaceholder')}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4 text-muted-foreground" />
              ) : (
                <Eye className="size-4 text-muted-foreground" />
              )}
            </Button>
          </div>
        </div>

        {/* Change Password Button */}
        <Button
          onClick={handleChangePassword}
          disabled={isChanging || !isFormValid}
          className="w-full"
        >
          {isChanging ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('password.changing')}
            </>
          ) : (
            t('password.changePassword')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
