import Link from "next/link";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto grid min-h-dvh max-w-lg place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Página não encontrada</h1>
        <p className="mt-2 text-muted">O endereço não existe no PedeAI.</p>
        <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-accent">
          Voltar ao início
        </Link>
      </div>
    </main>
  );
}
