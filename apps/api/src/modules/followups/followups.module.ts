import { Module, forwardRef } from '@nestjs/common';
import { FollowupsController } from './followups.controller';
import { ClientFollowupsController } from './client-followups.controller';
import { FollowupsService } from './followups.service';
import { FollowupChecklistService } from './followup-checklist.service';
import { FollowupChecklistCatalogService } from './followup-checklist-catalog.service';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';

@Module({
    imports: [forwardRef(() => AuthModule), forwardRef(() => AccessModule)],
    controllers: [FollowupsController, ClientFollowupsController],
    providers: [FollowupsService, FollowupChecklistService, FollowupChecklistCatalogService],
    exports: [FollowupsService],
})
export class FollowupsModule { }
