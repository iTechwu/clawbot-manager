import { Headers, Req, UseInterceptors, Controller } from '@nestjs/common';
import { TsRestHandler, tsRestHandler } from '@ts-rest/nest';
import { Auth, AuthService, SimpleAuth } from '@app/auth';
import { UserErrorCode, CommonErrorCode } from '@repo/contracts/errors';
import { apiError } from '@/filter/exception/api.exception';
import { UserInfoService, EmailAuthService, MobileAuthService } from '@app/db';
import { SmsService } from '@app/shared-services/sms';
import { EmailService } from '@app/shared-services/email';
import { VerifyClient } from '@app/clients/internal/verify';
import { PardxApp } from '@/config/dto/config.dto';
import { signContract, API_VERSION } from '@repo/contracts';
import { success } from '@/common/ts-rest';
import { SignService } from './sign-api.service';
import { Mask, MaskInterceptor } from '@/common/interceptor/mask';
import bcryptUtil from '@/utils/bcrypt.util';

/**
 * Sign API Controller
 * ts-rest 版本的登录认证 API
 */
@Controller({ version: API_VERSION.V1 })
@UseInterceptors(MaskInterceptor)
export class SignApiController {
  constructor(
    private readonly auth: AuthService,
    private readonly userInfo: UserInfoService,
    private readonly emailAuth: EmailAuthService,
    private readonly mobileAuth: MobileAuthService,
    private readonly sms: SmsService,
    private readonly emailService: EmailService,
    private readonly verify: VerifyClient,
    private readonly signService: SignService,
  ) {}

