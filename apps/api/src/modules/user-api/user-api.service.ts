import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import bcryptUtil from '@/utils/bcrypt.util';
import { apiError } from '@/filter/exception/api.exception';
import {
  UserInfoService,
  EmailAuthService,
  MobileAuthService,
  FileSourceService,
} from '@app/db';
import { FileCdnClient } from '@app/clients/internal/file-cdn';
import { UserErrorCode } from '@repo/contracts/errors';
import type {
  UpdateUserProfile,
  UpdateUserProfileResponse,
  ChangePassword,
  ChangePasswordResponse,
} from '@repo/contracts';

@Injectable()
export class UserApiService {
  constructor(
    private readonly userInfo: UserInfoService,
    private readonly emailAuth: EmailAuthService,
    private readonly mobileAuth: MobileAuthService,
    private readonly fileSource: FileSourceService,
    private readonly fileCdn: FileCdnClient,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  /**
   * Update user profile (nickname, avatar)
   */
  async updateProfile(
    userId: string,
    data: UpdateUserProfile,
  ): Promise<UpdateUserProfileResponse> {
    const user = await this.userInfo.get({ id: userId });
    if (!user) {
      throw apiError(UserErrorCode.UserNotFound);
    }

    const updateData: { nickname?: string; avatarFileId?: string | null } = {};

    if (data.nickname !== undefined) {
      updateData.nickname = data.nickname;
    }

    if (data.avatarFileId !== undefined) {
      updateData.avatarFileId = data.avatarFileId;
    }

    const updatedUser = await this.userInfo.update({ id: userId }, updateData);

    // Get avatar URL if avatarFileId exists
    let headerImg: string | null = null;
    if (updatedUser.avatarFileId) {
      const avatarFile = await this.fileSource.getById(updatedUser.avatarFileId);
      if (avatarFile) {
        headerImg = await this.fileCdn.getImageVolcengineCdn(
          avatarFile.vendor,
          avatarFile.bucket,
          avatarFile.key,
          '360:360:360:360',
        );
      }
    }

    return {
      id: updatedUser.id,
      nickname: updatedUser.nickname,
      headerImg,
    };
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    data: ChangePassword,
  ): Promise<ChangePasswordResponse> {
    const user = await this.userInfo.get({ id: userId });
    if (!user) {
      throw apiError(UserErrorCode.UserNotFound);
    }

    // Check if user has email or mobile auth
    let authRecord: { password: string } | null = null;
    let authType: 'email' | 'mobile' | null = null;

    if (user.email) {
      const emailAuth = await this.emailAuth.get({ email: user.email });
      if (emailAuth) {
        authRecord = emailAuth;
        authType = 'email';
      }
    }

    if (!authRecord && user.mobile) {
      const mobileAuth = await this.mobileAuth.get({ mobile: user.mobile });
      if (mobileAuth) {
        authRecord = mobileAuth;
        authType = 'mobile';
      }
    }

    if (!authRecord || !authType) {
      throw apiError(UserErrorCode.InvalidPassword, {
        message: 'No password authentication method found',
      });
    }

    // Verify current password
    const isPasswordValid = await bcryptUtil.compare(
      data.currentPassword,
      authRecord.password,
    );
    if (!isPasswordValid) {
      throw apiError(UserErrorCode.InvalidPassword);
    }

    // Hash new password
    const hashedPassword = bcryptUtil.hashSync(data.newPassword, 10);

    // Update password based on auth type
    if (authType === 'email' && user.email) {
      await this.emailAuth.update(
        { email: user.email },
        { password: hashedPassword },
      );
    } else if (authType === 'mobile' && user.mobile) {
      await this.mobileAuth.update(
        { mobile: user.mobile },
        { password: hashedPassword },
      );
    }

    this.logger.info('Password changed successfully', { userId });

    return { success: true };
  }
}
