import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            map((data) => {
                // 204 No Content — pass through null/undefined unchanged
                if (data === null || data === undefined) return data;
                // Plain objects: spread existing keys + add success flag
                if (typeof data === 'object' && !Array.isArray(data)) {
                    return { success: true, ...data };
                }
                // Unexpected array at root: wrap it
                return { success: true, data };
            }),
        );
    }
}
