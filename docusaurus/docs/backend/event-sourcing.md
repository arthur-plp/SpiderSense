---
sidebar_position: 6
title: Journal d'événements
---

# Journal d'événements (event sourcing)

Chaque changement d'un incident, et de la présence d'un héros, est enregistré comme un **événement immuable** dans la table `domain_events`, dans la **même transaction** que le changement. Les statistiques sont des **projections** calculées à partir de ces événements, et on peut les reconstruire à tout moment en rejouant le journal.

```
POST /api/incidents/:id/intervention
        │
        ▼  une transaction
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. verrou sur l'incident (SELECT … FOR UPDATE), instantané « avant »
  │ 2. UPDATE incidents …                                        │
  │ 3. instantané « après »                                      │
  │ 4. INSERT domain_events (type, avant, après, version n+1)    │
  │ 5. projections += après − avant                              │
  │ 6. pg_notify('domain_events', …)  → flux temps réel           │
  └──────────────────────────────────────────────────────────────┘
        │ après le commit
        ▼
  logs ELK (event.dataset = domain.event)
```

Code : `lib/server/events/store.ts` (écriture), `lib/server/events/projections.ts` (projections), `lib/server/events/live.ts` (flux temps réel).

## La table `domain_events`

| Colonne | Contenu |
|---|---|
| `sequence` | Ordre global du journal (identité) |
| `id` | UUID de l'événement |
| `aggregate_type`, `aggregate_id` | `incident` ou `hero`, et son identifiant |
| `version` | Position dans le flux de l'agrégat. Index unique (`aggregate_type`, `aggregate_id`, `version`) : deux écritures concurrentes ne peuvent pas ajouter la même version |
| `type` | Voir ci-dessous |
| `payload` | Données de l'événement, avec les instantanés `before` / `after` |
| `actor_id` | Qui a agi |
| `occurred_at` | **Quand l'action a eu lieu** : l'horloge de l'appareil pour une action faite hors ligne |
| `recorded_at` | Quand le serveur l'a enregistrée. L'écart mesure le délai de synchronisation |
| `metadata` | `source` (`online`, `offline`, `seed`, `load`, `migration`), `requestId`, `idempotencyKey` |

## Types d'événements

| Type | Agrégat | Émis par |
|---|---|---|
| `IncidentReported` | incident | `POST /api/incidents` (formulaire ou bouton SOS) |
| `IncidentPrioritized` | incident | `PATCH /api/incidents/:id/priority` |
| `InterventionStarted` | incident | `POST /api/incidents/:id/intervention` |
| `InterventionClosed` | incident | `POST /api/incidents/:id/intervention/close` |
| `IncidentReviewed` | incident | `POST /api/incidents/:id/review` |
| `IncidentCorrected` | incident | `PUT /api/incidents/:id` (modération) |
| `IncidentDeleted` | incident | `DELETE /api/incidents/:id` |
| `IncidentVillainLinked` | incident | `POST /api/incidents/:id/villain` |
| `HeroDutyChanged` | hero | `PUT /api/me/duty` |
| `HeroLocationUpdated` | hero | `PUT /api/me/location` |
| `IncidentImported` | incident | Incidents insérés directement : migration de l'existant, données de démo, jeu de charge |

## Projections : « après − avant »

Chaque événement d'incident porte l'**instantané** des champs dont dépendent les statistiques, avant et après le changement :

```json
{
  "priority": "HIGH",
  "before": { "typeId": 1, "status": "REPORTED", "priority": null, "deleted": false, "peopleInvolved": 1,
              "heroId": null, "villainId": null, "villainImprisoned": false },
  "after":  { "typeId": 1, "status": "REPORTED", "priority": "HIGH", "deleted": false, "peopleInvolved": 1,
              "heroId": null, "villainId": null, "villainImprisoned": false }
}
```

Une projection n'a donc pas besoin de connaître chaque type d'événement : elle **retire ce qu'apportait `before` et ajoute ce qu'apporte `after`**. Le même calcul sert à la mise à jour au fil de l'eau (`projectIncidentChange`, des `INSERT … ON CONFLICT DO UPDATE SET n = n + excluded.n`) et à la reconstruction complète en SQL (`rebuildProjections`).

| Projection | Contribution d'un incident |
|---|---|
| `incident_counts` | +1 incident et +N personnes sur sa ligne (statut, type, priorité, supprimé) |
| `hero_stats` | Si un héros est affecté et l'incident non supprimé : +1 intervention, +1 réussite ou échec, +N citoyens secourus si réussite |
| `hero_villain_stats` | Si héros et vilain : +1 rencontre, +1 emprisonnement |
| `villain_stats` | Si vilain : +1 incident |

## Reconstruire et vérifier

```bash
npm run events:rebuild            # vide les projections, rejoue tout le journal, puis vérifie
npm run events:rebuild -- --check # vérifie seulement
```

```
Journal : 5 001 073 événements (9 types)
Projections reconstruites en rejouant le journal : 23.8 s
✅ incident_counts      identique aux incidents
✅ hero_stats           identique aux incidents
✅ hero_villain_stats   identique aux incidents
✅ villain_stats        identique aux incidents
```

La vérification compare chaque projection aux mêmes chiffres recalculés directement depuis la table `incidents`.

## Lire l'historique d'un incident

```sql
select version, type, occurred_at, recorded_at, metadata->>'source' as source,
       payload->'before'->>'status' as avant, payload->'after'->>'status' as apres
from domain_events where aggregate_id = '<id de l''incident>' order by version;
```

```
 version |        type         | source  |   avant     |    après
---------+---------------------+---------+-------------+-------------
       1 | IncidentReported    | offline |             | REPORTED
       2 | IncidentPrioritized | online  | REPORTED    | REPORTED
       3 | InterventionStarted | online  | REPORTED    | IN_PROGRESS
       4 | InterventionClosed  | online  | IN_PROGRESS | SUCCEEDED
       5 | IncidentReviewed    | online  |             |
```

## Choix et limites

- **Journal + projections** (et non event sourcing « pur ») : la table `incidents` reste l'état courant, utilisé par les lectures. Le journal en est l'historique fidèle, et les statistiques en sont dérivées. On garde des lectures simples et rapides, sans réécrire tout le backend.
- **Écriture synchrone** : événement, état et projections sont dans la même transaction. Il n'y a pas de cohérence à terme à gérer : une projection est toujours à jour au commit.
- Les lignes de projection revenues à 0 après des décrémentations restent en base, sans effet sur les lectures.
- Supprimer un vilain le délie de ses incidents (`ON DELETE SET NULL`), et ses lignes de projection disparaissent en cascade. La reconstruction ignore donc les vilains qui n'existent plus.
