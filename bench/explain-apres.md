# Plans d'exécution : apres

2026-10-22T14:18:02.612Z

## Statistiques globales (accueil, espace pro) : 1078.030 ms

```sql
select count(*), count(*) filter (where status in ('REPORTED','IN_PROGRESS')), count(*) filter (where hero_id is not null), count(*) filter (where status = 'SUCCEEDED'), sum(people_involved) filter (where status = 'SUCCEEDED') from incidents i join incident_types t on t.id = i.type_id where i.deleted_at is null
```

```
Finalize Aggregate  (cost=238329.22..238329.23 rows=1 width=40) (actual time=1037.358..1047.046 rows=1.00 loops=1)
  Buffers: shared hit=1639 read=168103
  ->  Gather  (cost=238328.99..238329.20 rows=2 width=40) (actual time=1036.830..1047.010 rows=3.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=1639 read=168103
        ->  Partial Aggregate  (cost=237328.99..237329.00 rows=1 width=40) (actual time=1003.827..1003.830 rows=1.00 loops=3)
              Buffers: shared hit=1639 read=168103
              ->  Hash Join  (cost=14.95..196106.39 rows=2061130 width=24) (actual time=30.639..773.051 rows=1650232.67 loops=3)
                    Hash Cond: (i.type_id = t.id)
                    Buffers: shared hit=1639 read=168103
                    ->  Parallel Seq Scan on incidents i  (cost=0.00..190576.74 rows=2061130 width=26) (actual time=30.537..470.639 rows=1650232.67 loops=3)
                          Filter: (deleted_at IS NULL)
                          Rows Removed by Filter: 16787
                          Buffers: shared hit=1636 read=168103
                    ->  Hash  (cost=12.20..12.20 rows=220 width=2) (actual time=0.083..0.084 rows=9.00 loops=3)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=3
                          ->  Seq Scan on incident_types t  (cost=0.00..12.20 rows=220 width=2) (actual time=0.057..0.059 rows=9.00 loops=3)
                                Buffers: shared hit=3
Planning:
  Buffers: shared hit=453 read=3 dirtied=1
Planning Time: 3.901 ms
JIT:
  Functions: 44
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 7.952 ms (Deform 3.752 ms), Inlining 0.000 ms, Optimization 3.438 ms, Emission 87.588 ms, Total 98.978 ms
Execution Time: 1078.030 ms
```

## Statistiques globales depuis la projection : 0.502 ms

```sql
select type_id, status, sum(incidents), sum(people_involved) from incident_counts where not deleted group by 1, 2
```

```
HashAggregate  (cost=3.01..3.16 rows=12 width=46) (actual time=0.429..0.439 rows=27.00 loops=1)
  Group Key: type_id, status
  Batches: 1  Memory Usage: 32kB
  Buffers: shared hit=1
  ->  Seq Scan on incident_counts  (cost=0.00..2.19 rows=82 width=18) (actual time=0.022..0.038 rows=82.00 loops=1)
        Filter: (NOT deleted)
        Rows Removed by Filter: 37
        Buffers: shared hit=1
Planning:
  Buffers: shared hit=69 dirtied=1
Planning Time: 0.733 ms
Execution Time: 0.502 ms
```

## Statistiques de tous les héros (API /api/heroes, toutes les 20 s) : 4950.101 ms

```sql
select hero_id, count(*), count(*) filter (where status = 'SUCCEEDED'), count(distinct villain_id) filter (where villain_imprisoned) from incidents where deleted_at is null group by hero_id
```

```
GroupAggregate  (cost=1040304.56..1114505.35 rows=10 width=40) (actual time=3915.078..4917.710 rows=11.00 loops=1)
  Group Key: hero_id
  Buffers: shared hit=1921 read=167821, temp read=44336 written=44421
  ->  Sort  (cost=1040304.56..1052671.34 rows=4946713 width=37) (actual time=3803.764..4535.863 rows=4950698.00 loops=1)
        Sort Key: hero_id, villain_id
        Sort Method: external merge  Disk: 177376kB
        Buffers: shared hit=1921 read=167821, temp read=44336 written=44421
        ->  Seq Scan on incidents  (cost=0.00..219749.58 rows=4946713 width=37) (actual time=223.548..1218.080 rows=4950698.00 loops=1)
              Filter: (deleted_at IS NULL)
              Rows Removed by Filter: 50360
              Buffers: shared hit=1918 read=167821
Planning:
  Buffers: shared hit=9 read=1
Planning Time: 0.326 ms
JIT:
  Functions: 9
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 1.122 ms (Deform 0.589 ms), Inlining 64.557 ms, Optimization 81.193 ms, Emission 77.664 ms, Total 224.535 ms
Execution Time: 4950.101 ms
```

