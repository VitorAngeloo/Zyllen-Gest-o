import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
@Injectable()
export class PanelCacheInterceptor implements NestInterceptor {
    intercept(context: ExecutionContext, next: CallHandler) {
        const response = context.switchToHttp().getResponse();
        response.setHeader('Cache-Control', 'private, no-store, max-age=0');
        response.setHeader('Referrer-Policy', 'no-referrer');
        response.setHeader('X-Robots-Tag', 'noindex, nofollow');
        return next.handle();
    }
}
