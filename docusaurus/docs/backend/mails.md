---
sidebar_position: 3
title: Mails
---

# Mails

Les gabarits sont dans `lib/server/mail/templates.ts`, l'envoi dans `lib/server/mail/index.ts`.

- **Avec `SMTP_URL`** : envoi via Nodemailer. En développement, Mailpit capture tout : http://localhost:8025.
- **Sans `SMTP_URL`** : le mail est enregistré dans la table `mail_outbox` et affiché sur http://localhost:3000/dev/mails.

Les mails partent **après** la réponse HTTP (`after()` de Next.js) : une route n'attend jamais le serveur SMTP, et une erreur d'envoi est seulement écrite dans les logs.

| Gabarit | Destinataire | Envoyé par |
|---|---|---|
| `activation` | Nouvel inscrit | `POST /api/auth/register`, `POST /api/auth/resend-activation` |
| `moderatorsNewUser` | Staff | `POST /api/auth/register` |
| `passwordReset` | Utilisateur | `POST /api/auth/forgot-password` |
| `incidentReported` | Héros validés + staff | `POST /api/incidents` |
| `incidentTaken` | Staff | `POST /api/incidents/{id}/intervention` |
| `incidentClosed` | Staff | `POST /api/incidents/{id}/intervention/close` |
| `rateHero` | Citoyen à l'origine du signalement | `POST /api/incidents/{id}/intervention/close` |
| `incidentModerated` | Citoyen à l'origine du signalement | `PUT` / `DELETE /api/incidents/{id}`, `POST /api/incidents/{id}/villain` |
| `heroApplicationReceived` | Staff | `POST /api/me/hero-application` |
| `heroApplicationDecision` | Demandeur | `POST /api/admin/hero-applications/{userId}/decision` |
| `movieDecision` | Héros | `POST /api/admin/hero-movies/{heroId}/{movieId}/decision` |
| `emailChangeDecision` | Utilisateur | `POST /api/admin/email-changes/{requestId}/decision` |
| `newsletterWelcome` | Nouvel abonné | `POST /api/newsletter/subscriptions`, `POST /api/me/newsletter` |
| `newsletter` | Abonnés actifs | `POST /api/admin/newsletters` |
