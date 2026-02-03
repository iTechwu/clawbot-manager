// new-jwt.module.ts
import { JwtConfig } from '@/config/validation';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule as NestJwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const config = configService.getOrThrow('jwt') as JwtConfig;
        return {
          secret: config.secret,
          signOptions: {
            expiresIn: config.expireIn,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [NestJwtModule], // 如果你打算在其他模块中使用这个 JWT 模块，记得导出它
})
export class JwtModule {}
