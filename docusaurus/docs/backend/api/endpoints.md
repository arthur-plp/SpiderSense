---
sidebar_position: 2
title: Endpoints
---

# Endpoints

Les 57 opérations de l'API, par domaine. Le détail des corps, des réponses et des erreurs, testable en direct, est sur **http://localhost:3000/api-docs**.

**Accès** : _Public_ = sans compte ; _Connecté_ = tout utilisateur connecté ; _Héros_ = super-héros validé ; _Staff_ = modérateur ou admin ; _Admin_ = administrateur.

## Authentification

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Crée un compte citoyen non activé. Mail d'activation (lien valable 7 jours) + mail aux modérateurs |
| `POST` | `/api/auth/activate` | Public | Active le compte avec le jeton du lien. L'application le fait sur un clic, jamais au chargement de la page : les antivirus de messagerie ouvrent les liens |
| `POST` | `/api/auth/login` | Public | Connexion par email (ou alias pour un héros validé). Pose le cookie de session. Renvoie l'utilisateur et `homePath` (son espace) |
| `POST` | `/api/auth/logout` | Public | Supprime la session |
| `GET` | `/api/auth/me` | Connecté | Utilisateur de la session |
| `POST` | `/api/auth/resend-activation` | Public | Renvoie un lien d'activation. Même réponse que l'email existe ou non |
| `POST` | `/api/auth/forgot-password` | Public | Lien de réinitialisation (1 h). Même réponse que l'email existe ou non |
| `POST` | `/api/auth/reset-password` | Public | Nouveau mot de passe avec le jeton du lien |

