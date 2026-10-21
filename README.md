# Spider Sense

Plateforme qui met en relation les citoyens et les super-héros : un citoyen signale un incident depuis son téléphone, les héros disponibles à proximité interviennent, la modération supervise.

Stack : Next.js (pages + API), PostgreSQL, Drizzle ORM.

## Prérequis

- **Node.js 22** et **npm 11** (`npm install -g npm@11` si besoin)
- **Docker Desktop**, pour PostgreSQL

## Installation

```bash
npm install
cp .env.example .env
```

Puis, avec Docker Desktop lancé :

```bash
docker compose up -d db   # PostgreSQL sur le port 5433
npm run db:migrate        # crée les tables
npm run db:seed           # charge les données de démo
npm run dev
```

L'application est sur http://localhost:3000.

> **Ne lancez pas `docker compose up` sans préciser `db`** : le conteneur `app` démarrerait aussi et prendrait le port 3000. `npm run dev` passerait alors sur 3001. Si c'est arrivé : `docker compose stop app`.

### Sans Docker

Sans `DATABASE_URL` (supprimez ou commentez la ligne dans `.env`), l'application utilise une base PostgreSQL embarquée (PGlite, stockée dans `.data/pglite`). Elle est migrée et remplie avec les données de démo au premier démarrage : `npm install` puis `npm run dev` suffisent.

## Comptes de démo

Mot de passe commun : **`Demo1234!`**

| Rôle | Email | Espace |
|---|---|---|
| Admin | `admin@spider-sense.test` | `/admin` |
| Modérateur | `moderateur@spider-sense.test` | `/admin` |
| Héros | `spiderman@spider-sense.test` | `/heros` |
| Citoyen | `citoyen@spider-sense.test` | `/citoyen` |

## Pages utiles en développement

| URL | Contenu |
|---|---|
| http://localhost:3000/dev/mails | Mails envoyés par l'application (activation, mot de passe oublié…). Sans `SMTP_URL`, aucun mail ne part : ils sont affichés ici |
| http://localhost:3000/api-docs | Documentation de l'API (Swagger) |

## Scripts

| Commande | Effet |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build et serveur de production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Génère une migration à partir des changements de `db/schema.ts` |
| `npm run db:migrate` | Applique les migrations en attente |
| `npm run db:seed` | Charge les données de démo (seulement si la base n'a aucun utilisateur) |
| `npm run db:studio` | Drizzle Studio (développement uniquement) |

## Repartir d'une base vide

```bash
docker compose down -v      # supprime le volume PostgreSQL
docker compose up -d db
npm run db:migrate
npm run db:seed
```

## Dépannage

- **`Turbopack error` / `task is missing in memory`** après un changement de branche : arrêtez `npm run dev`, supprimez le dossier `.next`, relancez.
- **`npm run db:migrate` échoue avec une erreur de connexion** : Docker Desktop n'est pas lancé ou le conteneur `db` est arrêté (`docker compose up -d db`).
