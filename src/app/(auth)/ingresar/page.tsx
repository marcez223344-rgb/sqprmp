import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/layout/logo";
import { Card } from "@/components/ui/card";
import { signInWithGoogle } from "@/lib/auth/actions";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";

export async function generateMetadata() {
  const t = await getTranslations("auth");
  return { title: t("title") };
}

const errorKeys = ["oauth", "missing_code", "exchange", "session"] as const;

export default async function LoginPage({ searchParams }: PageProps<"/ingresar">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : undefined);
  const errorParam = typeof params.error === "string" ? params.error : undefined;
  const errorKey = errorKeys.find((k) => k === errorParam);

  if (await getCurrentUser()) redirect(next);

  const t = await getTranslations("auth");

  return (
    <main id="contenido" className="container-page flex flex-1 items-center justify-center py-16">
      <Card className="w-full max-w-md space-y-6 text-center">
        <Link href="/" className="inline-flex justify-center rounded-md">
          <Logo />
        </Link>
        <div className="space-y-2">
          <h1 className="text-2xl">{t("title")}</h1>
          <p className="text-muted">{t("subtitle")}</p>
        </div>

        {errorKey ? (
          <p
            role="alert"
            className="border-danger/40 bg-danger/10 rounded-md border px-4 py-3 text-sm"
          >
            {t(`errors.${errorKey}`)}
          </p>
        ) : null}

        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={next} />
          <button
            type="submit"
            className="border-border bg-surface hover:bg-surface-2 focus-visible:outline-ring inline-flex h-12 w-full items-center justify-center gap-3 rounded-md border px-5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <GoogleMark />
            {t("googleButton")}
          </button>
        </form>

        <p className="text-muted text-xs">
          {t.rich("legal", {
            terms: (chunks) => (
              <Link href="/terminos" className="underline">
                {chunks}
              </Link>
            ),
            privacy: (chunks) => (
              <Link href="/privacidad" className="underline">
                {chunks}
              </Link>
            ),
          })}
        </p>
      </Card>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5">
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.4 14a6 6 0 0 1 0-3.9V7.5H3.1a10 10 0 0 0 0 9l3.3-2.5Z" />
      <path
        fill="#EA4335"
        d="M12 6c1.5 0 2.8.5 3.8 1.5l2.8-2.8A10 10 0 0 0 3.1 7.5L6.4 10C7.2 7.8 9.4 6 12 6Z"
      />
    </svg>
  );
}
