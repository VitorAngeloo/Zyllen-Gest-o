import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { ProjectServicesController } from './project-services.controller';
import { ProjectServicesService } from './project-services.service';
import { ProjectStatisticsService } from './project-statistics.service';
import { StructuresModule } from '../structures/structures.module';

@Module({ imports: [AuthModule, AccessModule, ScheduleModule, StructuresModule], controllers: [ProjectServicesController], providers: [ProjectServicesService, ProjectStatisticsService], exports: [ProjectStatisticsService] })
export class ProjectServicesModule {}
