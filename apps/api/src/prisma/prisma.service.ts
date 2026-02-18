import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {
    async onModuleInit() {
        await this.$connect();

        // Enable WAL mode for better read performance (SQLite)
        try {
            await this.$queryRaw`PRAGMA journal_mode = WAL`;
        } catch {
            // Ignore if not SQLite (e.g. PostgreSQL)
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }
}
