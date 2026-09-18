/** DDL for the Pídelo sandbox database. Must match src/content/datasets/pidelo.ts. */
export const schemaSql = `
create table cities (
  id integer primary key,
  name text not null,
  country char(2) not null,
  timezone text not null
);

create table restaurants (
  id integer primary key,
  city_id integer not null references cities (id),
  name text not null,
  cuisine text not null,
  rating numeric(2,1),
  commission_pct numeric(4,2) not null,
  joined_at date not null,
  is_active boolean not null
);

create table menu_items (
  id integer primary key,
  restaurant_id integer not null references restaurants (id),
  name text not null,
  category text not null,
  price numeric(10,2) not null,
  is_available boolean not null
);

create table customers (
  id integer primary key,
  city_id integer not null references cities (id),
  full_name text not null,
  email text not null,
  signup_at timestamptz not null,
  phone_verified boolean not null
);

create table couriers (
  id integer primary key,
  city_id integer not null references cities (id),
  full_name text not null,
  vehicle text not null,
  started_at date not null,
  is_active boolean not null
);

create table promotions (
  id integer primary key,
  code text not null,
  kind text not null,
  value numeric(10,2) not null,
  starts_at date not null,
  ends_at date not null,
  max_uses_per_customer integer
);

create table orders (
  id integer primary key,
  customer_id integer not null references customers (id),
  restaurant_id integer not null references restaurants (id),
  courier_id integer references couriers (id),
  promotion_id integer references promotions (id),
  placed_at timestamptz not null,
  status text not null,
  subtotal numeric(10,2) not null,
  delivery_fee numeric(10,2) not null,
  discount numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null,
  promised_minutes integer not null,
  delivered_at timestamptz
);

create table order_items (
  id integer primary key,
  order_id integer not null references orders (id),
  menu_item_id integer not null references menu_items (id),
  quantity integer not null,
  unit_price numeric(10,2) not null
);

create table order_events (
  id integer primary key,
  order_id integer not null references orders (id),
  event text not null,
  event_at timestamptz not null
);

create table ratings (
  id integer primary key,
  order_id integer not null references orders (id),
  restaurant_rating integer,
  courier_rating integer,
  comment text,
  created_at timestamptz not null
);

create index on restaurants (city_id);
create index on menu_items (restaurant_id);
create index on orders (customer_id);
create index on orders (restaurant_id);
create index on orders (courier_id);
create index on orders (placed_at);
create index on order_items (order_id);
create index on order_events (order_id);
create index on ratings (order_id);
`;
