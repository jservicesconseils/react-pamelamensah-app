# Abla Etonam MENSAH (Paméla) - V5 + Admin

## Lancer
npm install
npm run dev -> http://localhost:5173

## Pages
- / -> Landing page V5 (photo blazer vert fondue, bouton vert Explorer mes services)
- /#admin -> Dashboard admin (code: pamela)
  - Stockage fichier local: localStorage clé abla_leads_db
  - Export JSON = abla-leads-db.json (ta base)
  - Export CSV pour Excel
  - Stats par type de besoin

## Fichiers
- public/hero.png = photo hero verte lissée
- public/headshot.png = miniatures rondes

Pour changer le code admin, ouvre src/App.tsx et cherche ADMIN_PASSWORD.
