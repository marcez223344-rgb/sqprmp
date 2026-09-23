import Link from "next/link";
import { getFormatter, getTranslations } from "next-intl/server";
import { UserDirectoryTable } from "@/components/admin/user-directory-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth/session";
import {
  DIRECTORY_PAGE_SIZE,
  ENTITLEMENT_FILTERS,
  directoryHref,
  parseDirectoryParams,
} from "@/lib/admin/directory";
import { findUsersAdmin, getUserDetailAdmin, listUsersAdmin } from "@/lib/admin/queries";

export const metadata = { title: "Usuarios · Administración" };

const UUID = /^[0-9a-f-]{36}$/;
const EMAIL_LIKE = /@/;

/**
 * Admin user directory: everyone by default (newest first), sortable and filterable, paginated in
 * Postgres. The search box additionally resolves an exact email through admin_find_user, which is
 * the only place an email appears — never in the table and never in an aggregate.
 */
export default async function AdminUsersPage({ searchParams }: PageProps<"/admin/usuarios">) {
  await requireAdmin();
  const raw = await searchParams;
  const params = parseDirectoryParams(raw);
  const id = typeof raw.id === "string" && UUID.test(raw.id) ? raw.id : "";
  const byEmail = params.search.length >= 3 && EMAIL_LIKE.test(params.search);

  const [t, format, listing, emailMatches, detail] = await Promise.all([
    getTranslations("admin.users"),
    getFormatter(),
    listUsersAdmin(params),
    byEmail ? findUsersAdmin(params.search) : Promise.resolve([]),
    id ? getUserDetailAdmin(id) : Promise.resolve(null),
  ]);

  const date = (s: string | null) =>
    s ? format.dateTime(new Date(s), { dateStyle: "medium" }) : "—";
  const hasFilters = Boolean(
    params.search || params.country || params.entitlement || params.includeDeleted,
  );
  const pages = Math.max(1, Math.ceil(listing.total / DIRECTORY_PAGE_SIZE));
  const from = listing.total === 0 ? 0 : (params.page - 1) * DIRECTORY_PAGE_SIZE + 1;
  const to = Math.min(params.page * DIRECTORY_PAGE_SIZE, listing.total);

  return (
    <div className="container-page max-w-7xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
        <p className="text-sm">
          <Link href="/admin/metricas" className="text-primary underline underline-offset-4">
            {t("statsLink")}
          </Link>
        </p>
      </header>

      <Card>
        <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
          <fieldset className="contents">
            <legend className="sr-only">{t("filters.legend")}</legend>
            <label className="block grow">
              <span className="text-muted mb-1 block text-xs">{t("query")}</span>
              <input name="q" defaultValue={params.search} className="input h-9" maxLength={80} />
              <span className="text-muted mt-1 block text-xs">{t("searchHint")}</span>
            </label>
            <label className="block">
              <span className="text-muted mb-1 block text-xs">{t("filters.country")}</span>
              <input
                name="pais"
                defaultValue={params.country}
                className="input h-9 w-24 uppercase"
                maxLength={2}
                pattern="[A-Za-z]{2}"
                placeholder="AR"
              />
            </label>
            <label className="block">
              <span className="text-muted mb-1 block text-xs">{t("filters.access")}</span>
              <select name="acceso" defaultValue={params.entitlement} className="input h-9">
                <option value="">{t("filters.accessAny")}</option>
                {ENTITLEMENT_FILTERS.map((value) => (
                  <option key={value} value={value}>
                    {t(`access.${value}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex h-9 items-center gap-2">
              <input
                type="checkbox"
                name="borrados"
                value="1"
                defaultChecked={params.includeDeleted}
                className="size-4"
              />
              <span>{t("filters.includeDeleted")}</span>
            </label>
            <input type="hidden" name="orden" value={params.sort} />
            <input type="hidden" name="dir" value={params.desc ? "desc" : "asc"} />
            <Button type="submit" size="sm" variant="secondary">
              {t("filters.apply")}
            </Button>
            {hasFilters ? (
              <Link
                href="/admin/usuarios"
                className="text-primary text-sm underline underline-offset-4"
              >
                {t("filters.clear")}
              </Link>
            ) : null}
          </fieldset>
        </form>
      </Card>

      {emailMatches.length > 0 ? (
        <Card>
          <h2 className="mb-2 text-lg">{t("emailMatches")}</h2>
          <ul className="divide-border divide-y text-sm">
            {emailMatches.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  @{u.alias ?? "—"} · {u.display_name ?? "—"} ·{" "}
                  <span className="text-muted">{u.email ?? "—"}</span>
                </span>
                <Link
                  href={directoryHref(params, {}, { id: u.id })}
                  className="text-primary underline underline-offset-4"
                >
                  {t("open")}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card className="space-y-3">
        {listing.rows.length === 0 ? (
          <p className="text-muted text-sm">
            {hasFilters ? t("table.emptyFiltered") : t("table.empty")}
          </p>
        ) : (
          <>
            <p className="text-muted text-xs md:hidden">{t("table.scrollHint")}</p>
            <UserDirectoryTable rows={listing.rows} params={params} />
            <nav
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
              aria-label={t("pagination.label")}
            >
              <p className="text-muted" aria-live="polite">
                {t("pagination.summary", { from, to, total: listing.total })}
              </p>
              <span className="flex items-center gap-3">
                {params.page > 1 ? (
                  <Link
                    href={directoryHref(params, { page: params.page - 1 })}
                    className="text-primary underline underline-offset-4"
                    rel="prev"
                  >
                    {t("pagination.prev")}
                  </Link>
                ) : (
                  <span className="text-muted">{t("pagination.prev")}</span>
                )}
                <span>{t("pagination.page", { page: params.page, pages })}</span>
                {params.page < pages ? (
                  <Link
                    href={directoryHref(params, { page: params.page + 1 })}
                    className="text-primary underline underline-offset-4"
                    rel="next"
                  >
                    {t("pagination.next")}
                  </Link>
                ) : (
                  <span className="text-muted">{t("pagination.next")}</span>
                )}
              </span>
            </nav>
          </>
        )}
      </Card>

      {detail ? (
        <Card className="space-y-4">
          <h2 className="text-xl">
            @{detail.profile.alias ?? "—"} · {detail.profile.display_name ?? "—"}
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Item label={t("fields.id")} value={detail.profile.id} mono />
            <Item label={t("fields.email")} value={detail.email ?? "—"} />
            <Item
              label={t("fields.role")}
              value={t(`roles.${detail.profile.role === "admin" ? "admin" : "learner"}`)}
            />
            <Item label={t("fields.country")} value={detail.profile.country ?? "—"} />
            <Item label={t("fields.age")} value={detail.age === null ? "—" : String(detail.age)} />
            <Item label={t("fields.access")} value={t(`access.${detail.entitlement}`)} />
            <Item label={t("fields.createdAt")} value={date(detail.profile.created_at)} />
            <Item
              label={t("fields.onboarded")}
              value={date(detail.profile.onboarding_completed_at)}
            />
            <Item label={t("fields.lastActivity")} value={date(detail.lastActivity)} />
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
            {detail.profile.deleted_at ? (
              <Item label={t("fields.deletedAt")} value={date(detail.profile.deleted_at)} />
            ) : null}
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
