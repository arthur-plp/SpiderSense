---
sidebar_position: 2
title: Endpoints HTTP
---

# Endpoints HTTP

Les route handlers de `app/api/`. Le détail des paramètres et des réponses, testable en direct, est sur **http://localhost:3000/api-docs** (Swagger, alimenté par `public/openapi.json`).

| Méthode | Route | Accès | Rôle |
|---|---|---|---|
| `GET` | `/api/incidents` | Connecté | Incidents en cours, pour les cartes |
| `GET` | `/api/heroes` | Connecté | Super-héros validés, avec position et disponibilité |
| `GET` | `/api/geocode/search?q=` | Connecté | Suggestions d'adresses |
| `GET` | `/api/geocode/reverse?lat=&lng=` | Connecté | Adresse d'une position GPS |
| `GET` | `/api/imdb/search?q=` | Héros validé, modérateur, admin | Recherche de films IMDb |
| `GET` | `/api/avatars/{userId}` | Public | Photo de profil |

## Temps réel

### `GET /api/incidents`

Interrogée en boucle par le centre d'opérations des héros (toutes les 10 s) et l'app citoyen (toutes les 15 s), via `components/ui/use-live-resource.ts`. Renvoie `{ serverTime, incidents }` : `serverTime` permet d'afficher « il y a 3 min » sans dépendre de l'horloge du téléphone.

Le contenu dépend du rôle :

| | Incidents | `reporterId` |
|---|---|---|
| Citoyen | Actifs (`REPORTED`, `IN_PROGRESS`) | Renseigné seulement sur ses propres signalements |
| Héros, modérateur, admin | Actifs + terminés depuis moins de 24 h | Toujours renseigné |

### `GET /api/heroes`

Héros dont le profil est approuvé : alias, pouvoirs, position, disponibilité (`AVAILABLE`, `BUSY`, `OFF_DUTY`), statistiques (interventions, citoyens secourus, note moyenne…). **Sans** email ni téléphone. Interrogée toutes les 20 s par les deux cartes.

Les deux routes répondent avec `Cache-Control: no-store`.

## Recherche

### `GET /api/geocode/search` et `GET /api/geocode/reverse`

Passent par [Nominatim](https://nominatim.org/) (OpenStreetMap), limité à la France pour la recherche (5 résultats au plus, à partir de 3 caractères). Le serveur s'identifie avec un `User-Agent` dédié, comme l'exigent les conditions d'utilisation de Nominatim (`lib/server/geocode.ts`).

Si Nominatim ne répond pas : `502`, avec `results: []` ou `address: null` pour que le formulaire reste utilisable en saisie manuelle.

### `GET /api/imdb/search`

Utilisée par les héros pour ajouter les films où ils apparaissent ; un modérateur valide ensuite chaque film. Passe par le moteur de suggestions public d'IMDb (sans clé d'API, `lib/server/imdb.ts`), à partir de 2 caractères.

## Médias

### `GET /api/avatars/{userId}`

Sert la photo stockée dans `user_avatars`. Publique, car les photos des héros apparaissent sur le site public. L'URL enregistrée dans `users.avatar_url` contient une version (`?v=<timestamp>`) qui change à chaque envoi : l'image est donc mise en cache un an (`immutable`).
