import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AccessModule } from '../access/access.module';
import { ProductExitsService } from './product-exits.service';
import { ProductExitsController } from './product-exits.controller';

@Module({
    imports: [PrismaModule, AccessModule],
    controllers: [ProductExitsController],
    providers: [ProductExitsService],
    exports: [ProductExitsService],
})
export class ProductExitsModule { }
