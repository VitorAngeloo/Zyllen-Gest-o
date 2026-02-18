import { IsString, Length, Matches } from 'class-validator';

export class ValidatePinDto {
    @IsString({ message: 'PIN é obrigatório' })
    @Length(4, 4, { message: 'PIN deve ter exatamente 4 dígitos' })
    @Matches(/^\d{4}$/, { message: 'PIN deve conter apenas números' })
    pin!: string;
}
