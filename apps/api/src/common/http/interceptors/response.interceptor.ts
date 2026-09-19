import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MediaService } from '../../../modules/media/media.service';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
    constructor(private readonly media?: MediaService) {}
    intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
        return next.handle().pipe(
            map((data) => {
                // 204 No Content — pass through null/undefined unchanged
                if (data === null || data === undefined) return data;
                const req = context.switchToHttp().getRequest();
                const res = context.switchToHttp().getResponse();
                if (this.media && req.user && !res.headersSent && req.path !== '/auth/logout') {
                    this.media.setSession(res, req.user);
                    data = this.media.decorate(data, req.path);
                }
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
