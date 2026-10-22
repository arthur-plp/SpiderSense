---
sidebar_position: 1
title: Conventions
---

# Conventions de l'API

Tout le backend passe par une **API REST** : les route handlers de `app/api/**/route.ts`. L'application l'utilise elle-même, chaque formulaire et chaque bouton appelant un endpoint. Ce que montre Swagger est donc exactement ce que fait l'interface.

- **Référence interactive** : http://localhost:3000/api-docs (Swagger, alimenté par `public/openapi.json`).
- **Vue d'ensemble** : [Endpoints](./endpoints).

```
Formulaire React ──fetch──► app/api/.../route.ts ──► lib/server/services/ ──► PostgreSQL
  (useApiForm)               validation, droits        logique métier
```

## Authentification

`POST /api/auth/login` crée une session en base et pose un cookie `spidersense_session` :

- `HttpOnly` : inaccessible au JavaScript de la page, donc protégé contre le vol par XSS ;
- `SameSite=Lax` : non envoyé par les requêtes `POST` venant d'autres sites ;
- `Secure` en production : uniquement transmis en HTTPS ;
- valable **30 jours**. Seule l'empreinte SHA-256 du jeton est stockée (table `sessions`).

On se connecte avec son email, ou avec son alias pour un super-héros validé. Le navigateur renvoie le cookie tout seul, à l'application comme à Swagger.

:::tip Tester dans Swagger
Ouvrez `POST /api/auth/login`, cliquez sur *Try it out* et envoyez `{ "identifier": "moderateur@spider-sense.test", "password": "Demo1234!" }`. Les appels suivants sont faits en tant que modérateur. `POST /api/auth/logout` pour changer de compte.
:::

### Protection CSRF

En plus de `SameSite=Lax`, `route()` refuse (403) toute requête `POST`, `PUT`, `PATCH` ou `DELETE` dont l'en-tête `Origin` désigne un autre site. Les navigateurs envoient toujours cet en-tête sur ces requêtes. Un outil comme curl ou Postman, qui n'en envoie pas, reste accepté : il ne porte pas les cookies d'une victime.

### Contrôle d'accès

Deux niveaux :

1. **`proxy.ts`** : un contrôle optimiste. Sans cookie de session, `/citoyen`, `/heros` et `/admin` redirigent vers `/connexion?next=…`.
2. **Chaque route** vérifie le rôle avec les helpers de `lib/server/api.ts` :

| Helper | Accepte | Sinon |
|---|---|---|
| `apiUser()` | Utilisateur connecté | `401` |
| `apiUser(["ADMIN"])` | Connecté avec un de ces rôles | `401` / `403` |
| `apiHero()` | Rôle `HERO` **et** profil héros approuvé | `401` / `403` |
| `apiStaff()` | `MODERATOR` ou `ADMIN` | `401` / `403` |

Les pages utilisent les équivalents de `lib/server/auth.ts` (`requireUser`, `requireHero`, `requireStaff`), qui redirigent au lieu de répondre en JSON.

## Requêtes

- Corps en **JSON** ; `multipart/form-data` pour l'envoi de fichiers (avatar).
- Les routes « formulaire » acceptent les nombres en nombre ou en chaîne (`"typeId": 3` comme `"typeId": "3"`). Un champ facultatif vide ou `null` est ignoré.
- Dates en ISO 8601 (`2026-10-20T09:43:50.478Z`, ou `2001-08-10` pour une date seule).
- Identifiants : UUID. Un identifiant mal formé dans l'URL donne un `404`.

## Réponses

Succès : un objet JSON, avec un `message` en français quand il y a quelque chose à afficher, et les données utiles (`id` créé, etc.). Les données sont toujours enveloppées (`{ "incidents": [...] }`), jamais un tableau nu : on peut ajouter des champs sans casser le front. `204` sans corps quand il n'y a rien à dire (déconnexion, suppression de son avatar…).

Erreurs : `{ "error": "message" }`, plus `fieldErrors` pour les erreurs de validation :

```json
{
  "error": "Certains champs sont à corriger.",
  "fieldErrors": {
    "city": ["La ville est obligatoire."],
    "description": ["Décrivez la situation en quelques mots (10 caractères minimum)."]
  }
}
```

| Code | Cas |
|---|---|
| 400 | Corps invalide (`fieldErrors`), JSON illisible, action impossible (lien expiré, déjà noté…) |
| 401 | Pas de session (`Non authentifié`), identifiants incorrects |
| 403 | Rôle insuffisant, compte désactivé ou non activé, origine refusée (CSRF) |
| 404 | Ressource introuvable |
| 409 | Conflit : email ou alias déjà pris, incident déjà pris en charge… |
| 502 | Service externe (Nominatim, IMDb) injoignable |
| 500 | Erreur inattendue (le détail est seulement dans les logs serveur) |

Tous les messages sont en français, affichables tels quels. Les messages par défaut de zod sont aussi en français (`z.config(z.locales.fr())` dans `lib/validation.ts`).

Certaines routes répondent la même chose que le compte existe ou non (`forgot-password`, `resend-activation`, abonnement à la newsletter) : on ne peut pas s'en servir pour savoir quels emails ont un compte.

