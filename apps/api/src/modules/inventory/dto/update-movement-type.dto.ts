import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMovementTypeDto {
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Nome é obrigatório' })
    name?: string;

    @IsOptional()
    @IsBoolean()
    requiresApproval?: boolean;

    @IsOptional()
    @IsBoolean()
    isFinalWriteOff?: boolean;

    @IsOptional()
    @IsString()
    setsAssetStatus?: string;
}
