import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withRetry, sleep } from './prisma-retry';

const MAX_CONNECT_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 1_000;

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(PrismaService.name);

    async onModuleInit() {
        // Retry initial connection — Supabase cold-start / network race at boot
        for (let attempt = 1; attempt <= MAX_CONNECT_ATTEMPTS; attempt++) {
            try {
                await this.$connect();
                return;
            } catch (error) {
                if (attempt === MAX_CONNECT_ATTEMPTS) {
                    this.logger.error(`Failed to connect to database after ${MAX_CONNECT_ATTEMPTS} attempts`);
                    throw error;
                }
                const delay = CONNECT_BASE_DELAY_MS * attempt;
                this.logger.warn(
                    `DB connection failed (attempt ${attempt}/${MAX_CONNECT_ATTEMPTS}) — retrying in ${delay}ms`,
                );
                await sleep(delay);
            }
        }
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    /**
     * Wraps any Prisma operation with automatic retry on transient errors
     * (network glitch, connection pool timeout, Supabase disconnect).
     *
     * Usage: await this.prisma.retry(() => this.prisma.ticket.findMany(...))
     */
    retry<T>(fn: () => Promise<T>): Promise<T> {
        return withRetry(fn);
    }
}
