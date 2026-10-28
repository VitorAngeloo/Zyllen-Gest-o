import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { ProjectServicesController } from './project-services.controller';
import { ProjectServicesService } from './project-services.service';
import { ProjectStatisticsService } from './project-statistics.service';
import { StructuresModule } from '../structures/structures.module';
import { ProjectCollaborationService } from './project-collaboration.service';
import { ProjectActionsService } from './project-actions.service';
import { ProjectHistoryService } from './project-history.service';
import { ProjectPlanningGuard } from './project-planning.guard';
import { ProjectLegacyService } from './project-legacy.service';

@Module({ imports: [AuthModule, AccessModule, ScheduleModule, StructuresModule], controllers: [ProjectServicesController], providers: [ProjectServicesService, ProjectStatisticsService, ProjectCollaborationService, ProjectActionsService, ProjectHistoryService, ProjectPlanningGuard, ProjectLegacyService], exports: [ProjectStatisticsService] })
export class ProjectServicesModule {}
