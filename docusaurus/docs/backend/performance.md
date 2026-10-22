---
sidebar_position: 5
title: Performances (5 M d'incidents)
---

# Performances avec 5 millions d'incidents

**Objectif** : aucune page ni route ne dépasse **350 ms** avec 5 millions d'incidents en base.
**Résultat** : les 21 scénarios mesurés passent de 4/21 sous 350 ms (jusqu'à 8,7 s) à **21/21** (p95 maximal : 174 ms).

## Méthode

1. **Jeu de charge réaliste** : `npm run db:load` ajoute 50 000 citoyens et 5 000 000 d'incidents clos répartis sur 3 ans (types pondérés, 80 % de réussites, 1 % de suppressions, vilains, priorités, positions dans Paris), en SQL (`generate_series`) par lots de 250 000. Comptez une dizaine de minutes.
2. **Mesure de bout en bout** : `npm run bench -- --label avant` (serveur de production lancé) se connecte avec un compte de chaque rôle et appelle 21 pages et routes qui dépendent du volume d'incidents. Il donne médiane, p95 et maximum, jusqu'au dernier octet (pages en streaming comprises), et enregistre le tout dans `bench/<label>.json`.
3. **Analyse des requêtes** : `npm run explain -- --label avant` exécute `EXPLAIN (ANALYZE, BUFFERS)` sur les requêtes les plus lourdes et écrit les plans dans `bench/explain-<label>.md`.
4. Optimisations, puis nouvelle mesure : `npm run bench -- --label apres` et `npm run bench -- --compare avant apres`.

Les mesures ci-dessous ont été faites sur un poste de développement (16 cœurs, PostgreSQL 18 dans Docker), avec `next build && next start`.

## Ce qui était lent

| Problème (plan d'exécution) | Où | Avant |
|---|---|---|
| Agrégats (`count`, `sum`) sur les 5 M de lignes à chaque affichage | Statistiques globales : accueil, espace pro, tableau de bord | 0,9 s de SQL |
| Agrégat par héros sur tous les incidents, `count(distinct …)` | `/api/heroes`, interrogée par chaque carte ouverte | **4,8 s** de SQL |
| `count(*)` filtré sur toute la table pour le total de la liste | Liste de modération | 0,5 s |
| Tri de 5 M de lignes (aucun index sur `created_at`) avant le `LIMIT 40` | Liste de modération (récents, par priorité) | 2,7 s |
| `OFFSET` profond : lire et jeter 7 960 lignes triées | Liste de modération, page 200 | 3,7 s |
| Agrégat par vilain sur tous les incidents | Encyclopédie, liste des vilains | — |
| Pas de limite sur l'historique d'un citoyen | Historique | — |

Plans complets : `bench/explain-avant.md` et `bench/explain-apres.md`.

## Ce qui a été fait

### 1. Les statistiques ne parcourent plus les incidents : projections

Chaque changement d'incident est un événement du [journal](./event-sourcing), et les statistiques sont des **projections** mises à jour dans la même transaction :

| Projection | Contenu | Remplace |
|---|---|---|
| `incident_counts` | Nombre d'incidents et de personnes par statut × type × priorité × supprimé (moins de 300 lignes) | Statistiques globales, répartition par type, compteur « à prioriser », total de la liste de modération |
| `hero_stats` | Interventions, réussites, échecs, citoyens secourus par héros | Agrégats de `/api/heroes`, statistiques du héros |
| `hero_villain_stats` | Rencontres et emprisonnements par héros × vilain | Vilains emprisonnés, « pire ennemi » |
| `villain_stats` | Incidents par vilain | Encyclopédie |

Lire une projection prend **moins d'une milliseconde**, quel que soit le nombre d'incidents. Les projections se reconstruisent en rejouant le journal (`npm run events:rebuild`, 24 s pour 5 M d'événements), ce qui vérifie au passage qu'elles sont exactes.

### 2. Index ciblés

Tous partiels (`WHERE deleted_at IS NULL`) quand la requête ne lit que les incidents non supprimés : ils sont plus petits et ne contiennent que les lignes utiles.

| Index | Sert à |
|---|---|
| `incidents_created_at_idx` | Liste « récents » : les 40 premières lignes de l'index, lu à l'envers |
| `incidents_status_created_at_idx`, `incidents_type_created_at_idx` | Listes filtrées par statut ou par type |
| `incidents_priority_rank_idx` | Tri par priorité : index sur **l'expression** `case … end` du tri, suivie de `created_at DESC` |
| `incidents_active_idx` | Incidents en cours (quelques centaines sur 5 M) : cartes, détection de doublons |
| `incidents_ended_at_idx` | Tableau des héros : terminés depuis moins de 24 h |
| `incidents_hero_created_at_idx`, `incidents_hero_started_at_idx` | Interventions d'un héros, graphique des 8 dernières semaines |
| `incidents_reporter_created_at_idx`, `incidents_villain_created_at_idx` | Historique d'un citoyen, incidents d'un vilain |

:::note Sens des index
drizzle génère `DESC NULLS LAST`, alors que `ORDER BY created_at DESC` de PostgreSQL trie les `NULL` en premier : l'index ne servirait pas au tri. Les index simples sont donc ascendants (PostgreSQL les parcourt à l'envers), et celui du tri mixte par priorité déclare explicitement `DESC NULLS FIRST`.
:::

### 3. Pagination et limites

- **Total de la liste de modération** : somme sur `incident_counts` (statut, type, priorité, supprimés). Le filtre par vilain, qui n'est pas une dimension de la projection, compte par l'index, plafonné à 10 001.
- **Pagination plafonnée à 250 pages** (10 000 lignes) : au-delà, un `OFFSET` redevient coûteux et les filtres sont plus utiles que la page 4 000.
- **Historique d'un citoyen** : les 100 derniers signalements.

## Résultats (p95, 10 mesures par scénario)

| Scénario | Avant | Après | Gain |
|---|---:|---:|---:|
| Accueil (statistiques globales) | 3 286 ms | 134 ms | ×24 |
| Annuaire des super-héros | 3 299 ms | 76 ms | ×43 |
| API incidents en cours (citoyen) | 25 ms | 31 ms | = |
| API super-héros (cartes) | 2 952 ms | 20 ms | ×146 |
| API incidents à proximité | 63 ms | 27 ms | ×2 |
| App citoyen | 3 023 ms | 104 ms | ×29 |
| Historique du citoyen | 251 ms | 81 ms | ×3 |
| Détail d'un incident (citoyen) | 94 ms | 60 ms | ×1,6 |
| Encyclopédie | 2 962 ms | 54 ms | ×55 |
| Fiche d'un vilain | 668 ms | 66 ms | ×10 |
| API incidents (tableau des héros) | 551 ms | 19 ms | ×29 |
| Centre d'opérations | 5 300 ms | 113 ms | ×47 |
| Statistiques du héros | 4 835 ms | 98 ms | ×49 |
| Tableau de bord modération | 2 300 ms | 119 ms | ×19 |
| Incidents (récents) | 3 169 ms | 138 ms | ×23 |
| Incidents (par priorité) | 3 505 ms | 174 ms | ×20 |
| Incidents (filtrés : vols réussis) | 2 278 ms | 84 ms | ×27 |
| Incidents (page 200) | **8 749 ms** | 165 ms | ×53 |
| Super-héros (modération) | 3 234 ms | 104 ms | ×31 |
| Vilains (modération) | 987 ms | 64 ms | ×15 |
| Fiche d'un héros (modération) | 960 ms | 153 ms | ×6 |

## Reproduire

```bash
npm run services:up && npm run db:migrate && npm run db:seed
npm run db:load                       # 5 M d'incidents (~10 min)
npm run build && npm start            # autre terminal : serveur de production
npm run bench -- --label apres        # mesure
npm run bench -- --compare avant apres
npm run explain -- --label apres --projections
```

:::tip Revenir à la base de démo
`docker compose down -v` supprime le volume PostgreSQL, puis `npm run services:up && npm run db:migrate && npm run db:seed`.
:::
