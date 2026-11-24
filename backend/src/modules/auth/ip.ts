export function ipDaRequisicao(req: {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const encaminhado = req.headers?.['x-forwarded-for'];
  const bruto = Array.isArray(encaminhado) ? encaminhado[0] : encaminhado;
  if (typeof bruto === 'string' && bruto.trim()) {
    return bruto.split(',')[0].trim();
  }
  return req.ip || 'desconhecido';
}
