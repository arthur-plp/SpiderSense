---
sidebar_position: 2
title: Modèle de données
---

# Modèle de données

Le schéma est défini dans `db/schema.ts` ; les migrations générées sont dans `db/migrations/`. Toutes les tables utilisent des identifiants **UUID**, pour qu'on ne puisse pas deviner les ressources à partir de l'URL.

## Rôles

| Rôle | Description |
|---|---|
| `CITIZEN` | Rôle par défaut à l'inscription |
| `HERO` | Attribué quand un modérateur valide la demande de statut super-héros |
| `MODERATOR` | Modération : incidents, avis, films, blog, newsletter, vérification des citoyens |
| `ADMIN` | Tout ce que fait un modérateur, plus la gestion des accès (héros, désactivation de comptes, rôles) |

Tout le monde s'inscrit comme citoyen, puis peut faire une demande de statut super-héros depuis son compte.

## Tables

### Utilisateurs et authentification

| Table | Contenu |
|---|---|
| `users` | Tous les comptes. L'adresse est stockée directement (une seule par utilisateur). `email_verified_at` = compte activé par mail ; `verified_at` = « Citoyen vérifié » par un modérateur ; `disabled_at` = compte désactivé |
| `hero_profiles` | Profil 1-1 des super-héros : pseudo (aussi utilisable pour se connecter), bio, pouvoirs, statut de la demande (`PENDING` / `APPROVED` / `REJECTED`). Aussi la **présence** : `on_duty` (en service ou non), dernière position connue (`latitude`, `longitude`, `location_updated_at`) |
| `user_avatars` | Photo de profil (type MIME + octets), servie par `GET /api/avatars/{userId}`. `users.avatar_url` contient l'URL versionnée |
| `sessions` | Sessions de connexion (30 jours). Seule l'empreinte SHA-256 du jeton est stockée |
| `user_tokens` | Liens à usage unique envoyés par mail : activation (7 jours) et réinitialisation du mot de passe (1 h) |
| `email_change_requests` | Changements d'email en attente de validation par la modération |
| `mail_outbox` | Mails conservés quand aucun serveur SMTP n'est configuré, affichés sur `/dev/mails` |

### Incidents

| Table | Contenu |
|---|---|
| `incident_types` | Référentiel : Vol, Cambriolage, Meurtre, Prise d'otages… `endangers_citizens` indique si le type compte dans les « citoyens en danger secourus » |
| `villains` | Les super-vilains : pseudo, identité si connue, secteur, statut (`AT_LARGE` / `IMPRISONED`) |
| `villain_specialties` | Spécialités illicites d'un vilain (N-N avec `incident_types`) |
| `incidents` | Les signalements, **intervention comprise** : un incident n'a qu'une intervention (un échec reste `FAILED`), donc `hero_id`, `intervention_started_at`, `intervention_ended_at` et `villain_imprisoned` sont portés par l'incident |
| `hero_reviews` | Note (1 à 5) et commentaire d'un citoyen sur le héros intervenu, avec la réponse du héros |

Cycle de vie d'un incident :

```
REPORTED ──(un héros intervient)──▶ IN_PROGRESS ──▶ SUCCEEDED
 « Signalé à l'instant »                      └───▶ FAILED
```

La priorité (`HIGH` / `NORMAL` / `LOW`) reste vide tant qu'un modérateur ou un héros ne l'a pas fixée. La suppression est « douce » (`deleted_at`) pour pouvoir prévenir le citoyen, par exemple en cas de doublon.

### Vidéothèque, newsletter, blog

| Table | Contenu |
|---|---|
| `movies` | Cache local des données IMDb |
| `hero_movies` | Films d'un héros, visibles après validation par un modérateur |
| `newsletter_subscriptions` | Abonnés (anonymes ou rattachés à un compte). `is_enabled` = réception suspendue ou non ; le désabonnement supprime la ligne |
| `newsletters` / `newsletter_sends` | Newsletters rédigées et historique des envois |
| `articles` | Articles du blog (HTML produit par l'éditeur) |
| `activity_logs` | Journal des actions, pour la supervision par les modérateurs |

## Règles garanties par la base

Ces règles sont des contraintes PostgreSQL : elles tiennent même si le code applicatif a un bug.

| Règle | Mécanisme |
|---|---|
| Un héros n'a qu'**une intervention en cours à la fois** | Index unique partiel `incidents_one_active_intervention_per_hero` |
| Les champs d'intervention correspondent au statut (pas de `IN_PROGRESS` sans héros, etc.) | Contrainte `incidents_intervention_matches_status` |
| Un vilain ne peut être emprisonné que sur une intervention réussie | Contrainte `incidents_imprisoned_only_if_succeeded` |
| Une note entre 1 et 5, une seule par incident | Contrainte `hero_reviews_rating_range` + unicité de `incident_id` |
| Emails et pseudos uniques sans tenir compte de la casse | Index uniques sur `lower(email)` / `lower(alias)` |
| Une seule demande de changement d'email en attente par utilisateur | Index unique partiel |

## Statistiques

Les statistiques de l'espace professionnel ne sont pas stockées : elles sont calculées à la demande.

| Statistique | Calcul |
|---|---|
| Citoyens secourus | Somme de `people_involved` des incidents `SUCCEEDED` |
| Citoyens en danger secourus | Idem, limité aux types où `endangers_citizens` est vrai |
| Vilains identifiés / emprisonnés | Nombre de `villains` / ceux au statut `IMPRISONED` |
| Note d'un héros | Moyenne des `hero_reviews` visibles |
| Pire ennemi | Vilain le plus fréquent dans les interventions du héros |
| Films d'un héros | `hero_movies` au statut `APPROVED` |

## Faire évoluer le schéma

1. Modifier `db/schema.ts`.
2. `npm run db:generate -- --name <description>` génère la migration SQL.
3. Relire le SQL généré, puis `npm run db:migrate`.

Les données de référence (comme `incident_types`) s'ajoutent avec une migration écrite à la main : `npm run db:generate -- --custom --name <nom>`.

Les données de démo (comptes, incidents, avis, films…) ne sont pas des migrations : elles sont dans `db/seed-data.ts` et `db/seed.ts`, chargées par `npm run db:seed`.
