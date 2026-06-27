create table if not exists public.qr_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  values jsonb not null,
  custom_fields jsonb not null default '[]'::jsonb,
  label_options jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_qr_templates_updated_at on public.qr_templates;
create trigger set_qr_templates_updated_at
before update on public.qr_templates
for each row
execute function public.set_updated_at();

alter table public.qr_templates enable row level security;

drop policy if exists "Users can read their own QR templates" on public.qr_templates;
create policy "Users can read their own QR templates"
on public.qr_templates
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can create their own QR templates" on public.qr_templates;
create policy "Users can create their own QR templates"
on public.qr_templates
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own QR templates" on public.qr_templates;
create policy "Users can update their own QR templates"
on public.qr_templates
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own QR templates" on public.qr_templates;
create policy "Users can delete their own QR templates"
on public.qr_templates
for delete
to authenticated
using (auth.uid() = user_id);
