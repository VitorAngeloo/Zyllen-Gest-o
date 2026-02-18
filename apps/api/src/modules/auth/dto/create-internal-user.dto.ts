import { IsEmail, IsString, MinLength, IsUUID, IsOptional, Length, Matches } from 'class-validator';

export class CreateInternalUserDto {
    @IsString()
    @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
    name!: string;

    @IsEmail({}, { message: 'Email inválido' })
    email!: string;

    @IsString()
    @MinLength(6, { message: 'Senha deve ter no mínimo 6 caracteres' })
    password!: string;

    @IsUUID('4', { message: 'Role ID inválido' })
    roleId!: string;

    @IsOptional()
    @IsString()
    sector?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    @Length(4, 4, { message: 'PIN deve ter exatamente 4 dígitos' })
    @Matches(/^\d{4}$/, { message: 'PIN deve conter apenas números' })
    pin?: string;
}
