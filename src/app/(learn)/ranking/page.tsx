import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { limits } from "@/config/limits";
import { requireOnboardedProfile } from "@/lib/auth/session";
import {
  getLeaderboard,
  isLeaderboardEnabled,
  LEADERBOARD_PERIODS,
  parsePeriod,
  periodParam,
  type LeaderboardEntry,
  type LeaderboardPeriod,
} from "@/lib/progress/leaderboard";
import { cn } from "@/lib/utils/cn";

/** Typed routes reject a href string carrying a query, so the period travels as a UrlObject. */
function periodHref(period: LeaderboardPeriod) {
  return { pathname: "/ranking" as const, query: { periodo: periodParam(period) } };
}

export async function generateMetadata() {
  const t = await getTranslations("leaderboard");
  return { title: t("title") };
}

interface RankingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

/**
 * Opt-in ranking. The page is behind the `leaderboards` flag and renders nothing a learner has not
 * consented to publish: the RPC returns alias, avatar, level and XP of opted-in learners only.
 */
export default async function RankingPage({ searchParams }: RankingPageProps) {
  const [profile, params, enabled] = await Promise.all([
    requireOnboardedProfile("/ranking"),
    searchParams,
    isLeaderboardEnabled(),
  ]);
  if (!enabled) notFound();

  const period = parsePeriod(params.periodo);
  const [t, board] = await Promise.all([
    getTranslations("leaderboard"),
    getLeaderboard(profile, period),
  ]);

  return (
    <div className="container-page max-w-3xl space-y-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl">{t("title")}</h1>
        <p className="text-muted">{t("intro")}</p>
      </header>

      <nav aria-label={t("periodLabel")} className="flex gap-2">
        {LEADERBOARD_PERIODS.map((p) => (
          <Link
            key={p}
            href={periodHref(p)}
            aria-current={p === period ? "page" : undefined}
            className={cn(
              "border-border rounded-full border px-4 py-1.5 text-sm",
              p === period ? "bg-primary text-on-primary border-transparent" : "bg-surface",
            )}
          >
            {t(`periods.${p}`)}
          </Link>
        ))}
      </nav>

      {!board.participating ? (
        <Card className="space-y-2">
          <h2 className="text-lg">{t("notParticipating.title")}</h2>
          <p className="text-muted text-sm">{t("notParticipating.body")}</p>
          <Link href="/perfil" className="text-primary text-sm underline underline-offset-4">
            {t("notParticipating.cta")}
          </Link>
        </Card>
      ) : null}

      {board.enough ? (
        <Board t={t} board={board} />
      ) : (
        <Card className="space-y-2">
          <h2 className="text-lg">{t("tooFew.title")}</h2>
          <p className="text-muted text-sm">
            {t("tooFew.body", {
              participants: board.participants,
              minimum: limits.leaderboard.minParticipants,
            })}
          </p>
          {board.participating ? (
            <p className="text-muted text-sm">
              {t("tooFew.yourXp", { xp: selfXp(board.top, board.self) })}
            </p>
          ) : null}
        </Card>
      )}

      <p className="text-muted text-xs">{t("privacy")}</p>
    </div>
  );
}

function selfXp(top: LeaderboardEntry[], self: LeaderboardEntry | null): number {
  return (self ?? top.find((e) => e.isSelf))?.xp ?? 0;
}

function Board({
  t,
  board,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"leaderboard">>>;
  board: { period: LeaderboardPeriod; top: LeaderboardEntry[]; self: LeaderboardEntry | null };
}) {
  return (
    <div className="border-border bg-surface overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <caption className="text-muted px-4 py-3 text-left text-xs">
          {t(`caption.${board.period}`)}
        </caption>
        <thead className="text-muted border-border border-b text-xs">
          <tr>
            <th scope="col" className="px-4 py-2 text-left">
              {t("columns.position")}
            </th>
            <th scope="col" className="px-4 py-2 text-left">
              {t("columns.learner")}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {t("columns.level")}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {t("columns.xp")}
            </th>
          </tr>
        </thead>
        <tbody>
          {board.top.map((e) => (
            <Row key={`${e.rank}-${e.alias}`} t={t} entry={e} />
          ))}
          {board.self ? (
            <>
              <tr>
                <td colSpan={4} className="text-muted px-4 py-2 text-center text-xs">
                  {t("gap")}
                </td>
              </tr>
              <Row t={t} entry={board.self} />
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function Row({
  t,
  entry,
}: {
  t: Awaited<ReturnType<typeof getTranslations<"leaderboard">>>;
  entry: LeaderboardEntry;
}) {
  return (
    <tr className={cn("border-border border-t", entry.isSelf && "bg-surface-2 font-medium")}>
      <td className="px-4 py-2">{entry.rank}</td>
      <td className="px-4 py-2">
        <span className="inline-flex items-center gap-2">
          {entry.avatarPath ? (
            // eslint-disable-next-line @next/next/no-img-element -- static avatar asset, no layout shift
            <img
              src={entry.avatarPath}
              alt=""
              width={24}
              height={24}
              aria-hidden="true"
              className="size-6 rounded-full"
            />
          ) : null}
          <span>@{entry.alias}</span>
          {entry.isSelf ? (
            <span className="border-border text-muted rounded-full border px-2 py-0.5 text-xs">
              {t("you")}
            </span>
          ) : null}
        </span>
      </td>
      <td className="px-4 py-2 text-right">{entry.level}</td>
      <td className="px-4 py-2 text-right">{entry.xp}</td>
    </tr>
  );
}
