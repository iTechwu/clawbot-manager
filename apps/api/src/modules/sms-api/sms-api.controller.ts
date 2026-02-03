import { Headers, Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { UserErrorCode, CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import { SmsService, VerifyCodeResult } from '@app/shared-services/sms';
import { UserInfoService, MobileAuthService } from '@app/db';
import { AuthService } from '@app/auth';
import { smsContract, API_VERSION } from '@repo/contracts';
import { success } from '@/common/ts-rest';
import { PardxApp } from '@/config/dto/config.dto';

/**
 * SMS API Controller
 * Based on ts-rest contract
 */
@Controller({ version: API_VERSION.V1 })
export class SmsApiController {
  constructor(
    private readonly smsClientService: SmsService,
    private readonly userInfo: UserInfoService,
    private readonly mobileAuth: MobileAuthService,
    private readonly authService: AuthService,
  ) {}

  /**
   * POST /api/sms/send/code
   * 发送短信验证码
   */
  @TsRestHandler(smsContract.sendCode)
  async sendSmsCode(): Promise<any> {
    return tsRestHandler(smsContract.sendCode, async ({ body }) => {
      const result = await this.smsClientService.sendVerifyCode(
        body.phoneNumbers,
      );
      return success(result);
    });
  }

  /**
   * POST /api/sms/check/code
   * 校验短信验证码
   */
  @TsRestHandler(smsContract.checkCode)
  async checkVerifyCode(): Promise<any> {
    return tsRestHandler(smsContract.checkCode, async ({ body }) => {
      const result = await this.smsClientService.checkVerifyCode(
        body.phoneNumber,
        body.code,
      );
      return success(result);
    });
  }

  /**
   * POST /api/sms/send/code/login
   * 发送登录验证码
   */
  @TsRestHandler(smsContract.sendLoginCode)
  async sendLoginCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(smsContract.sendLoginCode, async ({ body }) => {
      const user = await this.userInfo.getByMobile(body.mobile);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const mobileAuth = await this.mobileAuth.get({
        mobile: body.mobile,
      });
      if (!mobileAuth) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      await this.smsClientService.sendVerifyCode(body.mobile);

      return success({
        success: true,
        message: '验证码发送成功',
      });
    });
  }

  /**
   * POST /api/sms/login/verify
   * 使用短信验证码登录
   */
  @TsRestHandler(smsContract.loginWithVerifyCode)
  async loginWithVerifyCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(smsContract.loginWithVerifyCode, async ({ body }) => {
      const user = await this.userInfo.getByMobile(body.mobile);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const verifyResult = await this.smsClientService.checkVerifyCode(
        body.mobile,
        body.code,
      );

      if (!verifyResult.success) {
        switch (verifyResult.result) {
          case VerifyCodeResult.INVALID_CODE:
            throw apiError(UserErrorCode.InvalidVerifyCode);
          case VerifyCodeResult.EXPIRED:
            throw apiError(CommonErrorCode.BadRequest, {
              message: 'verifyCodeExpired',
            });
          case VerifyCodeResult.USED:
            throw apiError(CommonErrorCode.BadRequest, {
              message: 'verifyCodeUsed',
            });
          case VerifyCodeResult.NOT_FOUND:
            throw apiError(CommonErrorCode.BadRequest, {
              message: 'verifyCodeNotFound',
            });
          case VerifyCodeResult.EXCEEDED:
            throw apiError(CommonErrorCode.BadRequest, {
              message: 'verifyCodeExceeded',
            });
          default:
            throw apiError(UserErrorCode.InvalidVerifyCode);
        }
      }

      const result = await this.authService.loginSuccess(user, deviceInfo);
      return success(result);
    });
  }

  /**
   * POST /api/sms/send/code/register
   * 发送注册验证码
   */
  @TsRestHandler(smsContract.sendRegisterCode)
  async sendRegisterCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(smsContract.sendRegisterCode, async ({ body }) => {
      const existingUser = await this.userInfo.getByMobile(body.mobile);
      if (existingUser) {
        throw apiError(UserErrorCode.UserAlreadyExists, {
          message: 'mobileAlreadyRegistered',
        });
      }

      const result = await this.smsClientService.sendVerifyCode(body.mobile);

      if (!result || result.ResponseMetadata?.Error) {
        throw apiError(CommonErrorCode.InternalServerError, {
          message: 'smsSendFailed',
        });
      }

      return success({
        phoneNumber: body.mobile,
        expireTime: 300,
      });
    });
  }

  /**
   * POST /api/sms/register/verify
   * 使用短信验证码注册
   */
  @TsRestHandler(smsContract.registerWithVerifyCode)
  async registerWithVerifyCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(
      smsContract.registerWithVerifyCode,
      async ({ body }) => {
        const existingUser = await this.userInfo.getByMobile(body.mobile);
        if (existingUser) {
          throw apiError(UserErrorCode.UserAlreadyExists, {
            message: 'mobileAlreadyRegistered',
          });
        }

        const verifyResult = await this.smsClientService.checkVerifyCode(
          body.mobile,
          body.code,
        );

        if (!verifyResult.success) {
          switch (verifyResult.result) {
            case VerifyCodeResult.INVALID_CODE:
              throw apiError(UserErrorCode.InvalidVerifyCode);
            case VerifyCodeResult.EXPIRED:
              throw apiError(CommonErrorCode.BadRequest, {
                message: 'verifyCodeExpired',
              });
            case VerifyCodeResult.USED:
              throw apiError(CommonErrorCode.BadRequest, {
                message: 'verifyCodeUsed',
              });
            case VerifyCodeResult.NOT_FOUND:
              throw apiError(CommonErrorCode.BadRequest, {
                message: 'verifyCodeNotFound',
              });
            case VerifyCodeResult.EXCEEDED:
              throw apiError(CommonErrorCode.BadRequest, {
                message: 'verifyCodeExceeded',
              });
            default:
              throw apiError(UserErrorCode.InvalidVerifyCode);
          }
        }

        // Create user account (without password for SMS registration)
        const user = await this.userInfo.create({
          mobile: body.mobile,
          nickname: body.mobile,
          isAdmin: false,
        });

        await this.mobileAuth.create({
          user: {
            connect: { id: user.id },
          },
          password: '', // SMS registration doesn't require password
          verified: true,
        });

        const result = await this.authService.loginSuccess(user, deviceInfo);
        return success(result);
      },
    );
  }
}
