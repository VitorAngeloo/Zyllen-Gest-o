import { IsString } from 'class-validator';

export class RefreshTokenDto {
    @IsString({ message: 'Refresh token é obrigatório' })
    refreshToken!: string;
}
