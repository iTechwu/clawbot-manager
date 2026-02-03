import { Module } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { PrismaWriteModule } from '@/prisma-write/prisma-write.module';
import { PrismaReadModule } from '@/prisma-read/prisma-read.module';
import { RedisModule } from '@app/redis';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [PrismaWriteModule, PrismaReadModule, RedisModule, ConfigModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
