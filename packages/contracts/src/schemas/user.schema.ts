import { z } from 'zod';

/**
 * User-related Zod schemas
 */

// User check response
export const UserCheckResponseSchema = z.object({
  userId: z.string().uuid(),
});

// User account schemas
export const UserMobileAccountSchema = z.object({
  id: z.string().uuid(),
  iddCode: z.string().optional().nullable(),
  mobile: z.string(),
  name: z.string(),
  validator: z.boolean(),
  password: z.string().optional(),
});

export const UserEmailAccountSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  validator: z.boolean(),
  password: z.string().optional(),
});

export const GoogleAccountSchema = z.object({
  id: z.string().uuid(),
  googleId: z.string(),
  email: z.string().email(),
  name: z.string().optional().nullable(),
  picture: z.string().url().optional().nullable(),
});

export const WechatAccountSchema = z.object({
  id: z.string().uuid(),
  openid: z.string(),
  unionid: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

export const DiscordAccountSchema = z.object({
  id: z.string().uuid(),
  discordId: z.string(),
  username: z.string(),
  discriminator: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
});

// User account base schema
export const UserAccountBaseSchema = z.object({
  id: z.string().uuid(),
  code: z.string().optional().nullable(),
  nickname: z.string().optional().nullable(),
  headerImg: z.string().url().optional().nullable(),
  sex: z.string().optional().nullable(),
  currentPlanId: z.string().uuid().optional().nullable(),
  mobileAccount: UserMobileAccountSchema.optional().nullable(),
  emailAccount: UserEmailAccountSchema.optional().nullable(),
  wechat: WechatAccountSchema.optional().nullable(),
  googleAccount: GoogleAccountSchema.optional().nullable(),
  discordAccount: DiscordAccountSchema.optional().nullable(),
});

// User contact response schema
export const UserContactResponseSchema = z.object({
  userId: z.string().uuid(),
  nickname: z.string().optional().nullable(),
  mobileAccount: UserMobileAccountSchema.optional().nullable(),
  emailAccount: UserEmailAccountSchema.optional().nullable(),
});

// ============================================================================
// User Profile Update Schemas
// ============================================================================

/**
 * Update user profile request
 */
export const UpdateUserProfileSchema = z.object({
  nickname: z.string().min(1).max(50).optional(),
  avatarFileId: z.string().uuid().optional().nullable(),
});
export type UpdateUserProfile = z.infer<typeof UpdateUserProfileSchema>;

/**
 * Update user profile response
 */
export const UpdateUserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  nickname: z.string().nullable(),
  headerImg: z.string().url().nullable(),
});
export type UpdateUserProfileResponse = z.infer<typeof UpdateUserProfileResponseSchema>;

/**
 * Change password request
 */
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});
export type ChangePassword = z.infer<typeof ChangePasswordSchema>;

/**
 * Change password response
 */
export const ChangePasswordResponseSchema = z.object({
  success: z.boolean(),
});
export type ChangePasswordResponse = z.infer<typeof ChangePasswordResponseSchema>;
