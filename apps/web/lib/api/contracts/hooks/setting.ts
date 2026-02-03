'use client';

import { settingApi } from '../client';

export const settingKeys = {
  all: ['setting'] as const,
  account: () => [...settingKeys.all, 'account'] as const,
  avatar: () => [...settingKeys.all, 'avatar'] as const,
};

export function useSaveAccount() {
  return settingApi.saveAccount.useMutation();
}

export function useUpdateAvatar() {
  return settingApi.updateAvatar.useMutation();
}

export function useSendVerifyEmail() {
  return settingApi.sendVerifyEmail.useMutation();
}

export function useSetPassword() {
  return settingApi.setPassword.useMutation();
}

export function useBindEmail() {
  return settingApi.bindEmail.useMutation();
}

export function useBindPhone() {
  return settingApi.bindPhone.useMutation();
}
