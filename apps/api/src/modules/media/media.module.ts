import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { AuthModule } from '../auth/auth.module';
import { MaintenanceMediaStorageService } from '../../infrastructure/storage/maintenance-media-storage.service';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({ imports: [AuthModule, AccessModule], controllers: [MediaController], providers: [MediaService, MaintenanceMediaStorageService], exports: [MediaService] })
export class MediaModule {}
