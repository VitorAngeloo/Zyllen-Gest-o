import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AccessModule } from '../access/access.module';
import { StructuresService } from './structures.service';
import { StructureCyclesService } from './structure-cycles.service';
import { StructuresController } from './structures.controller';
@Module({ imports: [AuthModule, AccessModule], controllers: [StructuresController], providers: [StructuresService, StructureCyclesService], exports: [StructureCyclesService] })
export class StructuresModule {}
