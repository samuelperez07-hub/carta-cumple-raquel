-- Ejecuta este archivo en Supabase > SQL Editor.
-- Crea primero los dos usuarios en Authentication > Users:
-- 1) administrador (tu correo)
-- 2) participante (correo que usarás para Raquel)
-- Luego reemplaza los UUID de abajo por los IDs de esos usuarios.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','participant')),
  display_name text,
  first_visit_at timestamptz,
  gift_choice text,
  gift_chosen_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.questions (
  id integer primary key,
  question_text text not null,
  options jsonb not null,
  correct_option integer not null check (correct_option >= 0 and correct_option <= 3),
  active boolean not null default true
);

create table if not exists public.attempts (
  id bigint generated always as identity primary key,
  participant_id uuid not null references public.profiles(id),
  answers jsonb not null,
  score integer not null check (score between 0 and 3),
  is_correct boolean not null,
  created_at timestamptz not null default now()
);

create table if not exists public.gifts (
  id text primary key,
  title text not null,
  description text not null,
  emoji text not null,
  active boolean not null default true
);

alter table public.profiles enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;
alter table public.gifts enable row level security;

-- Función SECURITY DEFINER para comprobar el rol sin provocar recursión en RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Cada usuario puede leer su perfil; el administrador puede leer todos.
create policy "read own profile or admin" on public.profiles for select to authenticated
using (id = auth.uid() or public.is_admin());
create policy "admin manages profiles" on public.profiles for all to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Las preguntas y regalos solo los puede leer el administrador desde el navegador.
-- Las funciones Edge usan service role para validar y devolver opciones seguras.
create policy "admin reads questions" on public.questions for select to authenticated
using (public.is_admin());
create policy "admin manages questions" on public.questions for all to authenticated
using (public.is_admin())
with check (public.is_admin());
create policy "admin reads gifts" on public.gifts for select to authenticated
using (public.is_admin());
create policy "admin manages gifts" on public.gifts for all to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "participant reads own attempts" on public.attempts for select to authenticated
using (participant_id = auth.uid());
create policy "admin reads all attempts" on public.attempts for select to authenticated
using (public.is_admin());

-- No se permite insertar intentos o cambiar premios desde el navegador.
-- Las funciones Edge lo hacen de forma segura con service role.

insert into public.questions(id,question_text,options,correct_option) values
(1,'Pregunta 1: cambia esta pregunta por un recuerdo de ustedes.', '["Opción A","Opción B","Opción C","Opción D"]'::jsonb,0),
(2,'Pregunta 2: cambia esta pregunta por algo que le encante.', '["Opción A","Opción B","Opción C","Opción D"]'::jsonb,1),
(3,'Pregunta 3: cambia esta pregunta por algo especial para ustedes.', '["Opción A","Opción B","Opción C","Opción D"]'::jsonb,2)
on conflict (id) do nothing;

insert into public.gifts(id,title,description,emoji) values
('dulces','Un abrazo + kit de dulces','Un abrazo especial y un kit de dulces personalizados.','🍬'),
('comida','Una cita deliciosa','Salir a comer o preparar algo que te encante.','🍰'),
('sorpresa','Un regalo sorpresa','Una sorpresa preparada especialmente para ti.','🎁')
on conflict (id) do nothing;

-- Después de crear los usuarios en Authentication > Users, inserta perfiles:
-- insert into public.profiles(id,role,display_name) values
-- ('UUID_ADMIN','admin','Administrador'),
-- ('UUID_PARTICIPANTE','participant','Raquel');
