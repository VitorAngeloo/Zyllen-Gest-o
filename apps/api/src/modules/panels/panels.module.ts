import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { ProjectServicesModule } from '../project-services/project-services.module';
import { TripsModule } from '../trips/trips.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PanelAccessService } from './panel-access.service';
import { PanelDataService } from './panel-data.service';
import { PanelMirrorController } from './panel-mirror.controller';
import { PersonalPanelController } from './personal-panel.controller';
import { PanelCacheInterceptor } from './panel-cache.interceptor';
@Module({ imports: [AuthModule, TicketsModule, ProjectServicesModule, TripsModule, InventoryModule], providers: [PanelAccessService, PanelDataService, PanelCacheInterceptor], controllers: [PersonalPanelController, PanelMirrorController] })
export class PanelsModule {}
