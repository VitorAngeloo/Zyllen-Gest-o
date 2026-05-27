import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateMyProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    name?: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'Senha atual deve ter no mínimo 6 caracteres' })
    currentPassword?: string;

    @IsOptional()
    @IsString()
    @MinLength(6, { message: 'Nova senha deve ter no mínimo 6 caracteres' })
    password?: string;
}
