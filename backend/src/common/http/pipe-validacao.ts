import { BadRequestException, Injectable, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

function achatar(erros: ValidationError[], pai = ''): { field: string; message: string }[] {
  const saida: { field: string; message: string }[] = [];
  for (const erro of erros) {
    const campo = pai ? `${pai}.${erro.property}` : erro.property;
    if (erro.constraints) {
      const [chave, mensagem] = Object.entries(erro.constraints)[0];
      saida.push({
        field: campo,
        message: chave === 'whitelistValidation' ? 'Campo não permitido.' : mensagem,
      });
    }
    if (erro.children?.length) {
      saida.push(...achatar(erro.children, campo));
    }
  }
  return saida;
}

@Injectable()
export class PipeValidacao extends ValidationPipe {
  constructor() {
    super({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (erros: ValidationError[]) =>
        new BadRequestException({
          statusCode: 400,
          message: 'Dados inválidos.',
          errors: achatar(erros),
        }),
    });
  }
}
