export default function Loading() {
  return (
    <div className="container-page py-24" role="status" aria-live="polite">
      <div className="bg-surface-2 h-8 w-1/3 animate-pulse rounded-md" />
      <div className="bg-surface-2 mt-4 h-4 w-2/3 animate-pulse rounded-md" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
