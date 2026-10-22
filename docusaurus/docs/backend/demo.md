---
sidebar_position: 9
title: Démonstration
---

# Scénario de démonstration

Ce scénario montre, en une vingtaine de minutes, les quatre volets du défi : performances avec 5 M d'incidents, synchronisation hors ligne, temps réel, event sourcing et monitoring ELK.

## Avant la présentation

À faire la veille, car le chargement prend une vingtaine de minutes :

```bash
npm run services:up
npm run db:migrate && npm run db:seed
npm run db:load                        # 5 M d'incidents + 5 M d'événements (~12 min)
docker compose --profile elk up -d
npm run elk:setup
```

- Dans `.env` : `LOGSTASH_URL=http://localhost:8090`.
- Lancer le serveur de production : `npm run build && npm start`. Le service worker n'est actif qu'en production.
- Ouvrir à l'avance :
  1. l'app citoyen sur un téléphone, ou dans Chrome en vue mobile (`citoyen@spider-sense.test`) ;
  2. le centre d'opérations dans une autre fenêtre (`Spider-Man`) ;
  3. le tableau de bord Kibana : http://localhost:5601/app/dashboards#/view/spidersense-monitoring ;
  4. Swagger : http://localhost:3000/api-docs.

Mot de passe de tous les comptes : `Demo1234!`.

## 1. Performances : 12 s → moins de 350 ms (5 min)

1. Montrer le volume : `docker exec spider-sense-db-1 psql -U spidersense -d spidersense -c "select count(*) from incidents"` donne 5 millions.
2. Expliquer l'analyse avec `bench/explain-avant.md` : agrégats sur 5 M de lignes (4,8 s pour les statistiques des héros), tri sans index, `OFFSET` profond (3,7 s).
3. Montrer les résultats : `npm run bench -- --compare avant apres`, soit **4/21 → 21/21** sous 350 ms, et la page 200 de la liste de modération qui passe de 8,7 s à 165 ms.
4. En direct : `npm run bench -- --label demo --runs 5` (environ 1 min).
5. Dans l'app : la liste de modération (http://localhost:3000/admin/incidents) affiche « 5 000 000 incidents » instantanément. Le total est lu dans la projection `incident_counts`.

## 2. Hors ligne (5 min)

1. Dans Chrome (DevTools > Network > **Offline**) ou en mode avion sur le téléphone : le bandeau « Hors ligne » apparaît.
2. **Recharger la page** : l'app citoyen s'ouvre quand même, avec la carte. C'est le service worker.
3. Appuyer sur **SOS**, choisir un type, envoyer : l'écran « Alerte enregistrée » s'affiche, avec le bandeau « 1 action en attente ».
4. Attendre quelques secondes, puis remettre le réseau : le bandeau affiche « Synchronisé : Alerte SOS : … », et l'alerte apparaît aussitôt dans le centre d'opérations.
5. Montrer le journal : l'événement a `source = offline`, et son `occurred_at` est l'heure du clic, pas celle de la synchronisation.

   ```sql
   select type, occurred_at, recorded_at, recorded_at - occurred_at as attente, metadata->>'source'
   from domain_events order by sequence desc limit 5;
   ```

6. **Conflit** : passer le héros hors ligne, cliquer sur « Prendre en charge » pour un incident, le prendre avec un autre héros en ligne (Swagger ou une autre fenêtre), puis remettre le réseau. Le bandeau rouge indique « Prise en charge refusée : Cet incident est déjà pris en charge ». Rien n'est écrasé.
7. **Idempotence** dans Swagger : `POST /api/incidents` deux fois avec le même en-tête `Idempotency-Key` crée un seul incident, et la seconde réponse porte `Idempotent-Replayed: true`.

## 3. Temps réel (2 min)

1. Le centre d'opérations affiche « **Temps réel** » (flux SSE connecté).
2. Lancer une alerte depuis l'app citoyen : elle apparaît chez le héros en moins d'une seconde, sans rechargement.
3. Pour animer : `npm run demo:traffic`. Des citoyens signalent, des héros interviennent et se déplacent, et environ un signalement sur quatre arrive « hors ligne ».

## 4. Event sourcing (3 min)

1. L'historique d'un incident, version par version : voir [Journal d'événements](./event-sourcing#lire-lhistorique-dun-incident).
2. **Rejouer le journal** : `npm run events:rebuild` vide les projections, rejoue 5 M d'événements en environ 25 s, puis vérifie que chaque projection est identique aux incidents.

## 5. Monitoring ELK (3 min)

Avec `npm run demo:traffic` en route, le tableau de bord Kibana montre :

- le p95 de l'API sous 350 ms et son évolution ;
- les événements du journal par type, en direct ;
- la part des événements hors ligne et le délai moyen de synchronisation ;
- les codes HTTP, dont les 409 de conflit.

Dans Discover : `event.dataset : "domain.event" and source : "offline"`.

## Revenir à l'état de départ

```bash
docker compose down -v          # supprime aussi les volumes PostgreSQL et Elasticsearch
npm run services:up && npm run db:migrate && npm run db:seed
```
