import { HttpException, HttpStatus } from '@nestjs/common';

export class MuitasTentativasException extends HttpException {
  constructor(readonly retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Muitas tentativas. Tente novamente mais tarde.',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
