'use client';

import { useState, useEffect, useRef } from 'react';
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
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui';
import { Camera, User, Loader2 } from 'lucide-react';
import { getUser, updateUser } from '@/lib/storage';
import { userClient } from '@/lib/api/contracts/client';
import { uploadAvatar } from '@/lib/api/avatar-upload';
import type { UserInfo } from '@repo/contracts';

/**
 * Get initials from nickname
 */
function getInitials(nickname: string | null | undefined): string {
  if (!nickname) return '';
  return nickname.charAt(0).toUpperCase();
}

export default function AccountPage() {
  const t = useTranslations('settings');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserInfo | null>(null);
  const [nickname, setNickname] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser) {
      setUser(storedUser);
      setNickname(storedUser.nickname || '');
      setAvatarPreview(storedUser.headerImg || null);
    }
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarFile(file);
  };

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    try {
      let avatarFileId: string | undefined;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        setIsUploading(true);
        try {
          const result = await uploadAvatar(avatarFile);
          avatarFileId = result.fileId;
        } finally {
          setIsUploading(false);
        }
      }

      // Update profile
      const response = await userClient.updateProfile({
        body: {
          nickname: nickname || undefined,
          avatarFileId,
        },
      });

      if (response.status === 200) {
        // Update local storage
        updateUser({
          nickname: response.body.data.nickname,
          headerImg: response.body.data.headerImg,
        });

        // Update local state
        setUser((prev) =>
          prev
            ? {
                ...prev,
                nickname: response.body.data.nickname,
                headerImg: response.body.data.headerImg,
              }
            : null,
        );
        setAvatarFile(null);
        if (response.body.data.headerImg) {
          setAvatarPreview(response.body.data.headerImg);
        }

        toast.success(t('profile.saveSuccess'));
      } else {
        toast.error(t('profile.saveError'));
      }
    } catch {
      toast.error(t('profile.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const initials = getInitials(nickname || user?.nickname);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profile.title')}</CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar Section */}
        <div className="flex flex-col items-center gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="relative group"
            onClick={handleAvatarClick}
            disabled={isUploading}
          >
            <Avatar className="size-24 border-2 border-muted">
              <AvatarImage src={avatarPreview || ''} alt={nickname || 'User'} />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                {initials || <User className="size-8" />}
              </AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
              {isUploading ? (
                <Loader2 className="size-6 animate-spin" />
              ) : (
                <>
                  <Camera className="size-6" />
                  <span className="text-xs mt-1">{t('profile.avatar')}</span>
                </>
              )}
            </div>
          </button>
          <p className="text-sm text-muted-foreground">
            {t('profile.avatarDescription')}
          </p>
        </div>

        {/* Nickname Field */}
        <div className="space-y-2">
          <Label htmlFor="nickname">{t('profile.nickname')}</Label>
          <Input
            id="nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder={t('profile.nicknamePlaceholder')}
            maxLength={50}
          />
        </div>

        {/* Email Field (Read-only) */}
        {user?.email && (
          <div className="space-y-2">
            <Label htmlFor="email">{t('profile.email')}</Label>
            <Input id="email" value={user.email} disabled className="bg-muted" />
          </div>
        )}

        {/* Mobile Field (Read-only) */}
        {user?.mobile && (
          <div className="space-y-2">
            <Label htmlFor="mobile">{t('profile.mobile')}</Label>
            <Input id="mobile" value={user.mobile} disabled className="bg-muted" />
          </div>
        )}

        {/* Save Button */}
        <Button onClick={handleSave} disabled={isSaving} className="w-full">
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {t('profile.saving')}
            </>
          ) : (
            t('profile.saveChanges')
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
