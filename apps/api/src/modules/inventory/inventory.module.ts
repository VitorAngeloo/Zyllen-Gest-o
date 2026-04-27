import { Module, forwardRef } from '@nestjs/common';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { StockLedgerService } from './stock-ledger.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [InventoryController],
    providers: [InventoryService, StockLedgerService],
    exports: [InventoryService, StockLedgerService],
})
export class InventoryModule { }
