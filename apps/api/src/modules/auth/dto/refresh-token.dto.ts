import { IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
    // Optional: token can arrive via httpOnly cookie (preferred) or body (backwards compat)
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
