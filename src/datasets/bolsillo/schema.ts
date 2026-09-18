/** DDL for the Bolsillo sandbox database. Must match src/content/datasets/bolsillo.ts. */
export const schemaSql = `
create table users (
  id integer primary key,
  full_name text not null,
  email text not null,
  country char(2) not null,
  city text not null,
  birth_date date,
  signup_at timestamptz not null,
  kyc_level integer not null,
  is_blocked boolean not null
);
comment on table users is 'Personas usuarias de la billetera. kyc_level 0–3; algunas cuentas bloqueadas por fraude.';

create table accounts (
  id integer primary key,
  user_id integer not null references users (id),
  currency char(3) not null,
  opened_at timestamptz not null,
  balance numeric(14,2) not null,
  status text not null
);

create table merchants (
  id integer primary key,
  name text not null,
  category text not null,
  country char(2) not null,
  is_online boolean not null
);

create table cards (
  id integer primary key,
  user_id integer not null references users (id),
  kind text not null,
  last4 char(4) not null,
  issued_at date not null,
  expires_at date not null,
  status text not null
);

create table transactions (
  id integer primary key,
  account_id integer not null references accounts (id),
  kind text not null,
  direction text not null,
  amount numeric(14,2) not null,
  currency char(3) not null,
  status text not null,
  created_at timestamptz not null,
  completed_at timestamptz,
  merchant_id integer references merchants (id),
  card_id integer references cards (id),
  reversal_of integer references transactions (id),
  is_flagged boolean not null,
  description text
);

create table transfers (
  id integer primary key,
  from_account_id integer not null references accounts (id),
  to_account_id integer not null references accounts (id),
  amount numeric(14,2) not null,
  currency char(3) not null,
  status text not null,
  created_at timestamptz not null,
  note text
);

create table kyc_events (
  id integer primary key,
  user_id integer not null references users (id),
  from_level integer not null,
  to_level integer not null,
  outcome text not null,
  reason text,
  event_at timestamptz not null
);

create table fx_rates (
  rate_date date not null,
  currency char(3) not null,
  usd_rate numeric(12,4) not null,
  primary key (rate_date, currency)
);

create index on accounts (user_id);
create index on transactions (account_id, created_at);
create index on transactions (merchant_id);
create index on transactions (created_at);
create index on transfers (from_account_id);
create index on transfers (to_account_id);
create index on kyc_events (user_id);
`;
