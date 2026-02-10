import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();

        // Enable WAL mode for better read performance (SQLite)
        await this.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