## Statistiques des héros depuis les projections : 0.170 ms

```sql
select h.hero_id, h.interventions, h.succeeded, (select count(*) from hero_villain_stats v where v.hero_id = h.hero_id and v.imprisonments > 0) from hero_stats h
```

```
Seq Scan on hero_stats h  (cost=0.00..5286.85 rows=1270 width=32) (actual time=0.040..0.133 rows=10.00 loops=1)
  Buffers: shared hit=21
  SubPlan 1
    ->  Aggregate  (cost=4.13..4.14 rows=1 width=8) (actual time=0.011..0.011 rows=1.00 loops=10)
          Buffers: shared hit=20
          ->  Seq Scan on hero_villain_stats v  (cost=0.00..4.10 rows=14 width=0) (actual time=0.002..0.009 rows=14.00 loops=10)
                Filter: ((imprisonments > 0) AND (hero_id = h.hero_id))
                Rows Removed by Filter: 126
                Buffers: shared hit=20
Planning:
  Buffers: shared hit=58 dirtied=1
Planning Time: 0.972 ms
Execution Time: 0.170 ms
```

## Liste de modération : total : 843.736 ms

```sql
select count(*) from incidents where deleted_at is null
```

```
Finalize Aggregate  (cost=105766.34..105766.35 rows=1 width=8) (actual time=833.164..843.239 rows=1.00 loops=1)
  Buffers: shared hit=4026557 read=13529 written=287
  ->  Gather  (cost=105766.13..105766.34 rows=2 width=8) (actual time=832.845..843.204 rows=3.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=4026557 read=13529 written=287
        ->  Partial Aggregate  (cost=104766.13..104766.14 rows=1 width=8) (actual time=812.373..812.375 rows=1.00 loops=3)
              Buffers: shared hit=4026557 read=13529 written=287
              ->  Parallel Index Only Scan using incidents_ended_at_idx on incidents  (cost=0.43..99613.30 rows=2061130 width=0) (actual time=1.380..710.783 rows=1650232.67 loops=3)
                    Heap Fetches: 0
                    Index Searches: 1
                    Buffers: shared hit=4026557 read=13529 written=287
Planning Time: 0.138 ms
JIT:
  Functions: 8
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 0.834 ms (Deform 0.000 ms), Inlining 0.000 ms, Optimization 0.676 ms, Emission 13.209 ms, Total 14.719 ms
Execution Time: 843.736 ms
```

