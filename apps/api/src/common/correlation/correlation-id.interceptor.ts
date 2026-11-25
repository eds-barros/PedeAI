import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AppLogger } from '../logger/app-logger.service';

@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  constructor(private readonly logger: AppLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const requestId = String(req.id ?? '');
    if (requestId && typeof res.header === 'function') {
      res.header('X-Request-Id', requestId);
    }
    this.logger.info(
      {
        requestId,
        method: req.method,
        url: req.url,
        body: req.body,
        headers: { authorization: req.headers?.authorization },
      },
      'requisicao',
    );
    return next.handle();
  }
}
