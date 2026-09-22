/** DDL for the Ritmo sandbox database. Must match src/content/datasets/ritmo.ts. */
export const schemaSql = `
create table users (
  id integer primary key,
  country char(2) not null,
  signup_at timestamptz not null,
  plan_tier text not null,
  age_band text not null,
  churned_at timestamptz
);

create table artists (
  id integer primary key,
  name text not null,
  country char(2) not null,
  genre text not null,
  monthly_listeners integer not null
);

create table albums (
  id integer primary key,
  artist_id integer not null references artists (id),
  title text not null,
  released_on date not null
);

create table tracks (
  id integer primary key,
  album_id integer not null references albums (id),
  title text not null,
  duration_seconds integer not null,
  is_explicit boolean not null
);

create table plays (
  id integer primary key,
  user_id integer not null references users (id),
  track_id integer not null references tracks (id),
  played_at timestamptz not null,
  seconds_played integer,
  device text,
  completed boolean not null
);

create table playlists (
  id integer primary key,
  user_id integer not null references users (id),
  name text not null,
  created_at timestamptz not null,
  is_public boolean not null
);

create table playlist_tracks (
  id integer primary key,
  playlist_id integer not null references playlists (id),
  track_id integer not null references tracks (id),
  position integer not null,
  added_at timestamptz not null
);

create table subscriptions (
  id integer primary key,
  user_id integer not null references users (id),
  plan text not null,
  started_on date not null,
  ended_on date,
  amount_minor integer not null,
  currency char(3) not null
);

create table follows (
  id integer primary key,
  user_id integer not null references users (id),
  artist_id integer not null references artists (id),
  followed_at timestamptz not null
);

create index on albums (artist_id);
create index on tracks (album_id);
create index on plays (user_id);
create index on plays (track_id);
create index on plays (played_at);
create index on playlists (user_id);
create index on playlist_tracks (playlist_id);
create index on playlist_tracks (track_id);
create index on subscriptions (user_id);
create index on follows (user_id);
create index on follows (artist_id);
`;