## Liste de modération : 40 plus récents : 4.848 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by i.created_at desc limit 40
```

```
Limit  (cost=1.19..11.84 rows=40 width=657) (actual time=3.062..4.457 rows=40.00 loops=1)
  Buffers: shared hit=100 read=94
  ->  Nested Loop Left Join  (cost=1.19..1316206.56 rows=4946713 width=657) (actual time=3.060..4.449 rows=40.00 loops=1)
        Buffers: shared hit=100 read=94
        ->  Nested Loop Left Join  (cost=1.04..1192953.66 rows=4946713 width=455) (actual time=3.043..4.343 rows=40.00 loops=1)
              Buffers: shared hit=80 read=94
              ->  Nested Loop Left Join  (cost=0.74..1054049.20 rows=4946713 width=466) (actual time=1.984..2.613 rows=40.00 loops=1)
                    Buffers: shared hit=35 read=37
                    ->  Nested Loop  (cost=0.59..930746.91 rows=4946713 width=264) (actual time=1.960..2.274 rows=40.00 loops=1)
                          Buffers: shared hit=19 read=35
                          ->  Index Scan Backward using incidents_created_at_idx on incidents i  (cost=0.43..807411.69 rows=4946713 width=146) (actual time=1.864..2.117 rows=40.00 loops=1)
                                Index Searches: 1
                                Buffers: shared hit=3 read=35
                          ->  Memoize  (cost=0.15..0.17 rows=1 width=120) (actual time=0.003..0.003 rows=1.00 loops=40)
                                Cache Key: i.type_id
                                Cache Mode: logical
                                Hits: 32  Misses: 8  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                Buffers: shared hit=16
                                ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.16 rows=1 width=120) (actual time=0.012..0.012 rows=1.00 loops=8)
                                      Index Cond: (id = i.type_id)
                                      Index Searches: 8
                                      Buffers: shared hit=16
                    ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.008..0.008 rows=0.82 loops=40)
                          Cache Key: i.hero_id
                          Cache Mode: logical
                          Hits: 30  Misses: 10  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                          Buffers: shared hit=16 read=2
                          ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.16 rows=1 width=234) (actual time=0.030..0.030 rows=0.90 loops=10)
                                Index Cond: (user_id = i.hero_id)
                                Index Searches: 9
                                Buffers: shared hit=16 read=2
              ->  Memoize  (cost=0.30..0.32 rows=1 width=21) (actual time=0.043..0.043 rows=1.00 loops=40)
                    Cache Key: i.reporter_id
                    Cache Mode: logical
                    Hits: 6  Misses: 34  Evictions: 0  Overflows: 0  Memory Usage: 5kB
                    Buffers: shared hit=45 read=57
                    ->  Index Scan using users_pkey on users u  (cost=0.29..0.31 rows=1 width=21) (actual time=0.019..0.019 rows=1.00 loops=34)
                          Index Cond: (id = i.reporter_id)
                          Index Searches: 34
                          Buffers: shared hit=45 read=57
        ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.002..0.002 rows=0.38 loops=40)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 29  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
              Buffers: shared hit=20
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.16 rows=1 width=234) (actual time=0.005..0.005 rows=0.91 loops=11)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 10
                    Buffers: shared hit=20
Planning:
  Buffers: shared hit=203 read=21
Planning Time: 9.313 ms
Execution Time: 4.848 ms
```

## Liste de modération : tri par priorité : 2.955 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by (case when i.priority = 'HIGH' then 0 when i.priority is null then 1 when i.priority = 'NORMAL' then 2 else 3 end), i.created_at desc limit 40
```

```
Limit  (cost=1.19..12.21 rows=40 width=661) (actual time=1.799..2.673 rows=40.00 loops=1)
  Buffers: shared hit=124 read=82
  ->  Nested Loop Left Join  (cost=1.19..1362881.56 rows=4946713 width=661) (actual time=1.792..2.660 rows=40.00 loops=1)
        Buffers: shared hit=124 read=82
        ->  Nested Loop Left Join  (cost=1.04..1214895.10 rows=4946713 width=455) (actual time=1.769..2.599 rows=40.00 loops=1)
              Buffers: shared hit=114 read=82
              ->  Nested Loop Left Join  (cost=0.74..1075990.64 rows=4946713 width=466) (actual time=0.910..1.178 rows=40.00 loops=1)
                    Buffers: shared hit=45 read=31
                    ->  Nested Loop  (cost=0.59..952688.35 rows=4946713 width=264) (actual time=0.890..1.116 rows=40.00 loops=1)
                          Buffers: shared hit=25 read=31
                          ->  Index Scan using incidents_priority_rank_idx on incidents i  (cost=0.43..829353.13 rows=4946713 width=146) (actual time=0.857..1.039 rows=40.00 loops=1)
                                Index Searches: 1
                                Buffers: shared hit=9 read=31
                          ->  Memoize  (cost=0.15..0.17 rows=1 width=120) (actual time=0.001..0.001 rows=1.00 loops=40)
                                Cache Key: i.type_id
                                Cache Mode: logical
                                Hits: 32  Misses: 8  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                Buffers: shared hit=16
                                ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.16 rows=1 width=120) (actual time=0.004..0.004 rows=1.00 loops=8)
                                      Index Cond: (id = i.type_id)
                                      Index Searches: 8
                                      Buffers: shared hit=16
                    ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.001..0.001 rows=0.95 loops=40)
                          Cache Key: i.hero_id
                          Cache Mode: logical
                          Hits: 29  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                          Buffers: shared hit=20
                          ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.16 rows=1 width=234) (actual time=0.002..0.002 rows=0.91 loops=11)
                                Index Cond: (user_id = i.hero_id)
                                Index Searches: 10
                                Buffers: shared hit=20
              ->  Memoize  (cost=0.30..0.32 rows=1 width=21) (actual time=0.035..0.035 rows=1.00 loops=40)
                    Cache Key: i.reporter_id
                    Cache Mode: logical
                    Hits: 0  Misses: 40  Evictions: 0  Overflows: 0  Memory Usage: 6kB
                    Buffers: shared hit=69 read=51
                    ->  Index Scan using users_pkey on users u  (cost=0.29..0.31 rows=1 width=21) (actual time=0.013..0.013 rows=1.00 loops=40)
                          Index Cond: (id = i.reporter_id)
                          Index Searches: 40
                          Buffers: shared hit=69 read=51
        ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.001..0.001 rows=0.42 loops=40)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 34  Misses: 6  Evictions: 0  Overflows: 0  Memory Usage: 1kB
              Buffers: shared hit=10
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.16 rows=1 width=234) (actual time=0.003..0.003 rows=0.83 loops=6)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 5
                    Buffers: shared hit=10
Planning:
  Buffers: shared hit=14
Planning Time: 2.348 ms
Execution Time: 2.955 ms
```

