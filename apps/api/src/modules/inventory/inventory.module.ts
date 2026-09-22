import { InventoryQueriesService } from './inventory-queries.service';
import { InventorySettingsService } from './inventory-settings.service';
import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryCustodyController } from './inventory-custody.controller';
import { InventoryCustodyService } from './inventory-custody.service';
import { InventoryUninstallationService } from './inventory-uninstallation.service';
import { InventoryStatisticsController } from './inventory-statistics.controller';
import { InventoryStatisticsService } from './inventory-statistics.service';
import { InventoryService } from './inventory.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [InventoryController, InventoryCustodyController, InventoryStatisticsController],
    providers: [InventoryService, InventoryQueriesService, InventorySettingsService, InventoryCustodyService, InventoryUninstallationService, InventoryStatisticsService],
    exports: [InventoryService, InventoryStatisticsService],
})
export class InventoryModule { }
