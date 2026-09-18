/** DDL for the TiendaViva sandbox database. Must match src/content/datasets/tiendaviva.ts. */
export const schemaSql = `
create table customers (
  id integer primary key,
  full_name text not null,
  email text not null,
  country char(2) not null,
  city text not null,
  signup_at timestamptz not null,
  birth_year integer,
  marketing_opt_in boolean not null
);
comment on table customers is 'Clientes registrados. Algunos correos están duplicados con distinta capitalización.';

create table sellers (
  id integer primary key,
  store_name text not null,
  country char(2) not null,
  joined_at date not null,
  rating numeric(3,2),
  is_verified boolean not null
);

create table categories (
  id integer primary key,
  name text not null,
  parent_id integer references categories (id)
);

create table products (
  id integer primary key,
  seller_id integer not null references sellers (id),
  category_id integer not null references categories (id),
  name text not null,
  list_price numeric(12,2) not null,
  currency char(3) not null,
  stock integer not null,
  is_active boolean not null,
  created_at timestamptz not null
);

create table orders (
  id integer primary key,
  customer_id integer not null references customers (id),
  status text not null,
  created_at timestamptz not null,
  currency char(3) not null,
  subtotal numeric(12,2) not null,
  discount numeric(12,2) not null,
  shipping_fee numeric(12,2) not null,
  total_amount numeric(12,2) not null,
  channel text not null
);

create table order_items (
  id integer primary key,
  order_id integer not null references orders (id),
  product_id integer not null references products (id),
  quantity integer not null,
  unit_price numeric(12,2) not null
);

create table payments (
  id integer primary key,
  order_id integer not null references orders (id),
  method text not null,
  installments integer not null,
  amount numeric(12,2) not null,
  status text not null,
  paid_at timestamptz
);

create table shipments (
  id integer primary key,
  order_id integer not null references orders (id),
  carrier text not null,
  shipped_at timestamptz not null,
  delivered_at timestamptz,
  destination_city text not null
);

create table reviews (
  id integer primary key,
  product_id integer not null references products (id),
  customer_id integer not null references customers (id),
  rating integer not null,
  comment text,
  created_at timestamptz not null
);

create table returns (
  id integer primary key,
  order_id integer not null references orders (id),
  reason text not null,
  requested_at timestamptz not null,
  refund_amount numeric(12,2) not null
);

create index on orders (customer_id);
create index on orders (created_at);
create index on order_items (order_id);
create index on order_items (product_id);
create index on payments (order_id);
create index on shipments (order_id);
create index on reviews (product_id);
create index on products (seller_id);
`;
