import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import { findUsersAdmin, getUserDetailAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Usuarios · Administración" };

const QUERY = /^[A-Za-z0-9@._+-]{3,120}$/;
const UUID = /^[0-9a-f-]{36}$/;

/** Lookup by alias, email or id; detail shows entitlements, purchases, certificates and totals. */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requireAdmin();
  const params = await searchParams;
  const q = typeof params.q === "string" && QUERY.test(params.q) ? params.q : "";
  const id = typeof params.id === "string" && UUID.test(params.id) ? params.id : "";
  const [t, format, results, detail] = await Promise.all([
    getTranslations("admin.users"),
    getFormatter(),
    q ? findUsersAdmin(q) : Promise.resolve([]),
    id ? getUserDetailAdmin(id) : Promise.resolve(null),
  ]);
  const date = (s: string | null) =>
    s ? format.dateTime(new Date(s), { dateStyle: "medium" }) : "—";
  return (
    <div className="container-page max-w-5xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>
      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <label className="block grow">
            <span className="text-muted mb-1 block text-xs">{t("query")}</span>
            <input
              name="q"
              defaultValue={q}
              className="input h-9"
              minLength={3}
              maxLength={120}
              required
            />
          </label>
          <Button type="submit" size="sm" variant="secondary">
            {t("search")}
          </Button>
        </form>
        {q ? (
          results.length === 0 ? (
            <p className="text-muted mt-3 text-sm">{t("noResults")}</p>
          ) : (
            <ul className="mt-3 divide-y text-sm">
              {results.map((u) => (
                <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    @{u.alias ?? "—"} · {u.display_name ?? "—"} ·{" "}
                    <span className="text-muted">{u.email ?? "—"}</span> · {u.role}
                    {u.deleted_at ? <span className="text-danger"> · {t("deleted")}</span> : null}
                  </span>
                  <Link
                    href={`/admin/usuarios?q=${encodeURIComponent(q)}&id=${u.id}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {t("open")}
                  </Link>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </Card>

      {detail ? (
        <Card className="space-y-4">
          <h2 className="text-xl">
            @{detail.profile.alias ?? "—"} · {detail.profile.display_name ?? "—"}
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label={t("fields.id")} value={detail.profile.id} mono />
            <Item label={t("fields.role")} value={detail.profile.role} />
            <Item label={t("fields.country")} value={detail.profile.country ?? "—"} />
            <Item label={t("fields.createdAt")} value={date(detail.profile.created_at)} />
            <Item
              label={t("fields.onboarded")}
              value={date(detail.profile.onboarding_completed_at)}
            />
            <Item
              label={t("fields.progress")}
              value={t("progressValue", {
                completed: detail.exercisesCompleted,
                started: detail.exercisesStarted,
              })}
            />
            <Item label={t("fields.level")} value={String(detail.totals?.level ?? 1)} />
            <Item label={t("fields.xp")} value={String(detail.totals?.xp_total ?? 0)} />
            <Item label={t("fields.coins")} value={String(detail.totals?.coin_balance ?? 0)} />
          </dl>

          <section>
            <h3 className="mb-1 font-semibold">{t("entitlements")}</h3>
            {detail.entitlements.length === 0 ? (
              <p className="text-muted text-sm">{t("none")}</p>
            ) : (
              <ul className="text-sm">
                {detail.entitlements.map((e) => (
                  <li key={e.id}>
                    {e.source} · {date(e.starts_at)} → {e.ends_at ? date(e.ends_at) : "∞"}
                    {e.revoked_at ? <span className="text-danger"> · {t("revoked")}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">{t("purchases")}</h3>
            {detail.purchases.length === 0 ? (
              <p className="text-muted text-sm">{t("none")}</p>
            ) : (
              <ul className="text-sm">
                {detail.purchases.map((p) => (
                  <li key={p.id}>
                    {p.provider} · {p.status} ·{" "}
                    {format.number(p.amount_minor / 100, {
                      style: "currency",
                      currency: p.currency,
                    })}{" "}
                    · {date(p.created_at)}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h3 className="mb-1 font-semibold">{t("certificates")}</h3>
            {detail.certificates.length === 0 ? (
              <p className="text-muted text-sm">{t("none")}</p>
            ) : (
              <ul className="text-sm">
                {detail.certificates.map((c) => (
                  <li key={c.public_id}>
                    <span className="font-mono">{c.public_id}</span> ·{" "}
                    {(c.certificate_requirements as { title: string } | null)?.title ?? "—"} ·{" "}
                    {date(c.issued_at)}
                    {c.revoked_at ? <span className="text-danger"> · {t("revoked")}</span> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
          <p className="text-muted text-sm">
            <Link href="/admin/accesos" className="underline underline-offset-4">
              {t("goAccess")}
            </Link>
          </p>
        </Card>
      ) : null}
    </div>
  );
}

function Item({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-muted text-xs">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
