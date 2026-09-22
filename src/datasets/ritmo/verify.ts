import type { Cell, DatasetVerification, GeneratedDataset } from "../_shared/types";
import { config, markets } from "./config";

/** Consistency rules for Ritmo (documented in generate.ts header and README.md). */
export function verify(ds: GeneratedDataset): DatasetVerification[] {
  const t = (name: string) => ds.tables.find((x) => x.name === name)!;
  const col = (name: string, c: string) => t(name).columns.indexOf(c);
  const results: DatasetVerification[] = [];
  const check = (name: string, ok: boolean, detail?: string) => results.push({ name, ok, detail });

  const users = t("users").rows;
  const artists = t("artists").rows;
  const albums = t("albums").rows;
  const tracks = t("tracks").rows;
  const plays = t("plays").rows;
  const playlists = t("playlists").rows;
  const playlistTracks = t("playlist_tracks").rows;
  const subscriptions = t("subscriptions").rows;
  const follows = t("follows").rows;

  const todayMs = Date.parse(ds.today + "T23:59:59Z");
  const DAY = 86_400_000;

  // ------------------------------------------------------------------------------- volumes
  check("volume: users", users.length === config.volumes.users, `${users.length}`);
  check("volume: artists", artists.length === config.volumes.artists, `${artists.length}`);
  check("volume: tracks ≥ 2000", tracks.length >= 2000, `${tracks.length}`);
  check(
    "volume: plays within target range",
    plays.length > config.volumes.plays * 0.75 && plays.length < config.volumes.plays * 1.15,
    `${plays.length}`,
  );
  check(
    "volume: playlists and follows populated",
    playlists.length > 800 && playlistTracks.length > 8000 && follows.length > 4000,
    `${playlists.length} playlists, ${playlistTracks.length} playlist_tracks, ${follows.length} follows`,
  );

  // -------------------------------------------------------------------------- user timeline
  const u = {
    id: col("users", "id"),
    country: col("users", "country"),
    signup: col("users", "signup_at"),
    plan: col("users", "plan_tier"),
    band: col("users", "age_band"),
    churn: col("users", "churned_at"),
  };
  const signupOf = new Map<number, number>();
  const churnOf = new Map<number, number | null>();
  const countryOf = new Map<number, string>();
  const planOf = new Map<number, string>();
  let badChurn = 0;
  let churned = 0;
  const signupMonths = new Set<string>();
  for (const r of users) {
    const id = r[u.id] as number;
    const signup = Date.parse(r[u.signup] as string);
    signupOf.set(id, signup);
    countryOf.set(id, r[u.country] as string);
    planOf.set(id, r[u.plan] as string);
    signupMonths.add((r[u.signup] as string).slice(0, 7));
    const c = r[u.churn] as string | null;
    churnOf.set(id, c === null ? null : Date.parse(c));
    if (c !== null) {
      churned++;
      if (Date.parse(c) <= signup || Date.parse(c) > todayMs) badChurn++;
    }
    if (signup > todayMs) badChurn++;
  }
  check("signup_at ≤ today and churned_at after signup", badChurn === 0, `${badChurn}`);
  check(
    "churn share between 15 % and 45 % (cohort analysis)",
    churned > users.length * 0.15 && churned < users.length * 0.45,
    `${churned}/${users.length}`,
  );
  check(
    "at least 18 signup months with listeners (cohorts)",
    signupMonths.size >= 18,
    `${signupMonths.size} months`,
  );
  check(
    "every user country is a served market",
    users.every((r) => markets.some((m) => m.code === r[u.country])),
  );

  // ---------------------------------------------------------------------- catalogue integrity
  const albumRelease = new Map<number, number>();
  const albumArtist = new Map<number, number>();
  const artistIds = new Set(artists.map((r) => r[0] as number));
  let badAlbums = 0;
  for (const r of albums) {
    const id = r[0] as number;
    const artistId = r[col("albums", "artist_id")] as number;
    if (!artistIds.has(artistId)) badAlbums++;
    const released = Date.parse((r[col("albums", "released_on")] as string) + "T00:00:00Z");
    if (released > todayMs) badAlbums++;
    albumRelease.set(id, released);
    albumArtist.set(id, artistId);
  }
  check(
    "albums reference an artist and were released before today",
    badAlbums === 0,
    `${badAlbums}`,
  );

  const trackDuration = new Map<number, number>();
  const trackRelease = new Map<number, number>();
  const trackArtist = new Map<number, number>();
  let badTracks = 0;
  for (const r of tracks) {
    const id = r[0] as number;
    const albumId = r[col("tracks", "album_id")] as number;
    const duration = r[col("tracks", "duration_seconds")] as number;
    if (!albumRelease.has(albumId) || duration < 60 || duration > 600) badTracks++;
    trackDuration.set(id, duration);
    trackRelease.set(id, albumRelease.get(albumId) ?? 0);
    trackArtist.set(id, albumArtist.get(albumId) ?? 0);
  }
  check("tracks belong to an album and last 60–600 s", badTracks === 0, `${badTracks}`);
  const explicit = tracks.filter((r) => r[col("tracks", "is_explicit")] === true).length;
  check(
    "explicit tracks ≈ 17 %",
    explicit > tracks.length * 0.1 && explicit < tracks.length * 0.25,
    `${explicit}/${tracks.length}`,
  );

  // ------------------------------------------------------------------------------- the plays
  const p = {
    id: col("plays", "id"),
    user: col("plays", "user_id"),
    track: col("plays", "track_id"),
    at: col("plays", "played_at"),
    seconds: col("plays", "seconds_played"),
    device: col("plays", "device"),
    completed: col("plays", "completed"),
  };
  const offsetOf = new Map(markets.map((m) => [m.code as string, m.utcOffset as number]));
  let badWindow = 0;
  let beforeRelease = 0;
  let badCompleted = 0;
  let nullDevice = 0;
  let nullSeconds = 0;
  let negativeSeconds = 0;
  let overrun = 0;
  let evening = 0;
  let previousAt = -Infinity;
  let unordered = 0;
  const playsPerArtist = new Map<number, number>();
  const dupKeys = new Map<string, number>();
  const listeners30 = new Map<number, Set<number>>();
  const firstPlay = new Map<number, number>();
  const cut30 = todayMs - 30 * DAY;

  for (const r of plays) {
    const userId = r[p.user] as number;
    const trackId = r[p.track] as number;
    const at = Date.parse(r[p.at] as string);
    const signup = signupOf.get(userId);
    const churn = churnOf.get(userId) ?? null;
    if (signup === undefined || !trackDuration.has(trackId)) {
      badWindow++;
      continue;
    }
    if (at < signup || at > todayMs || (churn !== null && at > churn)) badWindow++;
    if (at < (trackRelease.get(trackId) ?? 0)) beforeRelease++;
    if (at < previousAt) unordered++;
    previousAt = at;

    const seconds = r[p.seconds] as number | null;
    const duration = trackDuration.get(trackId)!;
    const completed = r[p.completed] as boolean;
    if (r[p.device] === null) nullDevice++;
    if (seconds === null) nullSeconds++;
    else if (seconds < 0) negativeSeconds++;
    else if (seconds > duration) overrun++;
    else if (completed !== seconds >= duration * 0.9) badCompleted++;

    const localHour = new Date(
      at + (offsetOf.get(countryOf.get(userId)!) ?? 0) * 3_600_000,
    ).getUTCHours();
    if (localHour >= 18 && localHour <= 23) evening++;

    const artistId = trackArtist.get(trackId)!;
    playsPerArtist.set(artistId, (playsPerArtist.get(artistId) ?? 0) + 1);
    const key = `${userId}|${trackId}|${r[p.at] as string}`;
    dupKeys.set(key, (dupKeys.get(key) ?? 0) + 1);
    if (at >= cut30) {
      if (!listeners30.has(artistId)) listeners30.set(artistId, new Set());
      listeners30.get(artistId)!.add(userId);
    }
    if (!firstPlay.has(userId) || at < firstPlay.get(userId)!) firstPlay.set(userId, at);
  }

  check(
    "plays happen after signup, before today and never after churn",
    badWindow === 0,
    `${badWindow}`,
  );
  check("no play before its album release date", beforeRelease === 0, `${beforeRelease}`);
  check(
    "completed ⇔ seconds_played ≥ 90 % of duration (clean rows)",
    badCompleted === 0,
    `${badCompleted}`,
  );
  check("plays are stored ordered by played_at", unordered === 0, `${unordered}`);
  check(
    "evening listening (local 18–23 h) above 35 %",
    evening / plays.length > 0.35,
    `${((evening / plays.length) * 100).toFixed(1)} %`,
  );

  // Documented quality issues, with the counts published in the README.
  check(
    "quality issue: NULL device ≈ 1.6 %",
    nullDevice > plays.length * 0.01 && nullDevice < plays.length * 0.025,
    `${nullDevice}`,
  );
  check("quality issue: NULL seconds_played = 90", nullSeconds === 90, `${nullSeconds}`);
  check(
    "quality issue: negative seconds_played = 120",
    negativeSeconds === 120,
    `${negativeSeconds}`,
  );
  check("quality issue: seconds_played > duration = 210", overrun === 210, `${overrun}`);
  const duplicated = [...dupKeys.values()].filter((n) => n > 1).length;
  const duplicateRows = [...dupKeys.values()].reduce((a, n) => a + (n > 1 ? n - 1 : 0), 0);
  check(
    "quality issue: duplicated play rows exist (same user/track/instant)",
    duplicated > 250 && duplicateRows >= duplicated,
    `${duplicated} keys, ${duplicateRows} extra rows`,
  );

  // Long tail: the top 10 % of artists concentrate most of the streams.
  const sortedArtists = [...playsPerArtist.values()].sort((a, b) => b - a);
  const top = sortedArtists.slice(0, Math.ceil(artists.length * 0.1)).reduce((a, b) => a + b, 0);
  check(
    "long tail: top 10 % of artists hold ≥ 50 % of the plays",
    top / plays.length >= 0.5,
    `${((top / plays.length) * 100).toFixed(1)} %`,
  );

  // Ranking per country per month needs enough artists with plays in every market.
  let thinMarkets = 0;
  for (const m of markets) {
    const withPlays = artists.filter(
      (r) =>
        r[col("artists", "country")] === m.code && (playsPerArtist.get(r[0] as number) ?? 0) > 0,
    ).length;
    if (withPlays < 15) thinMarkets++;
  }
  check("every market has ≥ 15 artists with plays (rankings)", thinMarkets === 0, `${thinMarkets}`);

  // monthly_listeners is a published number, never below the observed 30-day audience.
  let badListeners = 0;
  for (const r of artists) {
    const observed = listeners30.get(r[0] as number)?.size ?? 0;
    if ((r[col("artists", "monthly_listeners")] as number) < observed) badListeners++;
  }
  check(
    "artists.monthly_listeners ≥ observed 30-day listeners",
    badListeners === 0,
    `${badListeners}`,
  );

  // --------------------------------------------------------------------- playlists and follows
  const playlistOwner = new Map<number, number>();
  const playlistCreated = new Map<number, number>();
  let badPlaylists = 0;
  for (const r of playlists) {
    const id = r[0] as number;
    const owner = r[col("playlists", "user_id")] as number;
    const created = Date.parse(r[col("playlists", "created_at")] as string);
    const first = firstPlay.get(owner);
    if (first === undefined || created < first || created > todayMs) badPlaylists++;
    playlistOwner.set(id, owner);
    playlistCreated.set(id, created);
  }
  check(
    "playlists are created after the owner's first play",
    badPlaylists === 0,
    `${badPlaylists}`,
  );

  const seenInPlaylist = new Set<string>();
  const positions = new Map<number, number[]>();
  let badPlaylistTracks = 0;
  for (const r of playlistTracks) {
    const playlistId = r[col("playlist_tracks", "playlist_id")] as number;
    const trackId = r[col("playlist_tracks", "track_id")] as number;
    const position = r[col("playlist_tracks", "position")] as number;
    const addedAt = Date.parse(r[col("playlist_tracks", "added_at")] as string);
    const key = `${playlistId}|${trackId}`;
    if (seenInPlaylist.has(key)) badPlaylistTracks++;
    seenInPlaylist.add(key);
    if (!trackDuration.has(trackId) || !playlistCreated.has(playlistId)) badPlaylistTracks++;
    else if (addedAt < playlistCreated.get(playlistId)! || addedAt > todayMs) badPlaylistTracks++;
    positions.set(playlistId, [...(positions.get(playlistId) ?? []), position]);
  }
  let badPositions = 0;
  for (const [, list] of positions) {
    const sorted = [...list].sort((a, b) => a - b);
    if (sorted.some((v, i) => v !== i + 1)) badPositions++;
  }
  check(
    "playlist tracks: unique per playlist, added after creation",
    badPlaylistTracks === 0,
    `${badPlaylistTracks}`,
  );
  check("playlist positions are 1..n without gaps", badPositions === 0, `${badPositions}`);

  const seenFollow = new Set<string>();
  let badFollows = 0;
  for (const r of follows) {
    const userId = r[col("follows", "user_id")] as number;
    const artistId = r[col("follows", "artist_id")] as number;
    const at = Date.parse(r[col("follows", "followed_at")] as string);
    const key = `${userId}|${artistId}`;
    if (seenFollow.has(key) || !artistIds.has(artistId)) badFollows++;
    seenFollow.add(key);
    const signup = signupOf.get(userId);
    if (signup === undefined || at < signup || at > todayMs) badFollows++;
  }
  check(
    "follows are unique per (user, artist) and dated after signup",
    badFollows === 0,
    `${badFollows}`,
  );

  // ------------------------------------------------------------------------- subscriptions
  const s = {
    user: col("subscriptions", "user_id"),
    plan: col("subscriptions", "plan"),
    start: col("subscriptions", "started_on"),
    end: col("subscriptions", "ended_on"),
    amount: col("subscriptions", "amount_minor"),
    currency: col("subscriptions", "currency"),
  };
  const byUser = new Map<number, Cell[][]>();
  for (const r of subscriptions) {
    const id = r[s.user] as number;
    byUser.set(id, [...(byUser.get(id) ?? []), r]);
  }
  let badSubs = 0;
  let badPrice = 0;
  let overlap = 0;
  let openSubs = 0;
  let badPlanTier = 0;
  let withoutPlayBefore = 0;
  let returning = 0;
  for (const [userId, rows] of byUser) {
    const market = markets.find((m) => m.code === countryOf.get(userId))!;
    const sorted = [...rows].sort((a, b) =>
      (a[s.start] as string).localeCompare(b[s.start] as string),
    );
    if (sorted.length > 1) returning++;
    let open = 0;
    let previousEnd = "";
    for (const r of sorted) {
      const started = r[s.start] as string;
      const ended = r[s.end] as string | null;
      const plan = r[s.plan] as string;
      if (plan !== "premium" && plan !== "familiar") badSubs++;
      if (ended !== null && ended <= started) badSubs++;
      if (started > ds.today || (ended !== null && ended > ds.today)) badSubs++;
      if (r[s.currency] !== market.currency) badPrice++;
      if ((r[s.amount] as number) !== market.price[plan as "premium" | "familiar"]) badPrice++;
      if (previousEnd && started <= previousEnd) overlap++;
      previousEnd = ended ?? ds.today;
      if (ended === null) open++;
      const first = firstPlay.get(userId);
      if (first === undefined || Date.parse(started + "T23:59:59Z") < first) withoutPlayBefore++;
    }
    if (open > 1) badSubs++;
    openSubs += open;
    const expectedTier = sorted.find((r) => r[s.end] === null)?.[s.plan] ?? "free";
    if (planOf.get(userId) !== expectedTier) badPlanTier++;
  }
  for (const [userId, plan] of planOf) if (plan !== "free" && !byUser.has(userId)) badPlanTier++;
  check(
    "subscriptions: valid plan, dates and at most one open period",
    badSubs === 0,
    `${badSubs}`,
  );
  check("subscriptions priced in the listener's currency", badPrice === 0, `${badPrice}`);
  check("subscription periods of a user never overlap", overlap === 0, `${overlap}`);
  check(
    "nobody subscribes before their first play (funnel)",
    withoutPlayBefore === 0,
    `${withoutPlayBefore}`,
  );
  check("users.plan_tier matches the open subscription", badPlanTier === 0, `${badPlanTier}`);
  check(
    "paying base is plausible (5–40 % of listeners, some returning)",
    openSubs > users.length * 0.05 && openSubs < users.length * 0.4 && returning > 50,
    `${openSubs} active, ${returning} with several periods`,
  );

  return results;
}
