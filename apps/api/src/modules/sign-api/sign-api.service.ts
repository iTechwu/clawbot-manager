import { Injectable, Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import bcryptUtil from '@/utils/bcrypt.util';
import { apiError } from '@/filter/exception/api.exception';
import {
  UserInfoService,
  EmailAuthService,
  MobileAuthService,
} from '@app/db';
import stringUtil from '@/utils/string.util';
import { UserErrorCode } from '@repo/contracts/errors';
import { EmailRegister, MobileRegister } from '@repo/contracts';

@Injectable()
export class SignService {
  constructor(
    private readonly userInfo: UserInfoService,
    private readonly emailAuth: EmailAuthService,
    private readonly mobileAuth: MobileAuthService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async createAccountByEmail(data: EmailRegister & { inviteCode?: string }) {
    const existingUser = await this.userInfo.getByEmail(data.email);
    if (existingUser) {
      throw apiError(UserErrorCode.UserAlreadyExists);
    }

    const hashedPassword = bcryptUtil.hashSync(data.password, 10);

    const user = await this.userInfo.create({
      email: data.email,
      nickname: data.name || data.email.split('@')[0],
      code: stringUtil.generateString(data.name || data.email, 10),
      isAdmin: false,
    });

    await this.emailAuth.create({
      user: { connect: { id: user.id } },
      password: hashedPassword,
      verified: true,
    });

    return user;
  }

  async createAccountByMobile(data: MobileRegister & { inviteCode?: string }) {
    const existingUser = await this.userInfo.getByMobile(data.mobile);
    if (existingUser) {
      throw apiError(UserErrorCode.UserAlreadyExists);
    }

    const hashedPassword = bcryptUtil.hashSync(data.password, 10);

    const user = await this.userInfo.create({
      mobile: data.mobile,
      nickname: data.name || data.mobile,
      code: stringUtil.generateString(data.name || data.mobile, 10),
      isAdmin: false,
    });

    await this.mobileAuth.create({
      user: { connect: { id: user.id } },
      password: hashedPassword,
      verified: true,
    });

    return user;
  }
}
