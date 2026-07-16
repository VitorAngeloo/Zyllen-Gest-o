import { ArrayNotEmpty, IsArray, IsIn, IsString, Length, MinLength } from 'class-validator';

export class ExitBatchDto {
    @IsArray()
    @ArrayNotEmpty({ message: 'Nenhum patrimônio informado' })
    @IsString({ each: true })
    assetIds!: string[];

    @IsString()
    @MinLength(1, { message: 'Motivo é obrigatório' })
    reason!: string;

    @IsString()
    @IsIn(['EM_USO', 'EM_MANUTENCAO', 'BAIXADO'], { message: 'Status inválido' })
    newStatus!: string;

    @IsString()
    @MinLength(1, { message: 'Evento da timeline é obrigatório' })
    eventDescription!: string;

    @IsString()
    @Length(4, 4, { message: 'PIN inválido' })
    pin!: string;
}
