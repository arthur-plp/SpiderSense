---
sidebar_position: 3
title: Server Actions
---

# Server Actions

Toutes les mutations passent par des Server Actions (`lib/actions/`), appelées directement par les formulaires et les boutons. Elles ne sont pas des endpoints HTTP et n'apparaissent donc pas dans Swagger (voir [Conventions](./conventions)).

Chaque action vérifie elle-même l'accès en premier (`requireUser`, `requireHero`, `requireStaff`) : une Server Action peut être appelée par n'importe qui, comme une route.

**Accès** : _Public_ = sans compte ; _Connecté_ = tout utilisateur connecté ; _Héros_ = héros validé ; _Staff_ = modérateur ou admin.

## Authentification — `lib/actions/auth.ts`

| Action | Accès | Effet |
|---|---|---|
| `register` | Public | Crée un compte citoyen non activé. Mail d'activation (lien valable 7 jours) + mail aux modérateurs. Redirige vers `/inscription/confirmation` |
| `activateAccount(token)` | Public | Active le compte puis redirige vers `/connexion?active=1`. Déclenchée par un bouton, pas au chargement de la page : les antivirus de messagerie ouvrent les liens |
| `login` | Public | Connexion par email (ou alias pour un héros validé). Refusée si le compte n'est pas activé ou s'il est désactivé |
| `resendActivation` | Public | Renvoie un lien d'activation. Même réponse que l'email existe ou non |
| `requestPasswordReset` | Public | Envoie un lien de réinitialisation (valable 1 h). Même réponse que l'email existe ou non |
| `completePasswordReset(token)` | Public | Change le mot de passe puis redirige vers `/connexion?reset=1` |
| `logout` | Connecté | Supprime la session |

## Compte — `lib/actions/account.ts`

| Action | Accès | Effet |
|---|---|---|
| `updateContactAction` | Connecté | Met à jour les coordonnées |
| `changePasswordAction` | Connecté | Change le mot de passe |
| `requestEmailChangeAction` / `cancelEmailChangeAction` | Connecté | Demande (ou annule) un changement d'email, validé par la modération |
| `uploadAvatarAction` / `removeAvatarAction` | Connecté | Photo de profil (stockée dans `user_avatars`) |
| `subscribeMeAction` / `setNewsletterEnabledAction` / `unsubscribeMeAction` | Connecté | Abonnement à la newsletter depuis le compte |
| `applyAsHeroAction` | Connecté | Demande de statut super-héros. Mail aux modérateurs |
| `updateHeroProfileAction` | Héros | Alias, bio, pouvoirs |
| `requestMovieAction(imdbId)` / `removeMovieAction` | Héros | Ajoute un film à sa filmographie (validé par la modération), ou le retire |
| `replyToReviewAction(reviewId)` | Héros | Répond à l'avis d'un citoyen |

## Incidents — `lib/actions/incidents.ts`

| Action | Accès | Effet |
|---|---|---|
| `declareIncident` | Connecté | Formulaire de signalement détaillé. Mail aux héros et aux modérateurs |
| `sendSosAlert` | Connecté | Signalement depuis le bouton SOS : même validation, réponse sur place (sans redirection) |
| `findNearbyActiveIncidents(lat, lng)` | Connecté | Incidents actifs proches, pour prévenir les doublons avant l'envoi |
| `getIncidentAction(id)` | Connecté | Détail d'un incident |
| `rateIntervention(incidentId)` | Connecté | Note (1 à 5) et commentaire sur le héros intervenu |
| `takeIncidentAction(id)` | Héros | Prend l'incident en charge. Un héros n'a qu'une intervention en cours à la fois (garanti par la base). Mail aux modérateurs |
| `closeInterventionAction(id)` | Héros | Clôture l'intervention (réussie ou non, vilain emprisonné ou non). Mail aux modérateurs, et invitation à noter le héros pour le citoyen |
| `getReporterContact(id)` | Héros | Prénom et téléphone du citoyen, seulement pour le héros en charge de l'incident |
| `setPriorityAction(id, priority)` | Héros, staff | Priorité `HIGH` / `NORMAL` / `LOW` |
| `setOnDutyAction(onDuty)` | Héros | En service / hors service |
| `updateHeroLocationAction(lat, lng)` | Héros | Met à jour la position du héros sur la carte |

