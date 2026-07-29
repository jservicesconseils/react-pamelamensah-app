# Abla Etonam MENSAH (Paméla) — Site + Tableau de bord

Site vitrine avec formulaire de contact et tableau de bord conseiller.
Les demandes (leads) sont stockées sur **Supabase**, donc synchronisées entre
tous les appareils : une demande envoyée depuis un téléphone apparaît dans le
tableau de bord en quelques secondes.

## Configuration initiale (une seule fois)

1. **Créer un projet Supabase** sur [supabase.com](https://supabase.com).
   Choisir la région **Canada (Central)** — les données personnelles de clients
   québécois relèvent de la Loi 25.

2. **Créer les tables** : ouvrir le SQL Editor du projet et exécuter
   [`supabase/schema.sql`](supabase/schema.sql).

3. **Activer le temps réel** : Database → Replication → cocher la table `leads`.
   Sans cette étape, le tableau de bord ne se met pas à jour automatiquement.

4. **Créer le compte d'Abla** : Authentication → Users → Add user
   (courriel + mot de passe fort). Laisser l'inscription publique désactivée :
   il ne doit pas être possible de se créer un compte depuis le site.

5. **Renseigner les clés** :
   ```bash
   cp .env.example .env.local
   ```
   Remplir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` avec les valeurs de
   Project Settings → API. `.env.local` est ignoré par git.

## Lancer

```bash
npm install
npm run dev          # http://localhost:5173
npm run dev -- --host  # accessible depuis un téléphone du même réseau
npm run typecheck    # vérification des types
npm run build        # typecheck + build de production
```

## Pages

- `/` — site vitrine et formulaire de contact
- `/#admin` (ou `/?admin`) — tableau de bord, protégé par courriel + mot de passe

Le tableau de bord permet de filtrer les demandes, changer leur statut
(nouveau / lu / contacté), consulter les statistiques de visite, exporter en
JSON ou CSV, et importer un export précédent.

## Sécurité

L'accès aux données repose sur les politiques RLS de Postgres définies dans
`supabase/schema.sql`, appliquées côté serveur :

- le rôle `anon` (n'importe quel visiteur) peut **insérer** un lead mais ne peut
  **pas en lire un seul** ;
- seul un utilisateur authentifié peut lire, modifier et supprimer.

La clé `VITE_SUPABASE_ANON_KEY` est publique par conception — elle est livrée
dans le bundle JavaScript, et ce n'est pas un problème : elle n'ouvre que ce que
les politiques RLS autorisent. En revanche la clé `service_role` contourne RLS
et ne doit **jamais** apparaître dans ce projet.

### Reste à faire avant la mise en ligne

Le formulaire n'a **aucune protection anti-spam** : un bot peut insérer des
leads et gonfler le compteur de visites. À traiter avant publication (hCaptcha
via Supabase, ou limitation de débit).

## Fichiers

- `src/App.tsx` — interface (site + tableau de bord)
- `src/lib/supabase.ts` — client Supabase
- `src/lib/leads.ts` — accès aux données et abonnement temps réel
- `supabase/schema.sql` — tables et politiques de sécurité
- `public/hero.png`, `public/headshot.png` — images
