-- RetailFlow POS schema for Supabase
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default 'Cashier',
  role text not null default 'cashier' check (role in ('admin','cashier')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(12,2) not null default 0 check (price >= 0),
  gst_rate numeric(5,2) not null default 5 check (gst_rate >= 0 and gst_rate <= 100),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text unique,
  email text,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  invoice_no text not null unique,
  customer_id uuid references public.customers(id) on delete set null,
  cashier_id uuid references auth.users(id) on delete set null,
  payment_method text not null check (payment_method in ('Cash','UPI','Card')),
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  gst numeric(12,2) not null default 0 check (gst >= 0),
  total numeric(12,2) not null default 0 check (total >= 0),
  status text not null default 'Paid' check (status in ('Paid','Refunded','Pending')),
  created_at timestamptz not null default now()
);

create table if not exists public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  product_name text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  gst_rate numeric(5,2) not null default 5,
  line_total numeric(12,2) not null check (line_total >= 0)
);

create index if not exists products_category_idx on public.products(category_id);
create index if not exists sales_created_idx on public.sales(created_at desc);
create index if not exists sale_items_sale_idx on public.sale_items(sale_id);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;

drop policy if exists "profiles self access" on public.profiles;
create policy "profiles self access" on public.profiles
for all to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "authenticated categories" on public.categories;
create policy "authenticated categories" on public.categories
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated products" on public.products;
create policy "authenticated products" on public.products
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated customers" on public.customers;
create policy "authenticated customers" on public.customers
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated sales" on public.sales;
create policy "authenticated sales" on public.sales
for all to authenticated using (true) with check (true);

drop policy if exists "authenticated sale items" on public.sale_items;
create policy "authenticated sale items" on public.sale_items
for all to authenticated using (true) with check (true);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles(id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', 'Cashier'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

insert into public.categories(name) values ('Grocery'),('Beverages'),('Snacks'),('Personal Care')
on conflict (name) do nothing;

insert into public.products(sku,name,category_id,price,gst_rate,stock,low_stock_threshold)
select v.sku,v.name,c.id,v.price,v.gst,v.stock,v.low
from (values
('AT-5001','Aashirvaad Atta 5kg','Grocery',295,5,8,10),
('TS-1001','Tata Salt 1kg','Grocery',31,5,45,10),
('ML-1002','Amul Milk 1L','Beverages',68,5,5,10),
('CC-7503','Coca-Cola 750ml','Beverages',48,5,23,10),
('LY-1102','Lays Magic Masala','Snacks',20,12,61,10),
('GD-1801','Good Day Cookies','Snacks',35,12,32,10),
('SX-1820','Surf Excel 1kg','Grocery',145,18,6,10),
('BV-4010','Bournvita 500g','Beverages',229,12,9,10),
('CG-2201','Colgate MaxFresh','Personal Care',112,18,28,10),
('DV-1090','Dove Soap 100g','Personal Care',58,18,36,10),
('TU-7501','Thums Up 750ml','Beverages',48,5,19,10),
('PG-1902','Parle-G Biscuits','Snacks',10,12,88,10)
) v(sku,name,category,price,gst,stock,low) join public.categories c on c.name=v.category
on conflict (sku) do nothing;