## Mon compte

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `PUT` | `/api/me/contact` | Connecté | Téléphone et adresse |
| `PUT` | `/api/me/password` | Connecté | Change le mot de passe (vérifie l'actuel) |
| `POST` / `DELETE` | `/api/me/email-change` | Connecté | Demande (ou annule) un changement d'email, validé par la modération |
| `PUT` / `DELETE` | `/api/me/avatar` | Connecté | Photo de profil (`multipart/form-data`, champ `avatar`) |
| `POST` / `PATCH` / `DELETE` | `/api/me/newsletter` | Connecté | S'abonner avec l'email du compte, suspendre / reprendre (`{ enabled }`), se désabonner |
| `POST` | `/api/me/hero-application` | Connecté | Demande de statut super-héros. Mail aux modérateurs |

## Super-héros

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `PUT` | `/api/me/hero-profile` | Héros | Pouvoirs et biographie |
| `PUT` | `/api/me/duty` | Héros | En service / hors service (`{ onDuty }`) |
| `PUT` | `/api/me/location` | Héros | Position sur les cartes (`{ lat, lng }`) |
| `POST` | `/api/me/movies` | Héros | Ajoute un film IMDb (`{ imdbId }`), visible après validation |
| `DELETE` | `/api/me/movies/{movieId}` | Héros | Retire un film |
| `PUT` | `/api/reviews/{reviewId}/reply` | Héros | Répond à l'avis d'un citoyen |

## Incidents

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `GET` | `/api/incidents` | Connecté | Incidents en cours, pour les cartes (voir ci-dessous) |
| `POST` | `/api/incidents` | Connecté | Signale un incident (formulaire ou bouton SOS). Mail aux héros en service et aux modérateurs. `priority` réservé aux modérateurs |
| `GET` | `/api/incidents/nearby?lat=&lng=` | Connecté | Incidents actifs à moins de 500 m, pour prévenir les doublons |
| `GET` | `/api/incidents/{id}` | Connecté | Détail d'un incident |
| `PUT` | `/api/incidents/{id}` | Staff | Corrige l'incident (tous les champs). Mail au déclarant |
| `DELETE` | `/api/incidents/{id}` | Staff | Suppression douce avec un motif, envoyé au déclarant |
| `PATCH` | `/api/incidents/{id}/priority` | Héros, staff | Priorité `HIGH` / `NORMAL` / `LOW` |
| `POST` | `/api/incidents/{id}/intervention` | Héros | Prend l'incident en charge (une intervention à la fois). Mail aux modérateurs |
| `POST` | `/api/incidents/{id}/intervention/close` | Héros | Clôture avec un rapport. Mail aux modérateurs, invitation à noter pour le citoyen |
| `GET` | `/api/incidents/{id}/reporter-contact` | Héros | Prénom et téléphone du citoyen, pour le héros en charge seulement |
| `POST` | `/api/incidents/{id}/review` | Connecté | Le déclarant note le héros (1 à 5), une fois |
| `POST` | `/api/incidents/{id}/villain` | Staff | Crée la fiche du vilain nommé dans le signalement et la lie. Mail au déclarant |

`GET /api/incidents` est interrogée en boucle par le centre d'opérations des héros (toutes les 10 s) et l'app citoyen (toutes les 15 s), via `components/ui/use-live-resource.ts`. Elle renvoie `{ serverTime, incidents }` : `serverTime` permet d'afficher « il y a 3 min » sans dépendre de l'horloge du téléphone.

| | Incidents | `reporterId` |
|---|---|---|
| Citoyen | Actifs (`REPORTED`, `IN_PROGRESS`) | Renseigné seulement sur ses propres signalements |
| Héros, staff | Actifs + terminés depuis moins de 24 h | Toujours renseigné |

## Temps réel, recherche et médias

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `GET` | `/api/heroes` | Connecté | Héros validés : position, disponibilité (`AVAILABLE`, `BUSY`, `OFF_DUTY`), statistiques. Sans email ni téléphone. Interrogée toutes les 20 s |
| `GET` | `/api/geocode/search?q=` | Connecté | Jusqu'à 5 adresses en France, à partir de 3 caractères |
| `GET` | `/api/geocode/reverse?lat=&lng=` | Connecté | Adresse d'une position GPS |
| `GET` | `/api/imdb/search?q=` | Héros, staff | Recherche de films IMDb, à partir de 2 caractères |
| `GET` | `/api/avatars/{userId}` | Public | Photo de profil, mise en cache un an (l'URL change à chaque envoi : `?v=<timestamp>`) |

Le géocodage passe par [Nominatim](https://nominatim.org/) (OpenStreetMap), avec un `User-Agent` dédié comme l'exigent ses conditions d'utilisation (`lib/server/geocode.ts`). IMDb est interrogé via son moteur de suggestions public, sans clé d'API (`lib/server/imdb.ts`). Si l'un d'eux ne répond pas : `502`, avec une liste vide ou `null` pour que le formulaire reste utilisable.

## Newsletter

| Méthode | Route | Accès | Effet |
|---|---|---|---|
| `POST` | `/api/newsletter/subscriptions` | Public | Abonnement sans compte. Mail de bienvenue. Même réponse si l'adresse était déjà abonnée |
| `POST` | `/api/newsletter/unsubscribe` | Public | Désabonnement avec le jeton du lien présent dans chaque newsletter |

## Modération

Toutes ces routes sont réservées au **staff**, sauf mention contraire. Chaque action est enregistrée dans `activity_logs`.

| Méthode | Route | Effet |
|---|---|---|
| `POST` | `/api/admin/hero-applications/{userId}/decision` | Valide / refuse une demande de super-héros (`{ approved }`). Mail au demandeur |
| `POST` | `/api/admin/email-changes/{requestId}/decision` | Valide / refuse un changement d'email. Mail à l'utilisateur |
| `POST` | `/api/admin/hero-movies/{heroId}/{movieId}/decision` | Valide / refuse un film proposé par un héros. Mail au héros |
| `PATCH` | `/api/admin/reviews/{reviewId}` | Masque / réaffiche un avis (`{ hidden }`) |
| `POST` | `/api/admin/users/{userId}/verification` | Badge « Citoyen vérifié » |
| `PATCH` | `/api/admin/users/{userId}/status` | Désactive / réactive un compte (`{ disabled }`). Ses sessions sont fermées |
| `PUT` | `/api/admin/users/{userId}/role` | Change le rôle. **Admins uniquement**, jamais sur leur propre compte |
| `POST` | `/api/admin/villains` | Crée une fiche de l'encyclopédie des vilains |
| `PUT` / `DELETE` | `/api/admin/villains/{id}` | Modifie / supprime une fiche |
| `POST` | `/api/admin/articles` | Crée un article de blog (HTML nettoyé côté serveur) |
| `PUT` / `DELETE` | `/api/admin/articles/{id}` | Modifie / supprime un article |
| `POST` | `/api/admin/newsletters` | Envoie une newsletter à tous les abonnés actifs, ou à un seul pour tester |
