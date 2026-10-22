---
sidebar_position: 1
title: Prise en main
---

# Prise en main

Le backend est porté par Next.js : les **Server Actions** (`lib/actions/`) pour les formulaires et les mutations, et quelques **route handlers** (`app/api/**/route.ts`) pour les données temps réel. La base est **PostgreSQL**, avec **Drizzle** comme ORM.

## Prérequis

- **Node.js 22** et **npm 11** : le `package-lock.json` est écrit par npm 11, que npm 10 refuse (`npm install -g npm@11`).
- **Docker Desktop** : PostgreSQL et Mailpit tournent dans des conteneurs.

## Installation

```bash
npm install
cp .env.example .env
npm run services:up      # PostgreSQL (port 5433) + Mailpit
npm run db:migrate       # crée les tables
npm run db:seed          # charge les données de démo
npm run dev
```

L'application est alors disponible sur http://localhost:3000. `npm run services:down` arrête PostgreSQL et Mailpit (les données sont conservées).

:::caution Port 3000 en développement
Ne lancez pas `docker compose up` sans préciser de service : le conteneur `app` démarrerait aussi et prendrait le port 3000. `next dev` basculerait alors sur 3001, et les liens des mails (`APP_URL`) pointeraient vers le mauvais serveur. Si c'est arrivé : `docker compose stop app`.
:::

### Sans Docker

Sans `DATABASE_URL` (ligne supprimée ou commentée dans `.env`), l'application utilise **PGlite**, un PostgreSQL embarqué stocké dans `.data/pglite`. Il est migré et rempli avec les données de démo au premier démarrage : `npm install` puis `npm run dev` suffisent.

Sans `SMTP_URL`, les mails ne sont pas envoyés : ils sont enregistrés en base et lisibles sur http://localhost:3000/dev/mails.

## Comptes de démo

Mot de passe commun : **`Demo1234!`**

| Rôle | Email | Espace |
|---|---|---|
| Admin | `admin@spider-sense.test` | `/admin` |
| Modérateur | `moderateur@spider-sense.test` | `/admin` |
| Héros | `spiderman@spider-sense.test` (ou l'alias `Spider-Man`) | `/heros` |
| Citoyen | `citoyen@spider-sense.test` | `/citoyen` |

Les héros validés peuvent aussi se connecter avec leur alias.

## Lire les mails en développement

Aucun mail ne part sur Internet en développement : **Mailpit** les capture tous. Ouvrez http://localhost:8025 pour lire les mails d'activation, de réinitialisation ou les notifications, et cliquer sur leurs liens. Les pages d'inscription, de connexion et de mot de passe oublié affichent un bouton « Ouvrir la boîte mail de démo » qui y mène (`MAILPIT_URL`).

| Service | URL | Rôle |
|---|---|---|
| Application | http://localhost:3000 | Next.js (pages + API) |
| Swagger | http://localhost:3000/api-docs | Documentation interactive des endpoints HTTP |
| Mailpit | http://localhost:8025 | Boîte de réception de développement |
| PostgreSQL | `localhost:5433` | Base de données |

:::info Port PostgreSQL
PostgreSQL est exposé sur le port **5433** de la machine (et non 5432) pour ne pas entrer en conflit avec une autre instance. Modifiable avec `POSTGRES_PORT` dans `.env`.
:::

## Variables d'environnement

| Variable | Description |
|---|---|
| `DATABASE_URL` | Chaîne de connexion PostgreSQL. Absente : base embarquée PGlite |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | Paramètres du conteneur PostgreSQL |
| `APP_URL` | URL publique de l'application, utilisée dans les liens des mails |
| `SMTP_URL` | Serveur d'envoi des mails (`smtp://localhost:1025` pour Mailpit). Absente : mails stockés en base et affichés sur `/dev/mails` |
| `MAIL_FROM` | Expéditeur des mails |
| `MAILPIT_URL` | Interface de Mailpit, liée depuis les pages d'inscription et de mot de passe (développement uniquement) |
| `SEED_DEMO_DATA` | `true` / `false` : force ou empêche le chargement des données de démo au démarrage (par défaut : seulement avec PGlite) |
| `DB_MIGRATE_ON_START` | `true` : applique les migrations au démarrage (PostgreSQL) |
| `ENABLE_MAIL_PREVIEW` | `true` : garde `/dev/mails` en production (déconseillé : la page montre les liens d'activation) |

Le fichier `.env` n'est jamais commité ; `.env.example` sert de modèle.

## Scripts

| Commande | Effet |
|---|---|
| `npm run services:up` / `services:down` | Démarre / arrête PostgreSQL et Mailpit |
| `npm run dev` | Serveur de développement |
| `npm run docs` | Lance cette documentation sur http://localhost:3001 |
| `npm run db:generate` | Génère une migration SQL à partir des changements de `db/schema.ts` |
| `npm run db:migrate` | Applique les migrations en attente |
| `npm run db:seed` | Charge les données de démo (seulement si la base n'a aucun utilisateur) |
| `npm run db:studio` | Ouvre Drizzle Studio (**développement uniquement**) |

:::warning RGPD
Le cahier des charges interdit tout outil d'accès direct aux données en production. Drizzle Studio et l'accès `psql` sont réservés au développement.
:::

## Repartir d'une base vide

```bash
docker compose down -v      # supprime le volume PostgreSQL
npm run services:up
npm run db:migrate
npm run db:seed
```

## Dépannage

- **`Turbopack error` / `task is missing in memory`** après un changement de branche : arrêtez `npm run dev`, supprimez le dossier `.next`, relancez.
- **`npm run db:migrate` échoue avec une erreur de connexion** : Docker Desktop n'est pas lancé, ou le conteneur `db` est arrêté (`npm run services:up`).
- **Aucun mail dans Mailpit** : vérifiez que `SMTP_URL=smtp://localhost:1025` est dans `.env` et que le conteneur `mailpit` tourne. Les mails partent juste après la réponse ; une erreur d'envoi est seulement écrite dans la console de `npm run dev`.
