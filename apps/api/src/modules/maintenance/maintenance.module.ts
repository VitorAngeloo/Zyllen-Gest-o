import { Module, forwardRef } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [MaintenanceController],
    providers: [MaintenanceService],
    exports: [MaintenanceService],
})
export class MaintenanceModule { }
