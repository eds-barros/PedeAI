export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger bg-surface px-3 py-2 text-sm font-medium text-danger">
      {message}
    </div>
  );
}
