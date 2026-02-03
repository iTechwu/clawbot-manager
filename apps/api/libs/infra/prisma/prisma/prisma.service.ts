import { Injectable } from '@nestjs/common';
import { PrismaReadService } from '@/prisma-read/prisma-read.service';
import { PrismaWriteService } from '@/prisma-write/prisma-write.service';

@Injectable()
export class PrismaService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}
  get read() {
    return this.prismaRead.client;
  }

  get write() {
    return this.prismaWrite.client;
  }
}
