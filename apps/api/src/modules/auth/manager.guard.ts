import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

export function isManager(user: { type?: string; role?: { name?: string } } | undefined): boolean {
    return user?.type === 'internal' && ['Administrador', 'Gestor'].includes(user.role?.name ?? '');
}

/** Regra de negócio explícita: não é delegável por conceder settings.manage. */
@Injectable()
export class ManagerGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        if (!isManager(context.switchToHttp().getRequest().user)) {
            throw new ForbiddenException('Operação restrita a Administrador e Gestor');
        }
        return true;
    }
}
