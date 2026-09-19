import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { ScheduleModule } from '../schedule/schedule.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { OperationsStatisticsService } from './operations-statistics.service';

@Module({ imports: [AuthModule, AccessModule, ScheduleModule], controllers: [TripsController], providers: [TripsService, OperationsStatisticsService], exports: [OperationsStatisticsService] })
export class TripsModule {}