## Liste de modération : page 200 : 160.997 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by i.created_at desc limit 40 offset 7960
```

```
Limit  (cost=2119.16..2129.81 rows=40 width=657) (actual time=159.977..160.377 rows=40.00 loops=1)
  Buffers: shared hit=20379 read=9952 written=2
  ->  Nested Loop Left Join  (cost=1.19..1316206.56 rows=4946713 width=657) (actual time=0.908..159.756 rows=8000.00 loops=1)
        Buffers: shared hit=20379 read=9952 written=2
        ->  Nested Loop Left Join  (cost=1.04..1192953.66 rows=4946713 width=455) (actual time=0.899..153.957 rows=8000.00 loops=1)
              Buffers: shared hit=20351 read=9952 written=2
              ->  Nested Loop Left Join  (cost=0.74..1054049.20 rows=4946713 width=466) (actual time=0.046..91.170 rows=8000.00 loops=1)
                    Buffers: shared hit=275 read=7783 written=2
                    ->  Nested Loop  (cost=0.59..930746.91 rows=4946713 width=264) (actual time=0.036..85.600 rows=8000.00 loops=1)
                          Buffers: shared hit=255 read=7783 written=2
                          ->  Index Scan Backward using incidents_created_at_idx on incidents i  (cost=0.43..807411.69 rows=4946713 width=146) (actual time=0.018..77.517 rows=8000.00 loops=1)
                                Index Searches: 1
                                Buffers: shared hit=237 read=7783 written=2
                          ->  Memoize  (cost=0.15..0.17 rows=1 width=120) (actual time=0.000..0.000 rows=1.00 loops=8000)
                                Cache Key: i.type_id
                                Cache Mode: logical
                                Hits: 7991  Misses: 9  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                Buffers: shared hit=18
                                ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.16 rows=1 width=120) (actual time=0.002..0.002 rows=1.00 loops=9)
                                      Index Cond: (id = i.type_id)
                                      Index Searches: 9
                                      Buffers: shared hit=18
                    ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.000..0.000 rows=1.00 loops=8000)
                          Cache Key: i.hero_id
                          Cache Mode: logical
                          Hits: 7989  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                          Buffers: shared hit=20
                          ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.16 rows=1 width=234) (actual time=0.002..0.002 rows=0.91 loops=11)
                                Index Cond: (user_id = i.hero_id)
                                Index Searches: 10
                                Buffers: shared hit=20
              ->  Memoize  (cost=0.30..0.32 rows=1 width=21) (actual time=0.007..0.007 rows=1.00 loops=8000)
                    Cache Key: i.reporter_id
                    Cache Mode: logical
                    Hits: 585  Misses: 7415  Evictions: 0  Overflows: 0  Memory Usage: 970kB
                    Buffers: shared hit=20076 read=2169
                    ->  Index Scan using users_pkey on users u  (cost=0.29..0.31 rows=1 width=21) (actual time=0.007..0.007 rows=1.00 loops=7415)
                          Index Cond: (id = i.reporter_id)
                          Index Searches: 7415
                          Buffers: shared hit=20076 read=2169
        ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.000..0.000 rows=0.35 loops=8000)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 7985  Misses: 15  Evictions: 0  Overflows: 0  Memory Usage: 2kB
              Buffers: shared hit=28
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.16 rows=1 width=234) (actual time=0.002..0.002 rows=0.93 loops=15)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 14
                    Buffers: shared hit=28
