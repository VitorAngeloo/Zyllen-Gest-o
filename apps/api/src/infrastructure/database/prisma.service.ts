import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withRetry, sleep } from './prisma-retry';

const MAX_CONNECT_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 1_000;

function buildDatasourceUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    // Cap connection pool to 5 — Supabase closes idle connections and
    // the default of 29 causes pool exhaustion over long uptimes.
    const sep = url.includes('?') ? '&' : '?';
    if (url.includes('connection_limit')) return url;
    return `${url}${sep}connection_limit=5&pool_timeout=30`;
}

@Injectable()
export class PrismaService
    extends PrismaClient
    implements OnModuleInit, OnModuleDestroy {

    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            datasources: {
                db: { url: buildDatasourceUrl(process.env.DATABASE_URL) },
            },
        });
    }

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
