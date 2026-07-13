import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class ExitReasonDto {
    @IsOptional()
    @IsString()
    @MinLength(1, { message: 'Nome é obrigatório' })
    name?: string;

    @IsOptional()
    @IsBoolean()
    active?: boolean;
}
