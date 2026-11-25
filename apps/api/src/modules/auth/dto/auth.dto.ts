import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsUUID, MinLength, Validate } from 'class-validator';
import { SenhaForteConstraint } from '../senha';

export class LoginDto {
  @ApiProperty({ example: 'admin.pizzaria@pedeai.local' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;

  @ApiProperty({ example: 'PizzariaAdmin1' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @MinLength(1, { message: 'Informe a senha.' })
  password!: string;
}

export class RefreshDto {
  @ApiProperty({ example: 'refresh-opaco' })
  @IsString({ message: 'O refresh token deve ser um texto.' })
  @MinLength(1, { message: 'Informe o refresh token.' })
  refreshToken!: string;
}

export class EsqueciSenhaDto {
  @ApiProperty({ example: 'admin.pizzaria@pedeai.local' })
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  email!: string;
}

export class RedefinirSenhaDto {
  @ApiProperty({ example: 'token-opaco' })
  @IsString({ message: 'O token deve ser um texto.' })
  @MinLength(1, { message: 'Informe o token.' })
  token!: string;

  @ApiProperty({ example: 'NovaSenha1' })
  @IsString({ message: 'A senha deve ser um texto.' })
  @Validate(SenhaForteConstraint)
  newPassword!: string;
}

export class TrocarSenhaDto {
  @ApiProperty({ example: 'PizzariaAdmin1' })
  @IsString({ message: 'A senha atual deve ser um texto.' })
  @MinLength(1, { message: 'Informe a senha atual.' })
  currentPassword!: string;

  @ApiProperty({ example: 'NovaSenha1' })
  @IsString({ message: 'A nova senha deve ser um texto.' })
  @Validate(SenhaForteConstraint)
  newPassword!: string;
}

export class TrocarEmpresaDto {
  @ApiProperty({ example: '22222222-2222-4222-8222-222222222222' })
  @IsUUID('4', { message: 'Identificador de empresa inválido.' })
  companyId!: string;
}
