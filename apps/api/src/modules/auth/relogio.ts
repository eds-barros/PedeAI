import { Injectable } from '@nestjs/common';

@Injectable()
export class Relogio {
  agora(): number {
    return Date.now();
  }
}