Planning:
  Buffers: shared hit=14
Planning Time: 1.997 ms
Execution Time: 160.997 ms
```

## Liste de modération : vols réussis : 5.057 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null and i.status = 'SUCCEEDED' and i.type_id = 1 order by i.created_at desc limit 40
```

```
Limit  (cost=1.18..24.92 rows=40 width=657) (actual time=4.290..4.669 rows=40.00 loops=1)
  Buffers: shared hit=294 read=3
  ->  Nested Loop Left Join  (cost=1.18..812172.33 rows=1368651 width=657) (actual time=4.289..4.662 rows=40.00 loops=1)
        Buffers: shared hit=294 read=3
        ->  Nested Loop Left Join  (cost=1.03..778069.15 rows=1368651 width=455) (actual time=4.272..4.599 rows=40.00 loops=1)
              Buffers: shared hit=272 read=3
              ->  Nested Loop Left Join  (cost=0.73..728370.81 rows=1368651 width=466) (actual time=3.393..3.573 rows=40.00 loops=1)
                    Buffers: shared hit=152 read=3
                    ->  Nested Loop  (cost=0.58..694254.38 rows=1368651 width=264) (actual time=3.372..3.511 rows=40.00 loops=1)
                          Buffers: shared hit=132 read=3
                          ->  Index Scan Backward using incidents_status_created_at_idx on incidents i  (cost=0.43..677138.08 rows=1368651 width=146) (actual time=3.223..3.334 rows=40.00 loops=1)
                                Index Cond: (status = 'SUCCEEDED'::incident_status)
                                Filter: (type_id = 1)
                                Rows Removed by Filter: 87
                                Index Searches: 1
                                Buffers: shared hit=127 read=3
                          ->  Materialize  (cost=0.14..8.17 rows=1 width=120) (actual time=0.004..0.004 rows=1.00 loops=40)
                                Storage: Memory  Maximum Storage: 17kB
                                Buffers: shared hit=5
                                ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..8.16 rows=1 width=120) (actual time=0.135..0.136 rows=1.00 loops=1)
                                      Index Cond: (id = 1)
                                      Index Searches: 1
                                      Buffers: shared hit=5
                    ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.001..0.001 rows=1.00 loops=40)
                          Cache Key: i.hero_id
                          Cache Mode: logical
                          Hits: 30  Misses: 10  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                          Buffers: shared hit=20
                          ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.16 rows=1 width=234) (actual time=0.003..0.003 rows=1.00 loops=10)
                                Index Cond: (user_id = i.hero_id)
                                Index Searches: 10
                                Buffers: shared hit=20
              ->  Memoize  (cost=0.30..0.32 rows=1 width=21) (actual time=0.025..0.025 rows=1.00 loops=40)
                    Cache Key: i.reporter_id
                    Cache Mode: logical
                    Hits: 0  Misses: 40  Evictions: 0  Overflows: 0  Memory Usage: 6kB
                    Buffers: shared hit=120
                    ->  Index Scan using users_pkey on users u  (cost=0.29..0.31 rows=1 width=21) (actual time=0.003..0.003 rows=1.00 loops=40)
                          Index Cond: (id = i.reporter_id)
                          Index Searches: 40
                          Buffers: shared hit=120
        ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.001..0.001 rows=0.35 loops=40)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 28  Misses: 12  Evictions: 0  Overflows: 0  Memory Usage: 2kB
              Buffers: shared hit=22
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.16 rows=1 width=234) (actual time=0.002..0.002 rows=0.92 loops=12)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 11
                    Buffers: shared hit=22
Planning:
  Buffers: shared hit=22
Planning Time: 2.034 ms
Execution Time: 5.057 ms
```