## Hors ligne : idempotence et heure de l'action

Les mutations acceptent trois en-têtes, envoyés par l'app quand elle rejoue une action faite sans réseau (voir [Temps réel et hors ligne](../realtime-offline)) :

| En-tête | Effet |
|---|---|
| `Idempotency-Key: <uuid>` | La requête n'est exécutée qu'une fois : rejouée avec la même clé, elle renvoie la réponse enregistrée avec `Idempotent-Replayed: true`. `409` (+ `Retry-After`) si la première est encore en cours, `422` si la clé a servi ailleurs |
| `X-Offline-Replay: 1` | L'événement du journal est marqué `source: offline` |
| `X-Client-Time: <ISO 8601>` | Heure de l'action sur l'appareil : heure de l'événement, de l'incident, du début / de la fin d'intervention |

Le service lit l'heure de l'action avec `actionTime()` (`lib/server/request-context.ts`) plutôt que `new Date()`.

## Logs

`route()` journalise chaque requête (route, statut, durée, rôle) et chaque événement ajouté au journal, vers ELK quand `LOGSTASH_URL` est défini. Voir [Monitoring](../monitoring).

## Mails

Les mails partent **après** la réponse (`after()` de Next.js, dans `lib/server/mail/index.ts`) : une route n'attend jamais le serveur SMTP. Une erreur d'envoi est seulement journalisée. Voir [Mails](../mails).

## Écrire un endpoint

```ts
// app/api/exemple/[id]/route.ts
import { z } from "zod";
import { apiStaff, check, parse, readBody, route, uuidParam } from "@/lib/server/api";
import { faireQuelqueChose } from "@/lib/server/services/exemple";

const schema = z.object({ hidden: z.boolean() });

/** PATCH /api/exemple/:id — ce que fait la route. */
export const PATCH = route(async (request, { params }: RouteContext<"/api/exemple/[id]">) => {
  const actor = await apiStaff();                         // 401 / 403
  const id = uuidParam((await params).id);                // 404 si ce n'est pas un UUID
  const { hidden } = parse(schema, await readBody(request)); // 400 + fieldErrors
  check(await faireQuelqueChose(id, hidden, actor.id));   // 400 avec l'erreur du service
  return Response.json({ message: "C'est fait." });
});
```

| Helper (`lib/server/api.ts`) | Rôle |
|---|---|
| `route(handler)` | Vérifie l'origine (CSRF), gère l'idempotence, transforme une `ApiError` en réponse JSON, toute autre exception en `500`, journalise la requête |
| `readBody(request)` | Corps JSON, ou champs d'un formulaire multipart |
| `readFormBody(request)` | Idem, valeurs converties en chaînes pour les schémas de formulaire |
| `parse(schema, input)` | Valide avec zod, ou lève un `400` avec `fieldErrors` |
| `check(result, status?)` | Lève l'erreur d'un résultat de service `{ ok: false, error }` |
| `ApiError`, `badRequest`, `notFound`, `fieldError` | Erreurs avec leur code HTTP |

- La logique métier va dans `lib/server/services/`, pas dans la route.
- Une écriture sur un incident passe par `changeIncident()` (`lib/server/events/store.ts`) : verrou, événement et projections dans la même transaction.
- Après Next.js `dev` ou `build`, `RouteContext<"/api/...">` est typé automatiquement (`npx next typegen` pour le régénérer).
- **Ajoutez la route à `public/openapi.json`** pour qu'elle apparaisse dans Swagger.

## Appeler l'API depuis le front

`lib/api-client.ts` et `lib/use-api-form.ts` :

```tsx
"use client";
import { useApiForm } from "@/lib/use-api-form";

export function ContactForm() {
  // Même usage que useActionState : état (message, fieldErrors, valeurs saisies), action, en cours.
  const [state, action, pending] = useApiForm({ method: "PUT", path: "/api/me/contact" });
  return <form action={action}>{/* champs, FormMessage, SubmitButton */}</form>;
}
```

- Les champs du formulaire sont envoyés en JSON (les cases cochées plusieurs fois deviennent un tableau, un fichier passe en multipart).
- En cas de succès, la page est rafraîchie (`router.refresh()`), ou `redirectTo` est ouvert : `"/admin/incidents/{id}"` est complété avec l'`id` de la réponse.
- Un composant serveur ne peut pas passer de fonction à un composant client, mais il peut lui passer un **`ApiEndpoint`** (méthode, chemin, champs fixes). Pour un simple bouton dans un composant serveur, `ApiForm` fait l'appel :

```tsx
<ActionButton endpoint={{ method: "PATCH", path: `/api/admin/reviews/${review.id}`, body: { hidden: true } }}>
  Masquer
</ActionButton>

<ApiForm endpoint={{ method: "DELETE", path: `/api/me/movies/${movie.movieId}` }}>
  <SubmitButton>Retirer</SubmitButton>
</ApiForm>
```

- Pour un appel hors formulaire : `apiRequest("POST", "/api/me/movies", { imdbId })`, qui renvoie `{ ok, data }` ou `{ ok: false, error, fieldErrors }` et ne lève jamais d'exception.
