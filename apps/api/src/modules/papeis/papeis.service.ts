import { Injectable } from '@nestjs/common';
import { Papel } from '@prisma/client';
import { PERMISSOES_POR_PAPEL, ROTULO_PAPEL } from './permissoes';

@Injectable()
export class PapeisService {
  listar(): { role: Papel; label: string; permissions: string[] }[] {
    return (Object.keys(PERMISSOES_POR_PAPEL) as Papel[]).map((role) => ({
      role,
      label: ROTULO_PAPEL[role],
      permissions: [...PERMISSOES_POR_PAPEL[role]],
    }));
  }
}
