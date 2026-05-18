
# Plan — PipeSend (Dashboard + Sponsors avec driver CAKE)

## 1. Activer Lovable Cloud
Provisionner la base Postgres + server functions (nécessaire pour stocker sponsors/offres et appeler l'API CAKE côté serveur sans exposer la clé).

## 2. Schéma base de données

```text
pipesend_sponsors
  id (uuid, pk)
  name (text)
  driver (text)              -- 'cake' | 'everflow' | 'hitpath' (seul 'cake' fonctionnel)
  api_base (text)            -- ex: https://publisher.cx3ads.com/affiliates/api
  api_key (text)             -- clé affilié (stockée en DB, accès RLS server-only)
  affiliate_id (text)        -- ex: 10735
  last_sync_at (timestamptz)
  created_at (timestamptz)

pipesend_sponsor_offers
  id (uuid, pk)
  sponsor_id (uuid, fk)
  offer_id (text)            -- id CAKE
  name (text)
  vertical (text)
  payout (numeric)
  payout_display (text)      -- "$30"
  status (text)              -- active/paused
  html_creative (text)
  raw (jsonb)                -- payload XML normalisé
  updated_at (timestamptz)
  unique(sponsor_id, offer_id)
```

RLS : tables accessibles uniquement via server functions (admin client). Pas d'auth pour l'instant donc lecture publique côté server fn.

## 3. Driver CAKE (server-only)

Fichier `src/lib/cake.server.ts` :
- `fetchOffers(sponsor)` → GET `${api_base}/1/offers.asmx/OfferFeed?api_key=...&affiliate_id=...`
- `fetchCreatives(sponsor)` → GET `${api_base}/1/creatives.asmx/CreativeFeed?...`
- Fallback de version : essai v1 → v4 → v3 → v2 si réponse vide
- Parsing XML via `fast-xml-parser` (compatible Workers, contrairement à `xml2js` qui dépend de Node stream)
- Helpers : `parseXmlNullable`, `parseCakePayout`, `decodeHtmlEntities`, `toArray`
- `normalizeOffer(raw)` → `{ offer_id, name, vertical, payout, payout_display, status, html_creative, raw }`

## 4. Server functions

Fichier `src/lib/sponsors.functions.ts` :
- `listSponsors()` — liste sponsors + compteur offres
- `getSponsorOffers({ sponsorId, search })` — offres paginées + recherche
- `createSponsor({ name, driver, api_base, api_key, affiliate_id })`
- `deleteSponsor({ id })`
- `syncSponsor({ id })` — appelle driver CAKE, upsert offres, met à jour `last_sync_at`
- `getDashboardStats()` — métriques dashboard

## 5. Routes (TanStack Router)

```text
src/routes/
  __root.tsx            -- shell HTML
  _layout.tsx           -- sidebar PipeSend + outlet
  _layout/index.tsx     -- redirect → /dashboard
  _layout/dashboard.tsx -- page Dashboard (image 1)
  _layout/sponsors.tsx  -- page Sponsors (image 2, fonctionnelle)
```

Sidebar avec sections : Overview (Dashboard), Amazon SES (Identities, Config Sets, Suppression — placeholders), SES Campaigns (Campaigns, Suivi, Import, Subscribers, Templates, Reports — placeholders), Store (Products, Add Product, Sponsors), Nexus AI (Chat — placeholder), Admin (Settings — placeholder).

Seuls **Dashboard** et **Sponsors** sont fonctionnels ; les autres affichent un état "Coming soon" pour ne pas casser la nav.

## 6. Page Dashboard (image 1)
- Header "Dashboard — PipeSend Email Marketing Platform"
- Bannière Nexus AI (statique)
- 4 KPI cards : Envois du jour, Membres confirmés, Bounces 24h, Clics suivis (depuis `getDashboardStats` — valeurs 0 / mock tant que pas de données SES)
- 2 panels : Amazon SES Health + Subscribers (mock)
- Recent Campaigns + Live SES Events (placeholder vide)

## 7. Page Sponsors (image 2 — FONCTIONNELLE)
- Bouton "+ Ajouter un sponsor" → dialog (driver = cake par défaut, champs api_base/api_key/affiliate_id)
- Colonne gauche : liste sponsors, sélection met à jour la colonne droite
- Boutons par sponsor : Sync (lance `syncSponsor`), Supprimer
- Colonne droite : 4 stat cards (Offres actives, Clics 30j, Conversions, Revenus 30j — clics/conv/revenus à 0 tant que pas de tracking)
- Tableau offres : recherche + colonnes #ID, Offre, Vertical, Payout, Status
- Toast succès/erreur (sonner)
- TanStack Query pour cache + invalidation après sync

## 8. Secret CAKE
La clé est stockée **en DB** (table `pipesend_sponsors.api_key`) saisie via le formulaire UI, pas via `add_secret` — un utilisateur peut donc ajouter plusieurs comptes CAKE sans intervention dev. Lecture uniquement par server functions (admin client).

## 9. Design system
Tokens dans `src/styles.css` reproduisant la palette PipeSend : fond `#f3f4f8`, sidebar sombre `#1a1d2e`, primary violet `#7c5cff`, accents (vert, orange, ambre, rose) pour les KPI cards. Police Inter. Cards arrondies 16px avec léger shadow et "blob" décoratif.

## Détails techniques
- Package à installer : `fast-xml-parser` (compatible Cloudflare Workers ; pas `xml2js`)
- Pas de `child_process`, pas de fs — tout passe par `fetch`
- Timeout fetch CAKE : `AbortController` 30s
- Les server fns renvoient des DTOs plats (offres mappées, pas la réponse XML brute)
- Pas de `requireSupabaseAuth` (pas d'auth demandée) → server fns publiques utilisant `supabaseAdmin`
- `pendingComponent` + `errorComponent` sur chaque route avec loader

## Limites assumées
- Pas d'auth → endpoints sponsors ouverts à quiconque ouvre l'app. À ajouter avant prod.
- Clics/conversions/revenus = 0 (l'API CAKE Summary nécessite un setup supplémentaire ; on peut l'ajouter en V2).
- Drivers Everflow/HitPath visibles dans l'UI mais désactivés.
