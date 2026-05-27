/**
 * Prisma error codes that indicate a transient infrastructure problem
 * (network glitch, connection pool exhaustion, Supabase timeout).
 * These are safe to retry with backoff; all other errors are re-thrown immediately.
 */
const TRANSIENT_CODES = new Set([
    'P1001', // Can't reach database server
    'P1002', // Database server timed out
    'P1008', // Operations timed out
    'P1017', // Server closed the connection
    'P2024', // Timed out fetching a new connection from the pool
    'P2028', // Transaction API error
]);

export function isTransientError(error: unknown): boolean {
    return (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        TRANSIENT_CODES.has((error as { code: string }).code)
    );
}

export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries `fn` up to `maxAttempts` times on transient Prisma errors.
 * Uses linear backoff: attempt 1 → baseDelayMs, attempt 2 → 2×baseDelayMs, etc.
 */
export async function withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
    baseDelayMs = 250,
): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (!isTransientError(error) || attempt === maxAttempts) throw error;
            await sleep(baseDelayMs * attempt);
        }
    }
    throw lastError;
}
