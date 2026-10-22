---
sidebar_position: 8
title: Monitoring (ELK)
---

# Monitoring avec ELK

L'application envoie ses logs structurés à **Logstash**, qui les range dans **Elasticsearch**. **Kibana** les affiche sur un tableau de bord prêt à l'emploi : temps de réponse de l'API, journal d'événements, synchronisation hors ligne, erreurs.

```
app (route()) ──► lib/server/logger.ts ──POST JSON par lots──► Logstash :8090 ──► Elasticsearch :9200 ──► Kibana :5601
```

## Démarrer

```bash
docker compose --profile elk up -d     # Elasticsearch, Logstash, Kibana (~3 Go de RAM)
npm run elk:setup                      # modèle d'index, vue de données, visualisations, tableau de bord
```

Dans `.env`, décommentez `LOGSTASH_URL=http://localhost:8090`, puis relancez l'application. Tableau de bord : http://localhost:5601/app/dashboards#/view/spidersense-monitoring

`npm run elk:setup` est idempotent : relancez-le après une mise à jour des visualisations (`scripts/elk-setup.ts`).

:::info Développement uniquement
Elasticsearch tourne sans authentification ni TLS (`xpack.security.enabled: false`). En production, il faudrait activer la sécurité et un utilisateur dédié pour Logstash.
:::

## Ce qui est journalisé

`lib/server/logger.ts` écrit une ligne JSON par entrée, avec les noms de champs de l'[Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html). Les envois partent par lots toutes les secondes. Si Logstash est injoignable, les entrées attendent en mémoire (5 000 au plus) et l'application continue normalement : les logs ne bloquent jamais une requête.

| `event.dataset` | Quand | Champs principaux |
|---|---|---|
| `api.request` | Chaque appel d'une route API (`route()`) | `http.request.method`, `url.path` (identifiants remplacés par `:id`), `http.response.status_code`, `duration_ms`, `user.id`, `user.roles`, `trace.id`, `offline_replay`, `idempotent_replay` |
| `domain.event` | Chaque événement ajouté au [journal](./event-sourcing) | `event.action` (type), `event.sequence`, `aggregate_type`, `aggregate_id`, `event.created` (heure de l'action), `event.ingested` (enregistrement), `sync_lag_ms`, `source` (`online` / `offline`) |
| `app.error` | Erreur inattendue (500) | `message`, `error.type`, `error.stack_trace`, `url.path` |

`trace.id` relie une requête aux événements qu'elle a produits. `LOG_FORMAT=json` écrit aussi ces lignes sur la sortie standard.

## Le tableau de bord « Spider Sense — Monitoring »

| Panneau | Pour montrer |
|---|---|
| Temps de réponse API — p95 | L'objectif des 350 ms est tenu |
| Requêtes API, Événements du journal | Le volume d'activité |
| Délai moyen de synchronisation hors ligne | Combien de temps les actions faites sans réseau ont attendu sur l'appareil |
| Temps de réponse API dans le temps (médiane, p95) | La stabilité sous charge |
| Routes les plus lentes (p95) | Où regarder en premier |
| Événements du journal par type | Le journal d'événements en direct |
| Origine des événements (en ligne / hors ligne) | La part des actions synchronisées après une coupure |
| Codes de réponse HTTP | Les 409 de conflit, les 4xx, les 5xx |
| Erreurs serveur | Les routes en erreur |

Le tableau de bord se rafraîchit toutes les 10 secondes, sur la dernière heure.

## Requêtes utiles (KQL, dans Discover)

```text
event.dataset : "api.request" and duration_ms > 350                 # requêtes au-dessus de l'objectif
event.dataset : "domain.event" and source : "offline"              # actions synchronisées après une coupure
event.dataset : "api.request" and http.response.status_code : 409  # conflits (incident déjà pris…)
trace.id : "<id>"                                                  # une requête et ses événements
```
