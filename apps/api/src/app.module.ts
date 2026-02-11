import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { AccessModule } from './modules/access/access.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { LocationsModule } from './modules/locations/locations.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { AssetsModule } from './modules/assets/assets.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ClientsModule } from './modules/clients/clients.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { LabelsModule } from './modules/labels/labels.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
        }),
        PrismaModule,
        AuthModule,
        AccessModule,
        CatalogModule,
        LocationsModule,
        SuppliersModule,
        AssetsModule,
        InventoryModule,
        ClientsModule,
        TicketsModule,
        MaintenanceModule,
        PurchasesModule,
        LabelsModule,
    ],
    controllers: [AppController],
})
export class AppModule { }
