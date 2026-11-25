export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <section className="max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">Em breve</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-base text-muted">{description}</p>
      <p className="mt-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted shadow-card">
        Esta área entra nas próximas sprints. O menu e a proteção da rota já respeitam o papel na empresa ativa.
      </p>
    </section>
  );
}
