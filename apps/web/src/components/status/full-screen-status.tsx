export function FullScreenStatus({ label }: { label: string }) {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <p role="status" className="text-sm font-medium text-muted">
        {label}
      </p>
    </div>
  );
}
