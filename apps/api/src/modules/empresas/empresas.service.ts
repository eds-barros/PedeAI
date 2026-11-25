import { Injectable, NotFoundException } from '@nestjs/common';
import { Empresa, Papel } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AtualizarEmpresaDto } from './dto/empresas.dto';

type EmpresaPublica = {
  id: string;
  nomeFantasia: string;
  slug: string;
  logoUrl: string | null;
};

type EmpresaCompleta = EmpresaPublica & {
  razaoSocial: string;
  cnpj: string | null;
  telefone: string | null;
  email: string | null;
  endereco: string | null;
};

@Injectable()
export class EmpresasService {
  constructor(private readonly prisma: PrismaService) {}

  async atual(empresaId: string, papel: Papel): Promise<EmpresaPublica | EmpresaCompleta> {
    const empresa = await this.buscarAtiva(empresaId);
    return this.projetar(empresa, papel);
  }

  async atualizar(empresaId: string, dto: AtualizarEmpresaDto): Promise<EmpresaCompleta> {
    await this.buscarAtiva(empresaId);
    const empresa = await this.prisma.empresa.update({
      where: { id: empresaId },
      data: {
        ...(dto.nomeFantasia !== undefined ? { nomeFantasia: dto.nomeFantasia.trim() } : {}),
        ...(dto.razaoSocial !== undefined ? { razaoSocial: dto.razaoSocial.trim() } : {}),
        ...(dto.telefone !== undefined ? { telefone: dto.telefone.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email.trim().toLowerCase() } : {}),
        ...(dto.endereco !== undefined ? { endereco: dto.endereco.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl.trim() } : {}),
      },
    });
    return this.projetar(empresa, Papel.ADMIN) as EmpresaCompleta;
  }

  private async buscarAtiva(empresaId: string): Promise<Empresa> {
    const empresa = await this.prisma.empresa.findFirst({
      where: { id: empresaId, ativo: true },
    });
    if (!empresa) throw new NotFoundException('Empresa não encontrada.');
    return empresa;
  }

  private projetar(empresa: Empresa, papel: Papel): EmpresaPublica | EmpresaCompleta {
    const base: EmpresaPublica = {
      id: empresa.id,
      nomeFantasia: empresa.nomeFantasia,
      slug: empresa.slug,
      logoUrl: empresa.logoUrl,
    };
    if (papel === Papel.ADMIN || papel === Papel.GERENTE) {
      return {
        ...base,
        razaoSocial: empresa.razaoSocial,
        cnpj: empresa.cnpj,
        telefone: empresa.telefone,
        email: empresa.email,
        endereco: empresa.endereco,
      };
    }
    return base;
  }
}
