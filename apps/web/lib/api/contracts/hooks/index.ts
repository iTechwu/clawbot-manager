'use client';

// Notification hooks
export {
  notificationKeys,
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
  type NotificationsParams,
} from './notification';

// Setting hooks
export {
  settingKeys,
  useSaveAccount,
  useUpdateAvatar,
  useSendVerifyEmail,
  useSetPassword,
  useBindEmail,
  useBindPhone,
} from './setting';
