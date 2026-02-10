import {
    Injectable,
    CanActivate,
    ExecutionContext,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessService } from './access.service';
import { PERMISSION_KEY } from './permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly accessService: AccessService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredPermission = this.reflector.getAllAndOverride<string>(
            PERMISSION_KEY,
            [context.getHandler(), context.getClass()],
        );

        // No permission decorator = no restriction (beyond JWT)
        if (!requiredPermission) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user || user.type !== 'internal') {
            throw new ForbiddenException('Acesso negado');
        }

        const [screen, action] = requiredPermission.split('.');
        const hasPermission = await this.accessService.userHasPermission(
            user.id,
            screen,
            action,
        );

        if (!hasPermission) {
            throw new ForbiddenException(
                `Sem permissão para ${screen}.${action}`,
            );
        }

        return true;
    }
}