## Newsletter — `lib/actions/newsletter.ts`

| Action | Accès | Effet |
|---|---|---|
| `subscribeToNewsletter` | Public | Formulaire du pied de page. Mail de bienvenue avec un lien de désabonnement |
| `confirmUnsubscribe(token)` | Public | Désabonnement (sur un bouton, pas au chargement de la page) |

## Modération — `lib/actions/admin/`

Toutes ces actions sont réservées au **staff**, sauf mention contraire. Elles sont enregistrées dans `activity_logs`.

| Fichier | Action | Effet |
|---|---|---|
| `incidents.ts` | `createIncidentAction` | Signale un incident pour le compte d'un citoyen, avec une priorité si besoin |
| | `updateIncidentAction` | Corrige un incident. Mail au citoyen qui l'a signalé |
| | `setIncidentPriorityAction` | Change la priorité depuis la liste des incidents |
| | `deleteIncidentAction` | Suppression douce (`deleted_at`), avec un motif envoyé au citoyen |
| | `createVillainFromIncidentAction` | Crée la fiche du vilain nommé dans un signalement et l'y rattache. Mail au citoyen |
| `requests.ts` | `decideHeroApplicationAction` | Accepte ou refuse une demande de statut héros (mail au demandeur) |
| | `decideEmailChangeAction` | Accepte ou refuse un changement d'email (mail à l'utilisateur) |
| | `decideMovieAction` | Valide ou refuse un film proposé par un héros (mail au héros) |
| `reviews.ts` | `setReviewHiddenAction` | Masque ou réaffiche un avis |
| `users.ts` | `verifyUserAction` | Marque un citoyen comme « vérifié » |
| | `setUserDisabledAction` | Désactive ou réactive un compte |
| | `changeUserRoleAction` | Change le rôle d'un compte. **Admins uniquement**, jamais sur leur propre compte |
| `villains.ts` | `saveVillainAction` / `deleteVillainAction` | Encyclopédie des vilains |
| `articles.ts` | `saveArticleAction` / `deleteArticleAction` | Articles du blog |
| `newsletter.ts` | `sendNewsletterAction` | Envoie une newsletter aux abonnés actifs |

## Mails envoyés

Les gabarits sont dans `lib/server/mail/templates.ts`. En développement, ils arrivent tous dans Mailpit (http://localhost:8025).

| Gabarit | Destinataire | Déclencheur |
|---|---|---|
| `activation` | Nouvel inscrit | `register`, `resendActivation` |
| `moderatorsNewUser` | Staff | `register` |
| `passwordReset` | Utilisateur | `requestPasswordReset` |
| `incidentReported` | Héros validés + staff | `declareIncident`, `sendSosAlert` |
| `incidentTaken` | Staff | `takeIncidentAction` |
| `incidentClosed` | Staff | `closeInterventionAction` |
| `rateHero` | Citoyen à l'origine du signalement | `closeInterventionAction` |
| `incidentModerated` | Citoyen à l'origine du signalement | `updateIncidentAction`, `deleteIncidentAction`, `createVillainFromIncidentAction` |
| `heroApplicationReceived` | Staff | `applyAsHeroAction` |
| `heroApplicationDecision` | Demandeur | `decideHeroApplicationAction` |
| `movieDecision` | Héros | `decideMovieAction` |
| `emailChangeDecision` | Utilisateur | `decideEmailChangeAction` |
| `newsletterWelcome` | Nouvel abonné | Abonnement |
| `newsletter` | Abonnés actifs | `sendNewsletterAction` |
