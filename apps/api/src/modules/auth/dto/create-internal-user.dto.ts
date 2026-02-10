import { IsEmail, IsString, MinLength, IsUUID } from 'class-validator';

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
}
