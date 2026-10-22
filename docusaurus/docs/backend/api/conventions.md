---
sidebar_position: 1
title: Conventions
---

# Conventions de l'API

Le backend expose deux types d'opérations :

| | Server Actions | Route handlers |
|---|---|---|
| Où | `lib/actions/**/*.ts` (`"use server"`) | `app/api/**/route.ts` |
| Usage | Formulaires et mutations : inscription, connexion, signalement, modération… | Lectures appelées par le front : cartes temps réel, recherches, images |
| Appel | Directement depuis un composant React (`action={…}`, `useActionState`) | `fetch("/api/…")` |
| Documentation | [Server Actions](./server-actions) | [Endpoints HTTP](./endpoints) et Swagger (http://localhost:3000/api-docs) |

Les Server Actions ne sont pas des endpoints REST : Next.js les appelle via une requête `POST` interne à la page. Elles ne figurent donc pas dans Swagger.

## Authentification

La connexion (`/connexion`, action `login`) crée une session en base et pose un cookie `spidersense_session` :

- `HttpOnly` : inaccessible au JavaScript de la page, donc protégé contre le vol par XSS ;
- `SameSite=Lax` : non envoyé par les requêtes `POST` venant d'autres sites, ce qui protège contre le CSRF ;
- `Secure` en production : uniquement transmis en HTTPS ;
- valable **30 jours**. Seule l'empreinte SHA-256 du jeton est stockée (table `sessions`).

On se connecte avec son email, ou avec son alias pour un super-héros validé. Le navigateur envoie le cookie automatiquement : le front n'a rien à gérer. Pour tester dans Swagger, connectez-vous d'abord sur l'application dans le même navigateur.

### Contrôle d'accès

Deux niveaux :

1. **`proxy.ts`** : un contrôle optimiste. Sans cookie de session, `/citoyen`, `/heros` et `/admin` redirigent vers `/connexion?next=…`.
2. **La couche d'accès aux données** (`lib/server/auth.ts`) : le vrai contrôle, fait dans chaque page, action ou route.

| Helper | Accepte | Sinon |
|---|---|---|
| `getCurrentUser()` | Tout le monde | Renvoie `null` |
| `requireUser(roles?)` | Utilisateur connecté (avec un des `roles` si précisé) | Redirige vers `/connexion`, ou vers l'espace de l'utilisateur |
| `requireHero()` | Rôle `HERO` **et** profil héros approuvé | Redirige vers `/citoyen` |
| `requireStaff()` | `MODERATOR` ou `ADMIN` | Redirige vers l'espace de l'utilisateur |

Les `require*` redirigent : ils sont faits pour les pages et les Server Actions. Les route handlers utilisent `getCurrentUser()` et répondent `401` / `403` en JSON.

## Réponses

### Route handlers

- Corps en **JSON**, dates en ISO 8601 (`2026-10-20T09:43:50.478Z`).
- Les données sont enveloppées dans un objet (`{ "incidents": [...] }`, `{ "results": [...] }`), jamais un tableau nu : on peut ajouter des champs sans casser le front.
- Les erreurs ont la forme `{ "error": "message en français" }` :

| Code | Cas |
|---|---|
| 400 | Paramètre invalide |
| 401 | Pas de session (`Non authentifié`) |
| 403 | Rôle insuffisant (`Accès réservé`) |
| 404 | Ressource introuvable (corps vide pour les images) |
| 502 | Service externe (Nominatim, IMDb) injoignable : le corps contient aussi une liste vide ou `null`, pour que le front reste utilisable |

### Server Actions

Les actions de formulaire renvoient un `ActionState` (`lib/action-state.ts`) :

```ts
type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;                                     // affiché près du formulaire
  fieldErrors?: Record<string, string[] | undefined>;   // un message par champ
  values?: Record<string, string>;                      // valeurs saisies, pour ne pas vider le formulaire
};
```

Les actions appelées par un bouton (prendre un incident, changer la priorité…) renvoient en général `{ ok: boolean; error?: string }`. Tous les messages sont en français, affichables tels quels.

## Mails

Les mails partent **après** la réponse (`after()` de Next.js, dans `lib/server/mail/index.ts`) : une action n'attend jamais le serveur SMTP. Une erreur d'envoi est seulement journalisée.

- Avec `SMTP_URL` : envoi via Nodemailer (Mailpit en développement).
- Sans `SMTP_URL` : le mail est enregistré dans `mail_outbox` et affiché sur `/dev/mails`.

Les gabarits sont dans `lib/server/mail/templates.ts`.

## Écrire un nouveau route handler

```ts
// app/api/exemple/route.ts
import { connection } from "next/server";
import { getCurrentUser } from "@/lib/server/auth";

/** GET /api/exemple — ce que fait la route (qui y a accès). */
export async function GET(request: Request) {
  await connection(); // rendu dynamique : jamais figé au build
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Non authentifié" }, { status: 401 });
  // ...
  return Response.json({ items: [] }, { headers: { "cache-control": "no-store" } });
}
```

- La logique métier va dans `lib/server/services/`, pas dans la route.
- Ajoutez la route à `public/openapi.json` (Swagger) et à la page [Endpoints HTTP](./endpoints).

## Écrire une nouvelle Server Action

```ts
// lib/actions/exemple.ts
"use server";
import type { ActionState } from "@/lib/action-state";
import { requireStaff } from "@/lib/server/auth";

export async function monAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const actor = await requireStaff(); // toujours en premier : une action est appelable par n'importe qui
  // valider formData, appeler un service de lib/server/services/, renvoyer un ActionState
  return { status: "success", message: "C'est fait." };
}
```

Ajoutez-la à la page [Server Actions](./server-actions).
