import { Module, forwardRef } from '@nestjs/common';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [forwardRef(() => AuthModule)],
    controllers: [AccessController],
    providers: [AccessService],
    exports: [AccessService],
})
export class AccessModule { }