## Tableau des héros : actifs + terminés depuis 24 h : 2.420 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null and (i.status in ('REPORTED','IN_PROGRESS') or i.intervention_ended_at > now() - interval '24 hours') order by i.created_at desc
```

```
Sort  (cost=4938.85..4940.09 rows=495 width=657) (actual time=1.992..2.013 rows=197.00 loops=1)
  Sort Key: i.created_at DESC
  Sort Method: quicksort  Memory: 55kB
  Buffers: shared hit=850 read=4
  ->  Nested Loop Left Join  (cost=17.29..4916.69 rows=495 width=657) (actual time=0.268..1.663 rows=197.00 loops=1)
        Buffers: shared hit=847 read=4
        ->  Nested Loop Left Join  (cost=17.14..4900.57 rows=495 width=455) (actual time=0.251..1.524 rows=197.00 loops=1)
              Buffers: shared hit=819 read=4
              ->  Nested Loop Left Join  (cost=16.85..1956.35 rows=495 width=466) (actual time=0.211..0.940 rows=197.00 loops=1)
                    Buffers: shared hit=228 read=4
                    ->  Nested Loop  (cost=16.69..1941.17 rows=495 width=264) (actual time=0.200..0.786 rows=197.00 loops=1)
                          Buffers: shared hit=208 read=4
                          ->  Bitmap Heap Scan on incidents i  (cost=16.54..1926.24 rows=495 width=146) (actual time=0.177..0.638 rows=197.00 loops=1)
                                Recheck Cond: (((status = ANY ('{REPORTED,IN_PROGRESS}'::incident_status[])) AND (deleted_at IS NULL)) OR ((intervention_ended_at > (now() - '24:00:00'::interval)) AND (deleted_at IS NULL)))
                                Filter: ((status = ANY ('{REPORTED,IN_PROGRESS}'::incident_status[])) OR (intervention_ended_at > (now() - '24:00:00'::interval)))
                                Heap Blocks: exact=189
                                Buffers: shared hit=190 read=4
                                ->  BitmapOr  (cost=16.54..16.54 rows=495 width=0) (actual time=0.103..0.104 rows=0.00 loops=1)
                                      Buffers: shared hit=2 read=3
                                      ->  Bitmap Index Scan on incidents_active_idx  (cost=0.00..4.14 rows=1 width=0) (actual time=0.060..0.061 rows=10.00 loops=1)
                                            Index Searches: 1
                                            Buffers: shared read=1
                                      ->  Bitmap Index Scan on incidents_ended_at_idx  (cost=0.00..12.15 rows=495 width=0) (actual time=0.041..0.041 rows=187.00 loops=1)
                                            Index Cond: (intervention_ended_at > (now() - '24:00:00'::interval))
                                            Index Searches: 1
                                            Buffers: shared hit=2 read=2
                          ->  Memoize  (cost=0.15..0.27 rows=1 width=120) (actual time=0.000..0.000 rows=1.00 loops=197)
                                Cache Key: i.type_id
                                Cache Mode: logical
                                Hits: 188  Misses: 9  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                Buffers: shared hit=18
                                ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.26 rows=1 width=120) (actual time=0.003..0.003 rows=1.00 loops=9)
                                      Index Cond: (id = i.type_id)
                                      Index Searches: 9
                                      Buffers: shared hit=18
                    ->  Memoize  (cost=0.15..0.27 rows=1 width=234) (actual time=0.000..0.000 rows=0.96 loops=197)
                          Cache Key: i.hero_id
                          Cache Mode: logical
                          Hits: 186  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                          Buffers: shared hit=20
                          ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.26 rows=1 width=234) (actual time=0.004..0.004 rows=0.91 loops=11)
                                Index Cond: (user_id = i.hero_id)
                                Index Searches: 10
                                Buffers: shared hit=20
              ->  Index Scan using users_pkey on users u  (cost=0.29..5.95 rows=1 width=21) (actual time=0.002..0.002 rows=1.00 loops=197)
                    Index Cond: (id = i.reporter_id)
                    Index Searches: 197
                    Buffers: shared hit=591
        ->  Memoize  (cost=0.15..0.26 rows=1 width=234) (actual time=0.000..0.000 rows=0.32 loops=197)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 182  Misses: 15  Evictions: 0  Overflows: 0  Memory Usage: 2kB
              Buffers: shared hit=28
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.25 rows=1 width=234) (actual time=0.002..0.002 rows=0.93 loops=15)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 14
                    Buffers: shared hit=28
