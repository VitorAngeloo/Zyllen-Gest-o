import {
    Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PermissionsGuard } from '../access/permissions.guard';
import { RequirePermission } from '../access/permissions.decorator';
import { LabelsService } from './labels.service';
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { printLabelSchema, createLabelTemplateSchema, updateLabelTemplateSchema } from '@zyllen/shared';

@Controller('labels')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class LabelsController {
    constructor(private readonly labelsService: LabelsService) { }

    @Post('print')
    @RequirePermission('labels.print')
    async registerPrint(@Request() req: any, @Body(new ZodValidationPipe(printLabelSchema)) body: { assetId: string }) {
        const data = await this.labelsService.registerPrint({ assetId: body.assetId, printedById: req.user.id });
        return { data, message: 'Impressão registrada' };
    }

    @Get('history')
    @RequirePermission('labels.view')
    async findAllPrints(@Query('assetId') assetId?: string) {
        const data = await this.labelsService.findAll({ assetId });
        return { data };
    }

    @Get('data/:assetId')
    @RequirePermission('labels.view')
    async getLabelData(@Param('assetId') assetId: string) {
        const data = await this.labelsService.getLabelData(assetId);
        return { data };
    }

    // ── Label Templates ──
    @Get('templates')
    @RequirePermission('labels.view')
    async findAllTemplates() {
        const data = await this.labelsService.findAllTemplates();
        return { data };
    }

    @Post('templates')
    @RequirePermission('settings.manage')
    async createTemplate(@Body(new ZodValidationPipe(createLabelTemplateSchema)) body: { name: string; layout: string }) {
        const data = await this.labelsService.createTemplate(body);
        return { data, message: 'Template criado' };
    }

    @Put('templates/:id')
    @RequirePermission('settings.manage')
    async updateTemplate(@Param('id') id: string, @Body(new ZodValidationPipe(updateLabelTemplateSchema)) body: { name?: string; layout?: string }) {
        const data = await this.labelsService.updateTemplate(id, body);
        return { data, message: 'Template atualizado' };
    }

    @Delete('templates/:id')
    @RequirePermission('settings.manage')
    async deleteTemplate(@Param('id') id: string) {
        await this.labelsService.deleteTemplate(id);
        return { message: 'Template excluído' };
    }
}
