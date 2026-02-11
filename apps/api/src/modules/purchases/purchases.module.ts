import { Module, forwardRef } from '@nestjs/common';
import { PurchasesController } from './purchases.controller';
import { PurchasesService } from './purchases.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [PurchasesController],
    providers: [PurchasesService],
    exports: [PurchasesService],
})
export class PurchasesModule { }
