import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { canEnterProjectPlanning } from '@zyllen/shared';

@Injectable()
export class ProjectPlanningGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        if (!canEnterProjectPlanning(context.switchToHttp().getRequest().user)) {
            throw new ForbiddenException('Cronograma e Planejamento ainda não está disponível para este perfil');
        }
        return true;
    }
}
