import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PersonaTemplateApiController } from './persona-template-api.controller';
import { PersonaTemplateApiService } from './persona-template-api.service';
import {
  PersonaTemplateModule,
  UserInfoModule,
  FileSourceModule,
} from '@app/db';
import { AuthModule } from '@app/auth';
import { JwtModule } from '@app/jwt/jwt.module';
import { RedisModule } from '@app/redis';
import { FileCdnModule } from '@app/clients/internal/file-cdn';

@Module({
  imports: [
    ConfigModule,
    PersonaTemplateModule,
    UserInfoModule,
    FileSourceModule,
    FileCdnModule,
    AuthModule,
    JwtModule,
    RedisModule,
  ],
  controllers: [PersonaTemplateApiController],
  providers: [PersonaTemplateApiService],
  exports: [PersonaTemplateApiService],
})
export class PersonaTemplateApiModule {}
