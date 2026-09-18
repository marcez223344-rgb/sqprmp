"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Error details go to the server logs via Next.js; never render internals to the user.
    console.error(error.digest ?? error.message);
  }, [error]);
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <h1 className="text-3xl">Algo salió mal</h1>
      <p className="text-muted mt-3">Ocurrió un error inesperado. Puedes intentar de nuevo.</p>
      <Button className="mt-8" onClick={reset}>
        Reintentar
      </Button>
    </main>
  );
}
