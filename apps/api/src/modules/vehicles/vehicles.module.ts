import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { MaintenanceMediaStorageService } from '../../infrastructure/storage/maintenance-media-storage.service';
@Module({ imports: [AuthModule, AccessModule], controllers: [VehiclesController], providers: [VehiclesService, MaintenanceMediaStorageService], exports: [VehiclesService] })
export class VehiclesModule {}
