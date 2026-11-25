import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply } from 'fastify';
import { AppLogger } from '../logger/app-logger.service';
import { MuitasTentativasException } from './muitas-tentativas.exception';

type ErroCorpo = {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
};

const TRADUCAO: Record<string, string> = {
  Unauthorized: 'Sessão inválida ou expirada.',
  'Unauthorized Exception': 'Sessão inválida ou expirada.',
  Forbidden: 'Você não tem permissão para esta ação.',
  'Forbidden Exception': 'Você não tem permissão para esta ação.',
  'Not Found': 'Registro não encontrado.',
  'Cannot GET': 'Registro não encontrado.',
  'Bad Request': 'Dados inválidos.',
  'Internal Server Error': 'Erro interno do servidor.',
  'Internal server error': 'Erro interno do servidor.',
};

@Catch()
export class FiltroExcecaoHttp implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const contexto = host.switchToHttp();
    const resposta = contexto.getResponse<FastifyReply>();
    const requisicao = contexto.getRequest<{ id?: string }>();
    const corpo = this.normalizar(exception);

    if (corpo.statusCode >= 500) {
      this.logger.error(
        {
          requestId: requisicao?.id,
          err: exception instanceof Error ? exception.message : 'erro',
        },
        'erro interno',
      );
    }

    if (exception instanceof MuitasTentativasException) {
      resposta.header('Retry-After', String(exception.retryAfterSeconds));
    }

    resposta.status(corpo.statusCode).send(corpo);
  }

  private normalizar(exception: unknown): ErroCorpo {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const bruto = exception.getResponse();
      if (typeof bruto === 'string') {
        return { statusCode: status, message: this.traduzir(bruto) };
      }
      const objeto = bruto as { message?: unknown; errors?: { field: string; message: string }[] };
      const mensagemBruta = Array.isArray(objeto.message)
        ? 'Dados inválidos.'
        : typeof objeto.message === 'string'
          ? objeto.message
          : this.mensagemPadrao(status);
      const corpo: ErroCorpo = {
        statusCode: status,
        message: this.traduzir(mensagemBruta),
      };
      if (Array.isArray(objeto.errors)) {
        corpo.errors = objeto.errors;
      }
      return corpo;
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return { statusCode: HttpStatus.CONFLICT, message: 'Registro duplicado.' };
      }
      if (exception.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Registro não encontrado.' };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor.',
    };
  }

  private traduzir(mensagem: string): string {
    return TRADUCAO[mensagem] ?? mensagem;
  }

  private mensagemPadrao(status: number): string {
    if (status === 401) return 'Sessão inválida ou expirada.';
    if (status === 403) return 'Você não tem permissão para esta ação.';
    if (status === 404) return 'Registro não encontrado.';
    if (status === 400) return 'Dados inválidos.';
    if (status === 409) return 'Conflito ao processar a solicitação.';
    if (status === 429) return 'Muitas tentativas. Tente novamente mais tarde.';
    return 'Erro interno do servidor.';
  }
}
