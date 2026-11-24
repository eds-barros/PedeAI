"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="conteudo" className="mx-auto grid min-h-dvh max-w-lg place-items-center px-6 text-center">
      <div>
        <h1 className="text-3xl font-semibold">Algo saiu do esperado</h1>
        <p className="mt-2 text-muted">Tente de novo. Se continuar, recarregue a página.</p>
        <button
          type="button"
          className="mt-6 inline-flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          onClick={reset}
        >
          Tentar de novo
        </button>
      </div>
    </main>
  );
}
