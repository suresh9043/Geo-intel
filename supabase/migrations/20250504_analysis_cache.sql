create table if not exists analysis_cache (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  url text not null,
  analysis jsonb not null,
  analysed_at timestamptz default now(),
  unique(user_id, url)
);
alter table analysis_cache enable row level security;
create policy "Users can manage own cache" on analysis_cache
  for all using (auth.uid() = user_id);
