import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class AtualizarEmpresaDto {
  @ApiPropertyOptional({ example: 'Pizzaria Bella Napoli' })
  @IsOptional()
  @IsString({ message: 'O nome fantasia deve ser um texto.' })
  @MinLength(2, { message: 'O nome fantasia deve ter ao menos 2 caracteres.' })
  @MaxLength(120, { message: 'O nome fantasia deve ter no máximo 120 caracteres.' })
  nomeFantasia?: string;

  @ApiPropertyOptional({ example: 'Pizzaria Bella Napoli Ltda' })
  @IsOptional()
  @IsString({ message: 'A razão social deve ser um texto.' })
  @MinLength(2, { message: 'A razão social deve ter ao menos 2 caracteres.' })
  @MaxLength(160, { message: 'A razão social deve ter no máximo 160 caracteres.' })
  razaoSocial?: string;

  @ApiPropertyOptional({ example: '1133334444' })
  @IsOptional()
  @IsString({ message: 'O telefone deve ser um texto.' })
  @MaxLength(20, { message: 'O telefone deve ter no máximo 20 caracteres.' })
  telefone?: string;

  @ApiPropertyOptional({ example: 'contato@pizzaria.local' })
  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email?: string;

  @ApiPropertyOptional({ example: 'Rua das Pizzas, 100, São Paulo' })
  @IsOptional()
  @IsString({ message: 'O endereço deve ser um texto.' })
  @MaxLength(240, { message: 'O endereço deve ter no máximo 240 caracteres.' })
  endereco?: string;

  @ApiPropertyOptional({ example: 'https://cdn.exemplo/logo.png' })
  @IsOptional()
  @IsString({ message: 'A URL do logo deve ser um texto.' })
  @MaxLength(500, { message: 'A URL do logo deve ter no máximo 500 caracteres.' })
  logoUrl?: string;
}
