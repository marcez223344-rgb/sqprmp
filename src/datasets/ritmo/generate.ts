import { DAY_MS, Prng, toDate, toIso, utc } from "../_shared/prng";
import type { Cell, GeneratedDataset, GeneratedTable } from "../_shared/types";
import { config, markets, type MarketCode } from "./config";
import { schemaSql } from "./schema";
import {
  albumWords,
  artistPatternsEs,
  artistPatternsPt,
  genresByCountry,
  playlistNames,
  trackWordsEs,
  trackWordsPt,
} from "./vocab";

/**
 * Ritmo generator — deterministic synthetic music-streaming data (docs/CURRICULUM.md §4).
 *
 * Every artist, album and track title is invented from word pools; no real company, artist or
 * song is represented. Business rules enforced by the generator (and asserted in verify.ts):
 *  - a play happens after the listener signed up, before the dataset's "today" and never after
 *    the listener churned;
 *  - a play never predates the release date of the track's album;
 *  - `completed` is true exactly when `seconds_played` covers ≥ 90 % of the track duration
 *    (except on the deliberately corrupted rows listed below);
 *  - a listener only subscribes after their first play; subscriptions of one user never overlap
 *    and `users.plan_tier` is the plan of the open subscription ('free' when there is none);
 *  - the price of a subscription is the catalogue price of its plan in the listener's currency;
 *  - `artists.monthly_listeners` is a published figure never below the distinct listeners the
 *    artist actually had in the last 30 days;
 *  - playlist tracks are unique inside a playlist, numbered 1..n, added after the playlist was
 *    created; follows are unique per (listener, artist).
 *
 * Deliberate quality issues (counts in README.md and checked in verify.ts): exact duplicate
 * play rows, NULL `device`, NULL `seconds_played`, negative `seconds_played`, and plays whose
 * `seconds_played` exceeds the track duration.
 *
 * Distributions: artist popularity follows a Zipf-like long tail with a home-country bias;
 * listening concentrates in the local evening (18–23 h), on Fridays/weekends and in December;
 * listener intensity is power-law; churn follows an exponential lifetime, so older signup
 * cohorts retain less — which is exactly what the cohort/retention exercises need.
 */
