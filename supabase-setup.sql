-- Run this once in your Supabase project's SQL Editor.

create table dream_wall_posts (
  id uuid primary key default gen_random_uuid(),
  dream_text text not null,
  essence text,
  comments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table dream_history (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  dream_text text not null,
  result jsonb not null,
  lenses jsonb,
  created_at timestamptz default now()
);

-- Row Level Security: allow the public anon key to read/write.
-- Fine for this project (no accounts). Tighten later if you add auth.
alter table dream_wall_posts enable row level security;
alter table dream_history enable row level security;

create policy "public read wall" on dream_wall_posts for select using (true);
create policy "public insert wall" on dream_wall_posts for insert with check (true);
create policy "public update wall" on dream_wall_posts for update using (true);

create policy "public read own history" on dream_history for select using (true);
create policy "public insert history" on dream_history for insert with check (true);