  /**
   * POST /api/sign/in/email
   * 邮箱登录
   */
  @TsRestHandler(signContract.loginByEmail)
  async loginByEmail(@Headers() deviceInfo: PardxApp.HeaderData): Promise<any> {
    return tsRestHandler(signContract.loginByEmail, async ({ body }) => {
      const user = await this.userInfo.getByEmail(body.email);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const emailAuthRecord = await this.emailAuth.get({
        email: body.email,
      });
      if (!emailAuthRecord) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const match = await bcryptUtil.compare(
        body.password,
        emailAuthRecord.password,
      );
      if (!match) {
        throw apiError(UserErrorCode.InvalidPassword);
      }

      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/in/mobile/password
   * 手机号密码登录
   */
  @TsRestHandler(signContract.loginByMobilePassword)
  async loginByMobilePassword(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(
      signContract.loginByMobilePassword,
      async ({ body }) => {
        const user = await this.userInfo.getByMobile(body.mobile);
        if (!user) {
          throw apiError(UserErrorCode.UserNotFound);
        }

        const mobileAuthRecord = await this.mobileAuth.get({
          mobile: body.mobile,
        });
        if (!mobileAuthRecord) {
          throw apiError(UserErrorCode.UserNotFound);
        }

        const match = await bcryptUtil.compare(
          body.password,
          mobileAuthRecord.password,
        );
        if (!match) {
          throw apiError(UserErrorCode.InvalidPassword);
        }

        const result = await this.auth.loginSuccess(user, deviceInfo);

        return success(result);
      },
    );
  }

  /**
   * POST /api/sign/in/phone
   * 手机号验证码登录
   */
  @TsRestHandler(signContract.loginByMobileCode)
  async loginByMobileCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.loginByMobileCode, async ({ body }) => {
      const verify = await this.verify.validateMobileCode(
        body.mobile,
        body.code,
      );
      if (!verify) {
        throw apiError(UserErrorCode.InvalidVerifyCode);
      }
      const user = await this.userInfo.getByMobile(body.mobile);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }
      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * GET /api/sign/in/device
   * 设备登录（创建匿名用户）
   */
  @TsRestHandler(signContract.loginByDevice)
  async loginByDevice(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.loginByDevice, async () => {
      const user = await this.auth.createAnonyminyUser(deviceInfo);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }
      const result = await this.auth.refreshTokenByUser(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/up/email
   * 邮箱注册
   */
  @TsRestHandler(signContract.registerByEmail)
  async registerByEmail(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.registerByEmail, async ({ body }) => {
      const existingUser = await this.userInfo.getByEmail(body.email);
      if (existingUser) {
        throw apiError(UserErrorCode.UserAlreadyExists);
      }

      const user = await this.signService.createAccountByEmail(body);
      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/up/mobile
   * 手机号注册
   */
  @TsRestHandler(signContract.registerByMobile)
  async registerByMobile(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.registerByMobile, async ({ body }) => {
      const existingUser = await this.userInfo.getByMobile(body.mobile);
      if (existingUser) {
        throw apiError(UserErrorCode.UserAlreadyExists);
      }

      const user = await this.signService.createAccountByMobile(body);
      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * GET /api/sign/refresh/token
   * 刷新 Token
   */
  @TsRestHandler(signContract.refreshToken)
  async refreshToken(@Headers() deviceInfo: PardxApp.HeaderData): Promise<any> {
    return tsRestHandler(signContract.refreshToken, async ({ query }) => {
      const result = await this.auth.refreshSession(query.refresh, deviceInfo);

      return success(result);
    });
  }

  /**
   * GET /api/sign/in/cookie
   * 通过 Cookie 刷新 Token
   */
  @TsRestHandler(signContract.refreshByCookie)
  async refreshByCookie(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.refreshByCookie, async ({ query }) => {
      const result = await this.auth.refreshSession(query.refresh, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/verify/email
   * 邮箱验证码校验
   */
  @TsRestHandler(signContract.verifyEmail)
  async verifyEmail(@Headers() deviceInfo: PardxApp.HeaderData): Promise<any> {
    return tsRestHandler(signContract.verifyEmail, async ({ body }) => {
      const verify = await this.verify.validateEmailCode(body.email, body.code);
      if (!verify) {
        throw apiError(UserErrorCode.InvalidVerifyCode);
      }

      const user = await this.userInfo.getByEmail(body.email);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/verify/mobile
   * 手机号验证码校验
   */
  @TsRestHandler(signContract.verifyMobile)
  async verifyMobile(@Headers() deviceInfo: PardxApp.HeaderData): Promise<any> {
    return tsRestHandler(signContract.verifyMobile, async ({ body }) => {
      const verify = await this.verify.validateMobileCode(
        body.mobile,
        body.code,
      );
      if (!verify) {
        throw apiError(UserErrorCode.InvalidVerifyCode);
      }

      const user = await this.userInfo.getByMobile(body.mobile);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      const result = await this.auth.loginSuccess(user, deviceInfo);

      return success(result);
    });
  }

  /**
   * POST /api/sign/send/verifyemail
   * 发送邮箱验证码
   */
  @TsRestHandler(signContract.sendEmailCode)
  async sendEmailCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.sendEmailCode, async ({ body }) => {
      const user = await this.userInfo.getByEmail(body.email);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      await this.emailService.processingSendVerifyEmail(user, deviceInfo);

      return success({ success: true });
    });
  }

  /**
   * POST /api/sign/send/code/mobile
   * 发送手机注册验证码
   */
  @TsRestHandler(signContract.sendMobileRegisterCode)
  async sendMobileRegisterCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(
      signContract.sendMobileRegisterCode,
      async ({ body }) => {
        const existingUser = await this.userInfo.getByMobile(body.mobile);
        if (existingUser) {
          throw apiError(UserErrorCode.UserAlreadyExists);
        }

        await this.sms.processingSendSmsVerifyCode(
          { mobile: body.mobile },
          deviceInfo,
          'register',
        );

        return success({ success: true });
      },
    );
  }

  /**
   * POST /api/sign/send/code/mobile/login
   * 发送手机登录验证码
   */
  @TsRestHandler(signContract.sendMobileLoginCode)
  async sendMobileLoginCode(
    @Headers() deviceInfo: PardxApp.HeaderData,
  ): Promise<any> {
    return tsRestHandler(signContract.sendMobileLoginCode, async ({ body }) => {
      const user = await this.userInfo.getByMobile(body.mobile);
      if (!user) {
        throw apiError(UserErrorCode.UserNotFound);
      }

      await this.sms.processingSendSmsVerifyCode(
        { mobile: body.mobile },
        deviceInfo,
        'login',
      );

      return success({ success: true });
    });
  }

  /**
   * POST /api/sign/out
   * 登出
   */
  @SimpleAuth()
  @TsRestHandler(signContract.signOut)
  async signOut(@Req() req: any): Promise<any> {
    return tsRestHandler(signContract.signOut, async () => {
      const userId = req?.userId;
      if (!userId) {
        throw apiError(UserErrorCode.UserNotFound);
      }
      await this.auth.removeSessions(userId);

      return success({ success: true });
    });
  }
}