Planning:
  Buffers: shared hit=19
Planning Time: 1.932 ms
Execution Time: 2.420 ms
```

## Pire ennemi d'un héros : 488.296 ms

```sql
select v.id, v.alias, count(*) from incidents i join villains v on v.id = i.villain_id where i.hero_id = (select user_id from hero_profiles where alias = 'Spider-Man') and i.deleted_at is null group by v.id order by count(*) desc limit 1
```

```
Limit  (cost=198415.75..198415.76 rows=1 width=242) (actual time=476.109..485.223 rows=1.00 loops=1)
  Buffers: shared hit=7843 read=161917
  InitPlan 1
    ->  Seq Scan on hero_profiles  (cost=0.00..12.50 rows=1 width=16) (actual time=0.056..0.060 rows=1.00 loops=1)
          Filter: ((alias)::text = 'Spider-Man'::text)
          Rows Removed by Filter: 11
          Buffers: shared hit=1
  ->  Sort  (cost=198403.25..198403.40 rows=60 width=242) (actual time=419.537..428.649 rows=1.00 loops=1)
        Sort Key: (count(*)) DESC
        Sort Method: top-N heapsort  Memory: 25kB
        Buffers: shared hit=7843 read=161917
        ->  Finalize GroupAggregate  (cost=198384.86..198402.95 rows=60 width=242) (actual time=419.368..428.496 rows=14.00 loops=1)
              Group Key: v.id
              Buffers: shared hit=7840 read=161917
              ->  Gather Merge  (cost=198384.86..198401.63 rows=144 width=242) (actual time=419.290..428.414 rows=42.00 loops=1)
                    Workers Planned: 2
                    Workers Launched: 2
                    Buffers: shared hit=7840 read=161917
                    ->  Sort  (cost=197384.84..197384.99 rows=60 width=242) (actual time=377.081..377.085 rows=14.00 loops=3)
                          Sort Key: v.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=7839 read=161917
                          Worker 0:  Sort Method: quicksort  Memory: 25kB
                          Worker 1:  Sort Method: quicksort  Memory: 25kB
                          ->  Partial HashAggregate  (cost=197382.47..197383.07 rows=60 width=242) (actual time=376.882..376.888 rows=14.00 loops=3)
                                Group Key: v.id
                                Batches: 1  Memory Usage: 32kB
                                Buffers: shared hit=7825 read=161917
                                Worker 0:  Batches: 1  Memory Usage: 32kB
                                Worker 1:  Batches: 1  Memory Usage: 32kB
                                ->  Hash Join  (cost=11.35..196351.90 rows=206113 width=234) (actual time=19.275..364.548 rows=57670.67 loops=3)
                                      Hash Cond: (i.villain_id = v.id)
                                      Buffers: shared hit=7825 read=161917
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..195786.18 rows=206113 width=16) (actual time=19.107..342.662 rows=165215.33 loops=3)
                                            Filter: ((deleted_at IS NULL) AND (hero_id = (InitPlan 1).col1))
                                            Rows Removed by Filter: 1501804
                                            Buffers: shared hit=7822 read=161917
                                      ->  Hash  (cost=10.60..10.60 rows=60 width=234) (actual time=0.082..0.083 rows=14.00 loops=3)
                                            Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                            Buffers: shared hit=3
                                            ->  Seq Scan on villains v  (cost=0.00..10.60 rows=60 width=234) (actual time=0.052..0.055 rows=14.00 loops=3)
                                                  Buffers: shared hit=3
Planning:
  Buffers: shared hit=10
Planning Time: 0.459 ms
JIT:
  Functions: 73
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 10.317 ms (Deform 4.412 ms), Inlining 0.000 ms, Optimization 3.394 ms, Emission 109.362 ms, Total 123.074 ms
Execution Time: 488.296 ms
```
