import { Module } from '@nestjs/common';
import { PluginService } from './plugin.service';
import { PrismaModule } from '@app/prisma';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, RedisModule, ConfigModule],
  providers: [PluginService],
  exports: [PluginService],
})
export class PluginModule {}
