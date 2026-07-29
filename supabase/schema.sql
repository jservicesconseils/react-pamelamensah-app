-- Schéma Supabase pour le site d'Abla Etonam Mensah
--
-- À exécuter une seule fois dans le SQL Editor du tableau de bord Supabase.
-- Après exécution, activer Realtime sur la table « leads » :
--   Database → Replication → cocher « leads »
--
-- Principe de sécurité : le rôle « anon » (le navigateur d'un visiteur) peut
-- INSÉRER un lead mais ne peut PAS en lire un seul. Seul un utilisateur
-- authentifié (Abla) peut lire, modifier et supprimer. C'est Postgres qui
-- applique cette règle, pas le code JavaScript — donc elle n'est pas
-- contournable depuis le navigateur.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Table des demandes (leads)
-- ---------------------------------------------------------------------------

create table if not exists public.leads (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name       text not null,
  email      text not null,
  phone      text,
  need       text,
  message    text,
  status     text not null default 'nouveau'
             check (status in ('nouveau', 'lu', 'contacté'))
);

create index if not exists leads_created_at_idx
  on public.leads (created_at desc);

alter table public.leads enable row level security;

-- Formulaire public : insertion seule, aucune lecture.
drop policy if exists anon_insert_leads on public.leads;
create policy anon_insert_leads on public.leads
  for insert to anon
  with check (true);

-- Abla connectée : accès complet.
drop policy if exists auth_all_leads on public.leads;
create policy auth_all_leads on public.leads
  for all to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Table des visites (statistiques)
-- ---------------------------------------------------------------------------
-- Une ligne par visite. L'agrégation (total, par jour) se fait à la lecture.

create table if not exists public.visits (
  id         bigserial primary key,
  created_at timestamptz not null default now()
);

create index if not exists visits_created_at_idx
  on public.visits (created_at desc);

alter table public.visits enable row level security;

drop policy if exists anon_insert_visits on public.visits;
create policy anon_insert_visits on public.visits
  for insert to anon
  with check (true);

drop policy if exists auth_read_visits on public.visits;
create policy auth_read_visits on public.visits
  for select to authenticated
  using (true);

-- Sans cette politique, « Vider base » n'effacerait pas le compteur de visites :
-- RLS rejette la suppression sans lever d'erreur, donc l'interface annoncerait
-- un succès alors que rien n'a été supprimé.
drop policy if exists auth_delete_visits on public.visits;
create policy auth_delete_visits on public.visits
  for delete to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Agrégation des visites par jour
-- ---------------------------------------------------------------------------
-- Fonction appelée par le tableau de bord au lieu de rapatrier toutes les
-- lignes de « visits ». security invoker = les politiques RLS ci-dessus
-- s'appliquent, donc seul un utilisateur authentifié obtient un résultat.

create or replace function public.visit_stats()
returns table (day date, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select (created_at at time zone 'America/Toronto')::date as day,
         count(*) as count
  from public.visits
  group by day
  order by day desc
  limit 90;
$$;
