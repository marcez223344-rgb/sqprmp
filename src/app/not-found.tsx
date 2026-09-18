import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export default function NotFound() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-muted font-mono text-sm">404</p>
      <h1 className="mt-2 text-3xl">Página no encontrada</h1>
      <p className="text-muted mt-3">La dirección no existe o fue movida.</p>
      <Link href="/" className={cn(buttonVariants(), "mt-8")}>
        Ir al inicio
      </Link>
    </main>
  );
}
