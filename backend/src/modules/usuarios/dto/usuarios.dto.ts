import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Papel } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  Validate,
} from 'class-validator';
import { SenhaForteConstraint } from '../../auth/senha';

export class CriarUsuarioDto {
  @ApiProperty({ example: 'Maria Souza' })
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  name!: string;

  @ApiProperty({ example: 'maria@pizzaria.local' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @ApiProperty({ example: 'SenhaTemp1' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @Validate(SenhaForteConstraint)
  password!: string;

  @ApiProperty({ enum: Papel, example: Papel.CAIXA })
  @IsEnum(Papel, { message: 'Papel inválido.' })
  role!: Papel;
}

export class AtualizarUsuarioDto {
  @ApiPropertyOptional({ example: 'Maria Souza' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  @MinLength(2, { message: 'O nome deve ter ao menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome deve ter no máximo 120 caracteres.' })
  name?: string;

  @ApiPropertyOptional({ enum: Papel, example: Papel.GERENTE })
  @IsOptional()
  @IsEnum(Papel, { message: 'Papel inválido.' })
  role?: Papel;
}

export class StatusUsuarioDto {
  @ApiProperty({ example: false })
  @IsBoolean({ message: 'Informe se o usuário fica ativo.' })
  active!: boolean;
}

export class ListarUsuariosQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'A página deve ser um número inteiro.' })
  @Min(1, { message: 'A página deve ser no mínimo 1.' })
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'pageSize deve ser um número inteiro.' })
  @Min(1, { message: 'pageSize deve ser no mínimo 1.' })
  @Max(100, { message: 'pageSize não pode ser maior que 100.' })
  pageSize?: number;

  @ApiPropertyOptional({ example: 'maria' })
  @IsOptional()
  @IsString({ message: 'A busca deve ser um texto.' })
  search?: string;

  @ApiPropertyOptional({ enum: Papel, example: Papel.CAIXA })
  @IsOptional()
  @IsEnum(Papel, { message: 'Papel inválido.' })
  role?: Papel;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return value;
  })
  @IsBoolean({ message: 'O filtro active deve ser true ou false.' })
  active?: boolean;
}
