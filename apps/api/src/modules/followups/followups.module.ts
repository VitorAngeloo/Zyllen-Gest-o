import { Module, forwardRef } from '@nestjs/common';
import { FollowupsController } from './followups.controller';
import { FollowupsService } from './followups.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [FollowupsController],
    providers: [FollowupsService],
    exports: [FollowupsService],
})
export class FollowupsModule { }
