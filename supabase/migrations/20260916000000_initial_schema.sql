create extension if not exists pgcrypto;

create table public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  short_code text not null unique check (short_code ~ '^[a-zA-Z0-9_-]{4,32}$'),
  original_url text not null check (original_url ~ '^https?://'),
  title text check (char_length(title) <= 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index links_user_id_created_at_idx on public.links (user_id, created_at desc);

create table public.click_events (
  id bigint generated always as identity primary key,
  link_id uuid not null references public.links(id) on delete cascade,
  clicked_at timestamptz not null default now(),
  referrer text,
  user_agent text,
  country text check (country is null or char_length(country) <= 2)
);

create index click_events_link_id_clicked_at_idx on public.click_events (link_id, clicked_at desc);

alter table public.links enable row level security;
alter table public.click_events enable row level security;

create policy "Owners can read links"
on public.links for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners can create links"
on public.links for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Owners can update links"
on public.links for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Owners can delete links"
on public.links for delete
to authenticated
using ((select auth.uid()) = user_id);

create policy "Owners can read link clicks"
on public.click_events for select
to authenticated
using (
  exists (
    select 1 from public.links
    where links.id = click_events.link_id
      and links.user_id = (select auth.uid())
  )
);

create view public.link_analytics
with (security_invoker = true)
as
select
  links.id,
  links.user_id,
  links.short_code,
  links.original_url,
  links.title,
  links.is_active,
  links.created_at,
  count(click_events.id)::bigint as total_clicks,
  max(click_events.clicked_at) as last_clicked_at
from public.links
left join public.click_events on click_events.link_id = links.id
group by links.id;

create view public.daily_click_analytics
with (security_invoker = true)
as
select
  links.user_id,
  click_events.link_id,
  (click_events.clicked_at at time zone 'UTC')::date as click_date,
  count(*)::bigint as clicks
from public.click_events
join public.links on links.id = click_events.link_id
group by links.user_id, click_events.link_id, (click_events.clicked_at at time zone 'UTC')::date;

grant select, insert, update, delete on public.links to authenticated;
grant select on public.click_events to authenticated;
grant select on public.link_analytics to authenticated;
grant select on public.daily_click_analytics to authenticated;
