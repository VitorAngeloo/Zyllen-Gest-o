import { Module, forwardRef } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { ClientTicketsController } from './client-tickets.controller';
import { TicketsService } from './tickets.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [TicketsController, ClientTicketsController],
    providers: [TicketsService],
    exports: [TicketsService],
})
export class TicketsModule { }