export function generate(): GeneratedDataset {
  const rng = new Prng(config.seed);
  const start = utc(2024, 1, 1); // a Monday
  const today = utc(2025, 9, 15, 12, 0);
  const span = today - start;
  const lastDay = Math.floor((today - start) / DAY_MS);

  const marketByCode = new Map(markets.map((m) => [m.code, m]));
  const pickMarket = () => rng.weighted(markets.map((m) => ({ value: m, weight: m.weight })));

  // ---------------------------------------------------------------- artists, albums, tracks
  const artists: Cell[][] = [];
  const artistCountry: string[] = [];
  const usedArtistNames = new Set<string>();
  const artistName = (code: string): string => {
    const patterns = code === "BR" ? artistPatternsPt : artistPatternsEs;
    for (let attempt = 0; attempt < 12; attempt++) {
      const name = rng.pick(patterns)(rng);
      if (!usedArtistNames.has(name)) {
        usedArtistNames.add(name);
        return name;
      }
    }
    const fallback = `${rng.pick(patterns)(rng)} ${usedArtistNames.size}`;
    usedArtistNames.add(fallback);
    return fallback;
  };

  for (let id = 1; id <= config.volumes.artists; id++) {
    const market = pickMarket();
    artistCountry.push(market.code);
    artists.push([
      id,
      artistName(market.code),
      market.code,
      rng.pick(genresByCountry[market.code] ?? genresByCountry.MX!),
      0, // monthly_listeners, filled once the plays are known
    ]);
  }

  const albums: Cell[][] = [];
  const tracks: Cell[][] = [];
  const tracksOfArtist = new Map<number, number[]>();
  const hitsOfArtist = new Map<number, number[]>();
  const trackDuration = new Map<number, number>();
  const trackRelease = new Map<number, number>();
  const usedTitles = new Set<string>();
  const uniqueTitle = (make: () => string): string => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const t = make();
      if (!usedTitles.has(t)) {
        usedTitles.add(t);
        return t;
      }
    }
    const t = `${make()} (${usedTitles.size})`;
    usedTitles.add(t);
    return t;
  };

  for (let artistId = 1; artistId <= config.volumes.artists; artistId++) {
    const code = artistCountry[artistId - 1]!;
    const words = code === "BR" ? trackWordsPt : trackWordsEs;
    const albumCount = rng.weighted([
      { value: 1, weight: 26 },
      { value: 2, weight: 32 },
      { value: 3, weight: 24 },
      { value: 4, weight: 12 },
      { value: 5, weight: 6 },
    ]);
    // Releases spread over 2018-01-01 .. 2025-06-30 so most catalogue predates the play window.
    const firstRelease = utc(2018, 1, 1) + rng.int(0, 1600) * DAY_MS;
    for (let a = 0; a < albumCount; a++) {
      const released = Math.min(
        utc(2025, 6, 30),
        firstRelease + a * rng.int(180, 640) * DAY_MS + rng.int(0, 60) * DAY_MS,
      );
      const albumId = albums.length + 1;
      albums.push([
        albumId,
        artistId,
        uniqueTitle(() => `${rng.pick(albumWords.a)} ${rng.pick(albumWords.b)}`),
        toDate(released),
      ]);
      const trackCount = rng.int(5, 12);
      for (let k = 0; k < trackCount; k++) {
        const trackId = tracks.length + 1;
        // Durations: mostly 2:30–4:30, a few long closing tracks.
        const duration = rng.chance(0.06)
          ? rng.int(330, 560)
          : Math.max(95, Math.min(330, Math.round(rng.normal(205, 42))));
        tracks.push([
          trackId,
          albumId,
          uniqueTitle(() => `${rng.pick(words.a)} ${rng.pick(words.b)}`),
          duration,
          rng.chance(0.17),
        ]);
        trackDuration.set(trackId, duration);
        trackRelease.set(trackId, released);
        tracksOfArtist.set(artistId, [...(tracksOfArtist.get(artistId) ?? []), trackId]);
        // The first two tracks of every album are the "singles" that get most of the streams.
        if (k < 2) hitsOfArtist.set(artistId, [...(hitsOfArtist.get(artistId) ?? []), trackId]);
      }
    }
  }

  // Zipf-like popularity: a shuffled rank per artist so popularity is not correlated with id.
  const ranks = rng.shuffle(Array.from({ length: config.volumes.artists }, (_, i) => i + 1));
  const artistPopularity = ranks.map((r) => 1 / Math.pow(r, 0.95));
  /** Cumulative-weight pools for O(log n) weighted picks. */
  const buildPool = (ids: number[]) => {
    const cum: number[] = [];
    let total = 0;
    for (const id of ids) {
      total += artistPopularity[id - 1]!;
      cum.push(total);
    }
    return { ids, cum, total };
  };
  const pickFromPool = (pool: { ids: number[]; cum: number[]; total: number }): number => {
    const target = rng.next() * pool.total;
    let lo = 0;
    let hi = pool.cum.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (pool.cum[mid]! < target) lo = mid + 1;
      else hi = mid;
    }
    return pool.ids[lo]!;
  };
  const globalPool = buildPool(Array.from({ length: config.volumes.artists }, (_, i) => i + 1));
  const countryPool = new Map<string, ReturnType<typeof buildPool>>();
  for (const m of markets) {
    const ids = artistCountry
      .map((c, i) => (c === m.code ? i + 1 : 0))
      .filter((id): id is number => id > 0);
    countryPool.set(m.code, buildPool(ids.length ? ids : globalPool.ids));
  }

  // ------------------------------------------------------------------------------- listeners
  const ageBands = [
    { value: "18-24", weight: 26 },
    { value: "25-34", weight: 38 },
    { value: "35-44", weight: 21 },
    { value: "45-54", weight: 10 },
    { value: "55+", weight: 5 },
  ];
  interface UserState {
    id: number;
    code: MarketCode;
    offset: number;
    currency: string;
    signup: number;
    /** Last instant with activity: churn moment or the dataset's today. */
    activeUntil: number;
    churnedAt: number | null;
    weight: number;
    favorites: number[];
  }
  const users: UserState[] = [];
  for (let id = 1; id <= config.volumes.users; id++) {
    const market = pickMarket();
    // Growth over time: exponent < 1 pushes signups towards the recent months.
    const signup = start + Math.floor(Math.pow(rng.next(), 0.72) * span);
    const tenureDays = (today - signup) / DAY_MS;
    // 55 % of listeners are churn-prone with an exponential lifetime (mean 300 days).
    const churnProne = rng.chance(0.55);
    const lifeDays = Math.max(3, Math.round(-Math.log(1 - rng.next()) * 300));
    const churns = churnProne && lifeDays < tenureDays - 20;
    const churnedAt = churns ? signup + lifeDays * DAY_MS + rng.int(0, 23) * 3_600_000 : null;
    const favCount = rng.int(3, 8);
    const favorites: number[] = [];
    for (let f = 0; f < favCount; f++) {
      const pool = rng.chance(0.62) ? countryPool.get(market.code)! : globalPool;
      const a = pickFromPool(pool);
      if (!favorites.includes(a)) favorites.push(a);
    }
    users.push({
      id,
      code: market.code,
      offset: market.utcOffset,
      currency: market.currency,
      signup,
      activeUntil: churnedAt ?? today,
      churnedAt,
      weight: rng.pareto(1.15, 45),
      favorites,
    });
  }

  const userRows: Cell[][] = users.map((u) => [
    u.id,
    u.code,
    toIso(u.signup),
    "free", // replaced once subscriptions are known
    rng.weighted(ageBands),
    u.churnedAt === null ? null : toIso(u.churnedAt),
  ]);

  // ----------------------------------------------------------------------------------- plays
  const hourWeights: { value: number; weight: number }[] = [
    2, 1, 1, 0.5, 0.5, 0.5, 1, 3, 5, 4, 4, 4, 5, 5, 4, 4, 4, 5, 7, 10, 12, 12, 10, 6,
  ].map((weight, value) => ({ value, weight }));

  const activeDaysOf = (u: UserState) =>
    Math.max(1, Math.round((u.activeUntil - u.signup) / DAY_MS));
  const weightedDays = users.map((u) => u.weight * activeDaysOf(u));
  const totalWeightedDays = weightedDays.reduce((a, b) => a + b, 0);

  interface Play {
    user: number;
    track: number;
    at: number;
    seconds: number | null;
    device: string | null;
    completed: boolean;
  }
  const plays: Play[] = [];
  const devices = [
    { value: "mobile", weight: 58 },
    { value: "desktop", weight: 16 },
    { value: "web", weight: 12 },
    { value: "tv", weight: 8 },
    { value: "speaker", weight: 6 },
  ];

  for (const u of users) {
    const target = Math.min(
      2500,
      Math.round((weightedDays[u.id - 1]! / totalWeightedDays) * config.volumes.plays),
    );
    if (target === 0) continue;
    const dStart = Math.floor((u.signup - start) / DAY_MS);
    const dEnd = Math.min(lastDay, Math.floor((u.activeUntil - start) / DAY_MS));
    if (dEnd < dStart) continue;
    const homePool = countryPool.get(u.code)!;
    for (let n = 0; n < target; n++) {
      // Day with seasonality (rejection sampling against the maximum factor 1.5).
      let day = dStart;
      for (let attempt = 0; attempt < 6; attempt++) {
        day = rng.int(dStart, dEnd);
        const dow = day % 7; // 0 = Monday, because `start` is a Monday
        const month = new Date(start + day * DAY_MS).getUTCMonth() + 1;
        const factor =
          (dow >= 4 ? 1.25 : 1) * (month === 12 ? 1.2 : 1) * (day - dStart < 30 ? 1.12 : 1);
        if (rng.next() < factor / 1.68) break;
      }
      const localHour = rng.weighted(hourWeights);
      const at =
        start +
        day * DAY_MS +
        (localHour - u.offset) * 3_600_000 +
        rng.int(0, 59) * 60_000 +
        rng.int(0, 59) * 1000;
      if (at < u.signup || at >= today || at > u.activeUntil) continue;

      // Artist: mostly the listener's favourites, otherwise the long tail (home country biased).
      let artistId: number;
      if (rng.chance(0.56) && u.favorites.length) artistId = rng.pick(u.favorites);
      else artistId = pickFromPool(rng.chance(0.6) ? homePool : globalPool);

      // Track: singles first, and never a track released after the play.
      let trackId = 0;
      for (let attempt = 0; attempt < 4; attempt++) {
        const hits = hitsOfArtist.get(artistId) ?? [];
        const all = tracksOfArtist.get(artistId) ?? [];
        if (!all.length) break;
        const candidate = rng.chance(0.45) && hits.length ? rng.pick(hits) : rng.pick(all);
        if (trackRelease.get(candidate)! <= at) {
          trackId = candidate;
          break;
        }
      }
      if (trackId === 0) continue;

      const duration = trackDuration.get(trackId)!;
      const roll = rng.next();
      let seconds: number;
      let completed: boolean;
      if (roll < 0.14) {
        seconds = rng.int(2, 28); // skipped in the first seconds
        completed = false;
      } else if (roll < 0.34) {
        // Abandoned halfway: always below the 90 % completion threshold.
        seconds = rng.int(29, Math.max(30, Math.floor(duration * 0.88)));
        completed = false;
      } else {
        seconds = duration - rng.int(0, 2);
        completed = true;
      }
      plays.push({
        user: u.id,
        track: trackId,
        at,
        seconds,
        device: rng.weighted(devices),
        completed,
      });
    }
  }

  // --------------------------------------------------- deliberate quality issues on the plays
  const anomalyOrder = rng.shuffle(plays.map((_, i) => i));
  let cursor = 0;
  const takeIndices = (n: number) => anomalyOrder.slice(cursor, (cursor += n));

  const nullDeviceCount = Math.round(plays.length * 0.016);
  for (const i of takeIndices(nullDeviceCount)) plays[i]!.device = null;

  const nullSecondsIdx = takeIndices(90);
  for (const i of nullSecondsIdx) {
    plays[i]!.seconds = null;
    plays[i]!.completed = false;
  }

  const negativeIdx = takeIndices(120);
  for (const i of negativeIdx) {
    plays[i]!.seconds = -rng.int(1, 600);
    plays[i]!.completed = false;
  }

  const overrunIdx = takeIndices(210);
  for (const i of overrunIdx) {
    const p = plays[i]!;
    p.seconds = trackDuration.get(p.track)! + rng.int(30, 4000);
    p.completed = true;
  }

  const duplicateIdx = takeIndices(340);
  for (const i of duplicateIdx) {
    const p = plays[i]!;
    plays.push({ ...p });
  }

  plays.sort(
    (a, b) =>
      a.at - b.at || a.user - b.user || a.track - b.track || (a.seconds ?? 0) - (b.seconds ?? 0),
  );
  const playRows: Cell[][] = plays.map((p, i) => [
    i + 1,
    p.user,
    p.track,
    toIso(p.at),
    p.seconds,
    p.device,
    p.completed,
  ]);

  // ------------------------------------------------------- per-listener aggregates for funnels
  const firstPlay = new Map<number, number>();
  const lastPlay = new Map<number, number>();
  const artistsHeard = new Map<number, Set<number>>();
  const tracksHeard = new Map<number, number[]>();
  const artistOfTrack = new Map<number, number>();
  for (const [artistId, list] of tracksOfArtist)
    for (const t of list) artistOfTrack.set(t, artistId);
  const listeners30 = new Map<number, Set<number>>();
  const cut30 = today - 30 * DAY_MS;
  for (const p of plays) {
    if (!firstPlay.has(p.user) || p.at < firstPlay.get(p.user)!) firstPlay.set(p.user, p.at);
    if (!lastPlay.has(p.user) || p.at > lastPlay.get(p.user)!) lastPlay.set(p.user, p.at);
    const artistId = artistOfTrack.get(p.track)!;
    if (!artistsHeard.has(p.user)) artistsHeard.set(p.user, new Set());
    artistsHeard.get(p.user)!.add(artistId);
    const heard = tracksHeard.get(p.user);
    if (heard === undefined) tracksHeard.set(p.user, [p.track]);
    else if (heard.length < 120) heard.push(p.track);
    if (p.at >= cut30) {
      if (!listeners30.has(artistId)) listeners30.set(artistId, new Set());
      listeners30.get(artistId)!.add(p.user);
    }
  }

  // artists.monthly_listeners: published figure, always ≥ the observed 30-day audience.
  for (const row of artists) {
    const observed = listeners30.get(row[0] as number)?.size ?? 0;
    row[4] = observed * rng.int(180, 420) + rng.int(0, 500) + observed;
  }

  // ------------------------------------------------------------------ playlists and their tracks
  const playlists: Cell[][] = [];
  const playlistTracks: Cell[][] = [];
  for (const u of users) {
    const heard = tracksHeard.get(u.id);
    const first = firstPlay.get(u.id);
    if (!heard || first === undefined) continue;
    if (!rng.chance(0.42)) continue;
    const count = rng.weighted([
      { value: 1, weight: 55 },
      { value: 2, weight: 26 },
      { value: 3, weight: 13 },
      { value: 4, weight: 6 },
    ]);
    for (let k = 0; k < count; k++) {
      const createdAt =
        first + rng.int(0, Math.max(1, Math.floor((u.activeUntil - first) / 1000))) * 1000;
      if (createdAt >= today) continue;
      const playlistId = playlists.length + 1;
      playlists.push([
        playlistId,
        u.id,
        rng.pick(playlistNames),
        toIso(createdAt),
        rng.chance(0.34),
      ]);
      const size = Math.min(heard.length, rng.int(4, 34));
      const used = new Set<number>();
      let position = 0;
      for (let s = 0; s < size; s++) {
        const trackId = rng.pick(heard);
        if (used.has(trackId)) continue;
        used.add(trackId);
        position++;
        const addedAt = Math.min(
          today - 1000,
          createdAt +
            rng.int(0, Math.max(1, Math.floor((u.activeUntil - createdAt) / 1000))) * 1000,
        );
        playlistTracks.push([
          playlistTracks.length + 1,
          playlistId,
          trackId,
          position,
          toIso(Math.max(addedAt, createdAt)),
        ]);
      }
    }
  }

  // ------------------------------------------------------------------------------ subscriptions
  const subscriptions: Cell[][] = [];
  const currentPlan = new Map<number, string>();
  for (const u of users) {
    const first = firstPlay.get(u.id);
    if (first === undefined) continue;
    // Conversion is higher for intense listeners; nobody pays before listening.
    const convert = rng.chance(Math.min(0.62, 0.16 + 0.05 * u.weight));
    if (!convert) continue;
    const market = marketByCode.get(u.code)!;
    let startMs = first + rng.int(0, 45) * DAY_MS;
    if (startMs >= u.activeUntil || startMs >= today) continue;
    let plan: "premium" | "familiar" = rng.chance(0.24) ? "familiar" : "premium";
    // Up to two subscription periods: some listeners cancel and come back on another plan.
    const periods = rng.chance(0.18) ? 2 : 1;
    for (let p = 0; p < periods; p++) {
      const isLast = p === periods - 1;
      let endMs: number | null;
      if (!isLast) {
        endMs = Math.min(u.activeUntil, startMs + rng.int(60, 300) * DAY_MS);
      } else if (u.churnedAt !== null) {
        endMs = u.churnedAt;
      } else {
        endMs = rng.chance(0.12)
          ? Math.min(today - DAY_MS, startMs + rng.int(45, 400) * DAY_MS)
          : null;
      }
      // A closed period always spans at least one calendar day and ends before "today".
      if (endMs !== null) endMs = Math.max(endMs, startMs + DAY_MS);
      if (endMs !== null) endMs = Math.min(endMs, today - DAY_MS);
      if (endMs !== null && endMs - startMs < DAY_MS) break;
      subscriptions.push([
        subscriptions.length + 1,
        u.id,
        plan,
        toDate(startMs),
        endMs === null ? null : toDate(endMs),
        market.price[plan],
        market.currency,
      ]);
      if (endMs === null) currentPlan.set(u.id, plan);
      else currentPlan.delete(u.id);
      if (!isLast) {
        startMs = endMs! + rng.int(20, 200) * DAY_MS;
        if (startMs >= today || startMs >= u.activeUntil) break;
        plan = rng.chance(0.35) ? "familiar" : "premium";
      }
    }
  }
  for (const row of userRows) {
    row[3] = currentPlan.get(row[0] as number) ?? "free";
  }

  // ------------------------------------------------------------------------------------ follows
  const follows: Cell[][] = [];
  for (const u of users) {
    const heard = artistsHeard.get(u.id);
    const candidates = new Set<number>(u.favorites);
    if (heard) for (const a of heard) if (rng.chance(0.08)) candidates.add(a);
    for (const artistId of candidates) {
      if (!rng.chance(0.55)) continue;
      const from = firstPlay.get(u.id) ?? u.signup;
      const at =
        from + rng.int(0, Math.max(1, Math.floor((u.activeUntil - from) / 60_000))) * 60_000;
      if (at >= today) continue;
      follows.push([follows.length + 1, u.id, artistId, toIso(at)]);
    }
  }

  const table = (name: string, columns: string[], rows: Cell[][]): GeneratedTable => ({
    name,
    columns,
    rows,
  });
  return {
    slug: config.slug,
    version: config.version,
    today: toDate(today),
    schemaSql,
    tables: [
      table(
        "users",
        ["id", "country", "signup_at", "plan_tier", "age_band", "churned_at"],
        userRows,
      ),
      table("artists", ["id", "name", "country", "genre", "monthly_listeners"], artists),
      table("albums", ["id", "artist_id", "title", "released_on"], albums),
      table("tracks", ["id", "album_id", "title", "duration_seconds", "is_explicit"], tracks),
      table(
        "plays",
        ["id", "user_id", "track_id", "played_at", "seconds_played", "device", "completed"],
        playRows,
      ),
      table("playlists", ["id", "user_id", "name", "created_at", "is_public"], playlists),
      table(
        "playlist_tracks",
        ["id", "playlist_id", "track_id", "position", "added_at"],
        playlistTracks,
      ),
      table(
        "subscriptions",
        ["id", "user_id", "plan", "started_on", "ended_on", "amount_minor", "currency"],
        subscriptions,
      ),
      table("follows", ["id", "user_id", "artist_id", "followed_at"], follows),
    ],
  };
}
