---
sidebar_position: 7
title: Temps réel et hors ligne
---

# Temps réel et hors ligne

Deux besoins du terrain :

- une alerte SOS doit apparaître **tout de suite** chez les héros, sans attendre la prochaine actualisation ;
- un citoyen ou un héros **sans réseau** (sous-sol, tunnel, zone blanche) doit pouvoir agir quand même : l'action part dès le retour de la connexion, une seule fois, avec l'heure à laquelle elle a été faite.

## Temps réel : Server-Sent Events

```
écriture (route API) ──► INSERT domain_events + pg_notify('domain_events') ── commit ──┐
                                                                                        ▼
navigateurs ◄── GET /api/events/stream (SSE) ◄── LISTEN domain_events (1 connexion par serveur)
     │
     └─► recharge /api/incidents ou /api/heroes (les droits d'accès s'appliquent)
```

- **`GET /api/events/stream`** (connecté) envoie un message `change` par événement du journal : type, agrégat, identifiant, numéro de séquence. Rien de personnel : la carte recharge ensuite ses données par les routes habituelles, qui appliquent les droits d'accès.
- **`pg_notify` dans la transaction** : la notification ne part qu'au commit. Un écouteur ne voit jamais un changement annulé.
- **Une connexion `LISTEN` par serveur** (`lib/server/events/live.ts`), partagée par tous les navigateurs connectés à ce serveur, et reconnectée en cas de coupure. Avec plusieurs instances, chacune reçoit toutes les notifications, y compris celles des scripts. Avec PGlite (un seul processus), le magasin d'événements publie en mémoire.
- **Côté navigateur** (`lib/live-events.ts`) : un seul `EventSource` par onglet, qui se reconnecte tout seul. `useLiveResource(…, { live: ["incident"] })` recharge les données quand un événement concerné arrive, en regroupant les rafales sur 300 ms. Tant que le flux est connecté, l'actualisation périodique n'est plus qu'un filet de sécurité, toutes les 60 s.
- Le centre d'opérations affiche « **Temps réel** » quand le flux est connecté, « Actualisation auto » sinon.

Mesuré : une alerte lancée par un citoyen apparaît chez un héros en **moins d'une seconde**, regroupement de 300 ms compris.

## Hors ligne

### Les actions attendent sur l'appareil

`apiRequest(…, { offline: "Alerte SOS : Vol" })` (`lib/api-client.ts`) :

1. génère une **clé d'idempotence** (UUID) pour l'action, envoyée dans l'en-tête `Idempotency-Key` même en ligne ;
2. sans réseau (`navigator.onLine` faux, ou `fetch` qui échoue), range l'action dans **IndexedDB** (`lib/offline/outbox.ts`) avec cette clé et l'heure du clic, puis répond « en attente » à l'interface ;
3. au retour du réseau (`online`, ouverture de l'app), les actions sont **rejouées dans l'ordre**, avec les en-têtes `X-Offline-Replay: 1` et `X-Client-Time: <heure du clic>`.

Actions disponibles hors ligne :

| Qui | Action | Route |
|---|---|---|
| Citoyen | Alerte SOS, signalement détaillé | `POST /api/incidents` |
| Citoyen | Noter une intervention | `POST /api/incidents/:id/review` |
| Héros | Prendre en charge, fixer la priorité, clôturer | `POST …/intervention`, `PATCH …/priority`, `POST …/intervention/close` |
| Héros | Position, en service / hors service | `PUT /api/me/location`, `PUT /api/me/duty` |

### Jamais deux fois : l'idempotence

`route()` (`lib/server/api.ts`) enregistre la réponse de chaque requête qui porte une `Idempotency-Key` (table `idempotency_keys`) :

| Cas | Réponse |
|---|---|
| Première fois | L'action s'exécute, sa réponse est enregistrée |
| Même clé, déjà traitée | La **réponse enregistrée**, avec l'en-tête `Idempotent-Replayed: true`. Rien n'est refait |
| Même clé, encore en cours | `409` avec `Retry-After: 2` : l'appareil réessaiera |
| Même clé pour une autre route ou un autre compte | `422` |
| Erreur serveur (5xx) | La clé est libérée : l'action pourra être rejouée |

C'est ce qui rend la synchronisation sûre : si le réseau coupe **après** que le serveur a traité l'action mais **avant** que la réponse arrive, le rejeu ne crée pas de doublon.

### L'heure réelle de l'action

`X-Client-Time` devient l'`occurred_at` de l'événement, la date de l'incident (s'il n'en a pas été saisi), et l'heure de début ou de fin d'intervention. Elle est refusée si elle est dans le futur ou date de plus de 7 jours. `recorded_at − occurred_at` donne le délai de synchronisation, suivi dans Kibana.

### Conflits

Pendant qu'un héros était hors ligne, un autre a pu prendre le même incident. Au rejeu, le serveur répond `409` (« Cet incident est déjà pris en charge ») : l'action est retirée de la file et signalée dans le bandeau, en rouge. L'état du serveur fait foi, rien n'est écrasé.

### Ouvrir l'app sans réseau : le service worker

`public/sw.js`, enregistré en production (`components/ui/service-worker.tsx`) :

| Requêtes | Stratégie |
|---|---|
| Pages de `/citoyen` et `/heros` (et leurs données RSC) | Réseau d'abord, sinon la dernière version en cache, sinon la page `/hors-ligne` |
| `/_next/static/*` | Cache d'abord (le nom des fichiers change avec leur contenu) |
| `GET /api/incidents`, `/api/heroes`, avatars | Réseau d'abord, sinon les dernières données connues |
| Tuiles de la carte | Cache, rafraîchi en arrière-plan (600 tuiles au plus) |
| Autres pages | Réseau, sinon la page `/hors-ligne` (les pages de modération ne sont pas gardées) |
| Mutations | Jamais interceptées : c'est la file de l'app qui s'en charge |

Avec **Background Sync** (Chrome, Edge), le service worker rejoue la file même si l'onglet est fermé. Les autres navigateurs la rejouent à la prochaine ouverture de l'app.

À la **déconnexion**, la réponse de `POST /api/auth/logout` porte `Clear-Site-Data: "cache", "storage"` : l'appareil efface les pages gardées et la file d'attente du compte.

:::info Développement
En `npm run dev`, le service worker est désactivé, car ses caches gêneraient le rechargement à chaud. La file d'attente fonctionne quand même, tant que la page est ouverte. Pour tout tester : `npm run build && npm start`, ou `NEXT_PUBLIC_ENABLE_SW=true` en dev.
:::
