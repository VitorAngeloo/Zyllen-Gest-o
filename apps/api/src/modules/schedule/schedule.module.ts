import { Module, forwardRef } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { StructuresModule } from '../structures/structures.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule), StructuresModule],
    controllers: [ScheduleController],
    providers: [ScheduleService],
    exports: [ScheduleService],
})
export class ScheduleModule {}
