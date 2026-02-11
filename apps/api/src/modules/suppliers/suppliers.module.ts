import { Module, forwardRef } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller';
import { SuppliersService } from './suppliers.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [SuppliersController],
    providers: [SuppliersService],
    exports: [SuppliersService],
})
export class SuppliersModule { }
