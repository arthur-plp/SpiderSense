# Plans d'exécution : avant

2026-10-22T14:00:34.550Z

## Statistiques globales (accueil, espace pro) : 937.882 ms

```sql
select count(*), count(*) filter (where status in ('REPORTED','IN_PROGRESS')), count(*) filter (where hero_id is not null), count(*) filter (where status = 'SUCCEEDED'), sum(people_involved) filter (where status = 'SUCCEEDED') from incidents i join incident_types t on t.id = i.type_id where i.deleted_at is null
```

```
Finalize Aggregate  (cost=238326.95..238326.96 rows=1 width=40) (actual time=894.554..902.784 rows=1.00 loops=1)
  Buffers: shared hit=15616 read=154126
  ->  Gather  (cost=238326.72..238326.93 rows=2 width=40) (actual time=894.095..902.750 rows=3.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=15616 read=154126
        ->  Partial Aggregate  (cost=237326.72..237326.73 rows=1 width=40) (actual time=865.106..865.109 rows=1.00 loops=3)
              Buffers: shared hit=15616 read=154126
              ->  Hash Join  (cost=14.95..196105.50 rows=2061061 width=24) (actual time=24.829..668.662 rows=1650232.67 loops=3)
                    Hash Cond: (i.type_id = t.id)
                    Buffers: shared hit=15616 read=154126
                    ->  Parallel Seq Scan on incidents i  (cost=0.00..190576.04 rows=2061061 width=26) (actual time=24.718..408.846 rows=1650232.67 loops=3)
                          Filter: (deleted_at IS NULL)
                          Rows Removed by Filter: 16787
                          Buffers: shared hit=15613 read=154126
                    ->  Hash  (cost=12.20..12.20 rows=220 width=2) (actual time=0.092..0.093 rows=9.00 loops=3)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=3
                          ->  Seq Scan on incident_types t  (cost=0.00..12.20 rows=220 width=2) (actual time=0.066..0.068 rows=9.00 loops=3)
                                Buffers: shared hit=3
Planning:
  Buffers: shared hit=308 read=7
Planning Time: 7.214 ms
JIT:
  Functions: 44
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 7.492 ms (Deform 3.298 ms), Inlining 0.000 ms, Optimization 4.497 ms, Emission 69.415 ms, Total 81.403 ms
Execution Time: 937.882 ms
```

## Statistiques de tous les héros (API /api/heroes, toutes les 20 s) : 4820.996 ms

```sql
select hero_id, count(*), count(*) filter (where status = 'SUCCEEDED'), count(distinct villain_id) filter (where villain_imprisoned) from incidents where deleted_at is null group by hero_id
```

```
GroupAggregate  (cost=1040269.22..1114467.53 rows=10 width=40) (actual time=3777.120..4784.372 rows=11.00 loops=1)
  Group Key: hero_id
  Buffers: shared hit=15898 read=153844, temp read=44336 written=44421
  ->  Sort  (cost=1040269.22..1052635.59 rows=4946547 width=37) (actual time=3675.212..4403.371 rows=4950698.00 loops=1)
        Sort Key: hero_id, villain_id
        Sort Method: external merge  Disk: 177376kB
        Buffers: shared hit=15898 read=153844, temp read=44336 written=44421
        ->  Seq Scan on incidents  (cost=0.00..219747.90 rows=4946547 width=37) (actual time=191.489..1151.917 rows=4950698.00 loops=1)
              Filter: (deleted_at IS NULL)
              Rows Removed by Filter: 50360
              Buffers: shared hit=15895 read=153844
Planning:
  Buffers: shared hit=13
Planning Time: 0.191 ms
JIT:
  Functions: 9
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 1.115 ms (Deform 0.600 ms), Inlining 53.328 ms, Optimization 70.720 ms, Emission 67.478 ms, Total 192.641 ms
Execution Time: 4820.996 ms
```

## Liste de modération : total : 483.905 ms

```sql
select count(*) from incidents where deleted_at is null
```

```
Finalize Aggregate  (cost=196728.91..196728.92 rows=1 width=8) (actual time=475.590..482.861 rows=1.00 loops=1)
  Buffers: shared hit=15970 read=153769
  ->  Gather  (cost=196728.69..196728.90 rows=2 width=8) (actual time=475.219..482.796 rows=3.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=15970 read=153769
        ->  Partial Aggregate  (cost=195728.69..195728.70 rows=1 width=8) (actual time=450.198..450.199 rows=1.00 loops=3)
              Buffers: shared hit=15970 read=153769
              ->  Parallel Seq Scan on incidents  (cost=0.00..190576.04 rows=2061061 width=0) (actual time=7.624..353.878 rows=1650232.67 loops=3)
                    Filter: (deleted_at IS NULL)
                    Rows Removed by Filter: 16787
                    Buffers: shared hit=15970 read=153769
Planning Time: 0.368 ms
JIT:
  Functions: 14
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 2.102 ms (Deform 0.962 ms), Inlining 0.000 ms, Optimization 1.434 ms, Emission 21.527 ms, Total 25.063 ms
Execution Time: 483.905 ms
```

## Liste de modération : 40 plus récents : 2679.998 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by i.created_at desc limit 40
```

```
Limit  (cost=281507.11..281511.77 rows=40 width=657) (actual time=2668.367..2676.914 rows=40.00 loops=1)
  Buffers: shared hit=13773 read=158076
  ->  Gather Merge  (cost=281507.11..857613.91 rows=4946546 width=657) (actual time=2647.173..2655.714 rows=40.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=13773 read=158076
        ->  Sort  (cost=280507.09..285659.74 rows=2061061 width=657) (actual time=2624.099..2624.107 rows=29.67 loops=3)
              Sort Key: i.created_at DESC
              Sort Method: top-N heapsort  Memory: 42kB
              Buffers: shared hit=13773 read=158076
              Worker 0:  Sort Method: top-N heapsort  Memory: 40kB
              Worker 1:  Sort Method: top-N heapsort  Memory: 42kB
              ->  Hash Left Join  (cost=2787.87..215357.69 rows=2061061 width=657) (actual time=28.443..1884.293 rows=1650232.67 loops=3)
                    Hash Cond: (i.villain_id = v.id)
                    Buffers: shared hit=13757 read=158076
                    ->  Parallel Hash Left Join  (cost=2776.52..209802.73 rows=2061061 width=455) (actual time=28.386..1596.735 rows=1650232.67 loops=3)
                          Hash Cond: (i.reporter_id = u.id)
                          Buffers: shared hit=13754 read=158076
                          ->  Hash Left Join  (cost=29.45..201644.92 rows=2061061 width=466) (actual time=18.945..1113.782 rows=1650232.67 loops=3)
                                Hash Cond: (i.hero_id = hp.user_id)
                                Buffers: shared hit=13753 read=155992
                                ->  Hash Join  (cost=14.95..196105.50 rows=2061061 width=264) (actual time=18.855..805.837 rows=1650232.67 loops=3)
                                      Hash Cond: (i.type_id = t.id)
                                      Buffers: shared hit=13750 read=155992
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..190576.04 rows=2061061 width=146) (actual time=18.771..465.000 rows=1650232.67 loops=3)
                                            Filter: (deleted_at IS NULL)
                                            Rows Removed by Filter: 16787
                                            Buffers: shared hit=13747 read=155992
                                      ->  Hash  (cost=12.20..12.20 rows=220 width=120) (actual time=0.057..0.057 rows=9.00 loops=3)
                                            Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                            Buffers: shared hit=3
                                            ->  Seq Scan on incident_types t  (cost=0.00..12.20 rows=220 width=120) (actual time=0.034..0.036 rows=9.00 loops=3)
                                                  Buffers: shared hit=3
                                ->  Hash  (cost=12.00..12.00 rows=200 width=234) (actual time=0.057..0.058 rows=12.00 loops=3)
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=3
                                      ->  Seq Scan on hero_profiles hp  (cost=0.00..12.00 rows=200 width=234) (actual time=0.038..0.039 rows=12.00 loops=3)
                                            Buffers: shared hit=3
                          ->  Parallel Hash  (cost=2379.25..2379.25 rows=29425 width=21) (actual time=9.243..9.243 rows=16674.33 loops=3)
                                Buckets: 65536  Batches: 1  Memory Usage: 3264kB
                                Buffers: shared hit=1 read=2084
                                ->  Parallel Seq Scan on users u  (cost=0.00..2379.25 rows=29425 width=21) (actual time=0.153..13.238 rows=50023.00 loops=1)
                                      Buffers: shared hit=1 read=2084
                    ->  Hash  (cost=10.60..10.60 rows=60 width=234) (actual time=0.026..0.027 rows=14.00 loops=3)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=3
                          ->  Seq Scan on villains v  (cost=0.00..10.60 rows=60 width=234) (actual time=0.011..0.013 rows=14.00 loops=3)
                                Buffers: shared hit=3
Planning:
  Buffers: shared hit=222 read=13
Planning Time: 3.062 ms
JIT:
  Functions: 112
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 8.183 ms (Deform 3.881 ms), Inlining 0.000 ms, Optimization 3.196 ms, Emission 73.751 ms, Total 85.130 ms
Execution Time: 2679.998 ms
```

## Liste de modération : tri par priorité : 2648.127 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by (case when i.priority = 'HIGH' then 0 when i.priority is null then 1 when i.priority = 'NORMAL' then 2 else 3 end), i.created_at desc limit 40
```

```
Limit  (cost=291812.41..291817.07 rows=40 width=661) (actual time=2636.431..2645.451 rows=40.00 loops=1)
  Buffers: shared hit=15890 read=155973
  ->  Gather Merge  (cost=291812.41..867919.21 rows=4946546 width=661) (actual time=2614.439..2623.453 rows=40.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=15890 read=155973
        ->  Sort  (cost=290812.39..295965.04 rows=2061061 width=661) (actual time=2590.617..2590.625 rows=33.00 loops=3)
              Sort Key: (CASE WHEN (i.priority = 'HIGH'::incident_priority) THEN 0 WHEN (i.priority IS NULL) THEN 1 WHEN (i.priority = 'NORMAL'::incident_priority) THEN 2 ELSE 3 END), i.created_at DESC
              Sort Method: top-N heapsort  Memory: 43kB
              Buffers: shared hit=15890 read=155973
              Worker 0:  Sort Method: top-N heapsort  Memory: 43kB
              Worker 1:  Sort Method: top-N heapsort  Memory: 42kB
              ->  Hash Left Join  (cost=2787.87..225662.99 rows=2061061 width=661) (actual time=29.040..1800.134 rows=1650232.67 loops=3)
                    Hash Cond: (i.villain_id = v.id)
                    Buffers: shared hit=15860 read=155973
                    ->  Parallel Hash Left Join  (cost=2776.52..209802.73 rows=2061061 width=455) (actual time=28.968..1502.994 rows=1650232.67 loops=3)
                          Hash Cond: (i.reporter_id = u.id)
                          Buffers: shared hit=15857 read=155973
                          ->  Hash Left Join  (cost=29.45..201644.92 rows=2061061 width=466) (actual time=23.075..1050.369 rows=1650232.67 loops=3)
                                Hash Cond: (i.hero_id = hp.user_id)
                                Buffers: shared hit=13772 read=155973
                                ->  Hash Join  (cost=14.95..196105.50 rows=2061061 width=264) (actual time=23.008..762.030 rows=1650232.67 loops=3)
                                      Hash Cond: (i.type_id = t.id)
                                      Buffers: shared hit=13769 read=155973
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..190576.04 rows=2061061 width=146) (actual time=22.923..442.969 rows=1650232.67 loops=3)
                                            Filter: (deleted_at IS NULL)
                                            Rows Removed by Filter: 16787
                                            Buffers: shared hit=13766 read=155973
                                      ->  Hash  (cost=12.20..12.20 rows=220 width=120) (actual time=0.067..0.067 rows=9.00 loops=3)
                                            Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                            Buffers: shared hit=3
                                            ->  Seq Scan on incident_types t  (cost=0.00..12.20 rows=220 width=120) (actual time=0.041..0.043 rows=9.00 loops=3)
                                                  Buffers: shared hit=3
                                ->  Hash  (cost=12.00..12.00 rows=200 width=234) (actual time=0.038..0.039 rows=12.00 loops=3)
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=3
                                      ->  Seq Scan on hero_profiles hp  (cost=0.00..12.00 rows=200 width=234) (actual time=0.021..0.022 rows=12.00 loops=3)
                                            Buffers: shared hit=3
                          ->  Parallel Hash  (cost=2379.25..2379.25 rows=29425 width=21) (actual time=5.571..5.571 rows=16674.33 loops=3)
                                Buckets: 65536  Batches: 1  Memory Usage: 3264kB
                                Buffers: shared hit=2085
                                ->  Parallel Seq Scan on users u  (cost=0.00..2379.25 rows=29425 width=21) (actual time=0.026..6.166 rows=50023.00 loops=1)
                                      Buffers: shared hit=2085
                    ->  Hash  (cost=10.60..10.60 rows=60 width=234) (actual time=0.043..0.044 rows=14.00 loops=3)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=3
                          ->  Seq Scan on villains v  (cost=0.00..10.60 rows=60 width=234) (actual time=0.013..0.015 rows=14.00 loops=3)
                                Buffers: shared hit=3
Planning:
  Buffers: shared hit=23
Planning Time: 1.499 ms
JIT:
  Functions: 112
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 9.999 ms (Deform 4.943 ms), Inlining 0.000 ms, Optimization 2.544 ms, Emission 87.614 ms, Total 100.157 ms
Execution Time: 2648.127 ms
```

## Liste de modération : page 200 : 3664.702 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null order by i.created_at desc limit 40 offset 7960
```

```
Limit  (cost=699201.93..699209.58 rows=40 width=657) (actual time=3570.768..3621.992 rows=40.00 loops=1)
  Buffers: shared hit=15957 read=155949, temp read=89703 written=176672
  ->  Nested Loop Left Join  (cost=697679.65..1643664.10 rows=4946547 width=657) (actual time=3199.702..3264.839 rows=8000.00 loops=1)
        Buffers: shared hit=15957 read=155949, temp read=89703 written=176672
        ->  Nested Loop Left Join  (cost=697679.50..1520415.34 rows=4946547 width=455) (actual time=3199.676..3261.728 rows=8000.00 loops=1)
              Buffers: shared hit=15930 read=155948, temp read=89703 written=176672
              ->  Nested Loop  (cost=697679.34..1397117.19 rows=4946547 width=253) (actual time=3199.638..3258.459 rows=8000.00 loops=1)
                    Buffers: shared hit=15910 read=155948, temp read=89703 written=176672
                    ->  Gather Merge  (cost=697679.19..1273786.10 rows=4946547 width=135) (actual time=3199.366..3254.657 rows=8000.00 loops=1)
                          Workers Planned: 2
                          Workers Launched: 2
                          Buffers: shared hit=15893 read=155947, temp read=89703 written=176672
                          ->  Sort  (cost=696679.16..701831.82 rows=2061061 width=135) (actual time=3154.885..3155.854 rows=2889.33 loops=3)
                                Sort Key: i.created_at DESC
                                Sort Method: external merge  Disk: 255992kB
                                Buffers: shared hit=15893 read=155947, temp read=89703 written=176672
                                Worker 0:  Sort Method: external merge  Disk: 226752kB
                                Worker 1:  Sort Method: external merge  Disk: 223104kB
                                ->  Parallel Hash Left Join  (cost=2747.07..198733.85 rows=2061061 width=135) (actual time=183.670..1059.543 rows=1650232.67 loops=3)
                                      Hash Cond: (i.reporter_id = u.id)
                                      Buffers: shared hit=15877 read=155947
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..190576.04 rows=2061061 width=146) (actual time=177.645..545.523 rows=1650232.67 loops=3)
                                            Filter: (deleted_at IS NULL)
                                            Rows Removed by Filter: 16787
                                            Buffers: shared hit=13792 read=155947
                                      ->  Parallel Hash  (cost=2379.25..2379.25 rows=29425 width=21) (actual time=5.804..5.805 rows=16674.33 loops=3)
                                            Buckets: 65536  Batches: 1  Memory Usage: 3264kB
                                            Buffers: shared hit=2085
                                            ->  Parallel Seq Scan on users u  (cost=0.00..2379.25 rows=29425 width=21) (actual time=0.023..6.332 rows=50023.00 loops=1)
                                                  Buffers: shared hit=2085
                    ->  Memoize  (cost=0.15..0.17 rows=1 width=120) (actual time=0.000..0.000 rows=1.00 loops=8000)
                          Cache Key: i.type_id
                          Cache Mode: logical
                          Hits: 7991  Misses: 9  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                          Buffers: shared hit=17 read=1
                          ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.16 rows=1 width=120) (actual time=0.021..0.021 rows=1.00 loops=9)
                                Index Cond: (id = i.type_id)
                                Index Searches: 9
                                Buffers: shared hit=17 read=1
              ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.000..0.000 rows=1.00 loops=8000)
                    Cache Key: i.hero_id
                    Cache Mode: logical
                    Hits: 7989  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                    Buffers: shared hit=20
                    ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.16 rows=1 width=234) (actual time=0.006..0.006 rows=0.91 loops=11)
                          Index Cond: (user_id = i.hero_id)
                          Index Searches: 10
                          Buffers: shared hit=20
        ->  Memoize  (cost=0.15..0.17 rows=1 width=234) (actual time=0.000..0.000 rows=0.35 loops=8000)
              Cache Key: i.villain_id
              Cache Mode: logical
              Hits: 7985  Misses: 15  Evictions: 0  Overflows: 0  Memory Usage: 2kB
              Buffers: shared hit=27 read=1
              ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.16 rows=1 width=234) (actual time=0.005..0.005 rows=0.93 loops=15)
                    Index Cond: (id = i.villain_id)
                    Index Searches: 14
                    Buffers: shared hit=27 read=1
Planning:
  Buffers: shared hit=14
Planning Time: 1.376 ms
JIT:
  Functions: 71
  Options: Inlining true, Optimization true, Expressions true, Deforming true
  Timing: Generation 5.341 ms (Deform 3.090 ms), Inlining 122.644 ms, Optimization 458.584 ms, Emission 307.753 ms, Total 894.322 ms
Execution Time: 3664.702 ms
```

## Liste de modération : vols réussis : 1350.099 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null and i.status = 'SUCCEEDED' and i.type_id = 1 order by i.created_at desc limit 40
```

```
Limit  (cost=234488.74..234493.40 rows=40 width=657) (actual time=1338.373..1347.280 rows=40.00 loops=1)
  Buffers: shared hit=15928 read=155935
  ->  Gather Merge  (cost=234488.74..393885.35 rows=1368605 width=657) (actual time=1316.806..1325.708 rows=40.00 loops=1)
        Workers Planned: 2
        Workers Launched: 2
        Buffers: shared hit=15928 read=155935
        ->  Sort  (cost=233488.72..234914.35 rows=570252 width=657) (actual time=1293.132..1293.141 rows=31.33 loops=3)
              Sort Key: i.created_at DESC
              Sort Method: top-N heapsort  Memory: 42kB
              Buffers: shared hit=15928 read=155935
              Worker 0:  Sort Method: top-N heapsort  Memory: 40kB
              Worker 1:  Sort Method: top-N heapsort  Memory: 40kB
              ->  Hash Left Join  (cost=2773.06..215463.26 rows=570252 width=657) (actual time=30.323..1066.770 rows=467100.33 loops=3)
                    Hash Cond: (i.villain_id = v.id)
                    Buffers: shared hit=15912 read=155935
                    ->  Parallel Hash Left Join  (cost=2761.71..213918.11 rows=570252 width=455) (actual time=30.249..973.382 rows=467100.33 loops=3)
                          Hash Cond: (i.reporter_id = u.id)
                          Buffers: shared hit=15909 read=155935
                          ->  Hash Left Join  (cost=14.64..209674.01 rows=570252 width=466) (actual time=21.478..767.797 rows=467100.33 loops=3)
                                Hash Cond: (i.hero_id = hp.user_id)
                                Buffers: shared hit=13824 read=155935
                                ->  Nested Loop  (cost=0.14..208130.88 rows=570252 width=264) (actual time=21.401..664.885 rows=467100.33 loops=3)
                                      Buffers: shared hit=13821 read=155935
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..200994.56 rows=570252 width=146) (actual time=21.266..463.411 rows=467100.33 loops=3)
                                            Filter: ((deleted_at IS NULL) AND (type_id = 1) AND (status = 'SUCCEEDED'::incident_status))
                                            Rows Removed by Filter: 1199919
                                            Buffers: shared hit=13805 read=155934
                                      ->  Materialize  (cost=0.14..8.17 rows=1 width=120) (actual time=0.000..0.000 rows=1.00 loops=1401301)
                                            Storage: Memory  Maximum Storage: 17kB
                                            Buffers: shared hit=16 read=1
                                            ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..8.16 rows=1 width=120) (actual time=0.123..0.125 rows=1.00 loops=3)
                                                  Index Cond: (id = 1)
                                                  Index Searches: 3
                                                  Buffers: shared hit=16 read=1
                                ->  Hash  (cost=12.00..12.00 rows=200 width=234) (actual time=0.051..0.051 rows=12.00 loops=3)
                                      Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                      Buffers: shared hit=3
                                      ->  Seq Scan on hero_profiles hp  (cost=0.00..12.00 rows=200 width=234) (actual time=0.020..0.022 rows=12.00 loops=3)
                                            Buffers: shared hit=3
                          ->  Parallel Hash  (cost=2379.25..2379.25 rows=29425 width=21) (actual time=8.546..8.546 rows=16674.33 loops=3)
                                Buckets: 65536  Batches: 1  Memory Usage: 3264kB
                                Buffers: shared hit=2085
                                ->  Parallel Seq Scan on users u  (cost=0.00..2379.25 rows=29425 width=21) (actual time=0.032..10.024 rows=50023.00 loops=1)
                                      Buffers: shared hit=2085
                    ->  Hash  (cost=10.60..10.60 rows=60 width=234) (actual time=0.032..0.033 rows=14.00 loops=3)
                          Buckets: 1024  Batches: 1  Memory Usage: 9kB
                          Buffers: shared hit=3
                          ->  Seq Scan on villains v  (cost=0.00..10.60 rows=60 width=234) (actual time=0.017..0.019 rows=14.00 loops=3)
                                Buffers: shared hit=3
Planning:
  Buffers: shared hit=25
Planning Time: 1.290 ms
JIT:
  Functions: 100
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 10.058 ms (Deform 4.947 ms), Inlining 0.000 ms, Optimization 3.198 ms, Emission 81.444 ms, Total 94.701 ms
Execution Time: 1350.099 ms
```

## Tableau des héros : actifs + terminés depuis 24 h : 620.865 ms

```sql
select i.id, i.type_id, t.code, i.status, i.priority, i.description, i.city, i.created_at, hp.alias, u.first_name, v.alias from incidents i join incident_types t on t.id = i.type_id left join hero_profiles hp on hp.user_id = i.hero_id left join users u on u.id = i.reporter_id left join villains v on v.id = i.villain_id where i.deleted_at is null and (i.status in ('REPORTED','IN_PROGRESS') or i.intervention_ended_at > now() - interval '24 hours') order by i.created_at desc
```

```
Gather Merge  (cost=213670.89..213728.42 rows=494 width=657) (actual time=607.196..618.024 rows=254.00 loops=1)
  Workers Planned: 2
  Workers Launched: 2
  Buffers: shared hit=14779 read=155930
  ->  Sort  (cost=212670.87..212671.38 rows=206 width=657) (actual time=584.455..584.469 rows=84.67 loops=3)
        Sort Key: i.created_at DESC
        Sort Method: quicksort  Memory: 38kB
        Buffers: shared hit=14779 read=155930
        Worker 0:  Sort Method: quicksort  Memory: 39kB
        Worker 1:  Sort Method: quicksort  Memory: 36kB
        ->  Nested Loop Left Join  (cost=0.75..212662.95 rows=206 width=657) (actual time=36.206..584.115 rows=84.67 loops=3)
              Buffers: shared hit=14763 read=155930
              ->  Nested Loop Left Join  (cost=0.60..212654.03 rows=206 width=455) (actual time=36.171..583.531 rows=84.67 loops=3)
                    Buffers: shared hit=14690 read=155929
                    ->  Nested Loop Left Join  (cost=0.31..211428.76 rows=206 width=466) (actual time=36.097..579.488 rows=84.67 loops=3)
                          Buffers: shared hit=14121 read=155734
                          ->  Nested Loop  (cost=0.15..211420.79 rows=206 width=264) (actual time=36.060..579.063 rows=84.67 loops=3)
                                Buffers: shared hit=14059 read=155734
                                ->  Parallel Seq Scan on incidents i  (cost=0.00..211413.08 rows=206 width=146) (actual time=35.962..578.214 rows=84.67 loops=3)
                                      Filter: ((deleted_at IS NULL) AND ((status = ANY ('{REPORTED,IN_PROGRESS}'::incident_status[])) OR (intervention_ended_at > (now() - '24:00:00'::interval))))
                                      Rows Removed by Filter: 1666935
                                      Buffers: shared hit=14005 read=155734
                                ->  Memoize  (cost=0.15..0.27 rows=1 width=120) (actual time=0.005..0.005 rows=1.00 loops=254)
                                      Cache Key: i.type_id
                                      Cache Mode: logical
                                      Hits: 77  Misses: 9  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                      Buffers: shared hit=54
                                      Worker 0:  Hits: 81  Misses: 9  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                      Worker 1:  Hits: 70  Misses: 8  Evictions: 0  Overflows: 0  Memory Usage: 1kB
                                      ->  Index Scan using incident_types_pkey on incident_types t  (cost=0.14..0.26 rows=1 width=120) (actual time=0.012..0.012 rows=1.00 loops=26)
                                            Index Cond: (id = i.type_id)
                                            Index Searches: 26
                                            Buffers: shared hit=54
                          ->  Memoize  (cost=0.15..0.27 rows=1 width=234) (actual time=0.003..0.003 rows=0.97 loops=254)
                                Cache Key: i.hero_id
                                Cache Mode: logical
                                Hits: 76  Misses: 10  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                                Buffers: shared hit=62
                                Worker 0:  Hits: 79  Misses: 11  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                                Worker 1:  Hits: 68  Misses: 10  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                                ->  Index Scan using hero_profiles_pkey on hero_profiles hp  (cost=0.14..0.26 rows=1 width=234) (actual time=0.007..0.007 rows=0.97 loops=31)
                                      Index Cond: (user_id = i.hero_id)
                                      Index Searches: 30
                                      Buffers: shared hit=62
                    ->  Index Scan using users_pkey on users u  (cost=0.29..5.95 rows=1 width=21) (actual time=0.042..0.042 rows=1.00 loops=254)
                          Index Cond: (id = i.reporter_id)
                          Index Searches: 254
                          Buffers: shared hit=569 read=195
              ->  Memoize  (cost=0.15..0.26 rows=1 width=234) (actual time=0.004..0.004 rows=0.35 loops=254)
                    Cache Key: i.villain_id
                    Cache Mode: logical
                    Hits: 73  Misses: 13  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                    Buffers: shared hit=73 read=1
                    Worker 0:  Hits: 76  Misses: 14  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                    Worker 1:  Hits: 66  Misses: 12  Evictions: 0  Overflows: 0  Memory Usage: 2kB
                    ->  Index Scan using villains_pkey on villains v  (cost=0.14..0.25 rows=1 width=234) (actual time=0.009..0.009 rows=0.92 loops=39)
                          Index Cond: (id = i.villain_id)
                          Index Searches: 36
                          Buffers: shared hit=73 read=1
Planning:
  Buffers: shared hit=42 read=1
Planning Time: 1.301 ms
JIT:
  Functions: 114
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 8.841 ms (Deform 3.936 ms), Inlining 0.000 ms, Optimization 2.961 ms, Emission 87.969 ms, Total 99.771 ms
Execution Time: 620.865 ms
```

## Pire ennemi d'un héros : 522.669 ms

```sql
select v.id, v.alias, count(*) from incidents i join villains v on v.id = i.villain_id where i.hero_id = (select user_id from hero_profiles where alias = 'Spider-Man') and i.deleted_at is null group by v.id order by count(*) desc limit 1
```

```
Limit  (cost=198414.83..198414.83 rows=1 width=242) (actual time=509.412..520.441 rows=1.00 loops=1)
  Buffers: shared hit=14308 read=155452
  InitPlan 1
    ->  Seq Scan on hero_profiles  (cost=0.00..12.50 rows=1 width=16) (actual time=0.026..0.028 rows=1.00 loops=1)
          Filter: ((alias)::text = 'Spider-Man'::text)
          Rows Removed by Filter: 11
          Buffers: shared hit=1
  ->  Sort  (cost=198402.33..198402.48 rows=60 width=242) (actual time=490.206..501.234 rows=1.00 loops=1)
        Sort Key: (count(*)) DESC
        Sort Method: top-N heapsort  Memory: 25kB
        Buffers: shared hit=14308 read=155452
        ->  Finalize GroupAggregate  (cost=198383.93..198402.03 rows=60 width=242) (actual time=490.116..501.162 rows=14.00 loops=1)
              Group Key: v.id
              Buffers: shared hit=14305 read=155452
              ->  Gather Merge  (cost=198383.93..198400.71 rows=144 width=242) (actual time=490.072..501.108 rows=42.00 loops=1)
                    Workers Planned: 2
                    Workers Launched: 2
                    Buffers: shared hit=14305 read=155452
                    ->  Sort  (cost=197383.91..197384.06 rows=60 width=242) (actual time=461.777..461.782 rows=14.00 loops=3)
                          Sort Key: v.id
                          Sort Method: quicksort  Memory: 25kB
                          Buffers: shared hit=14304 read=155452
                          Worker 0:  Sort Method: quicksort  Memory: 25kB
                          Worker 1:  Sort Method: quicksort  Memory: 25kB
                          ->  Partial HashAggregate  (cost=197381.54..197382.14 rows=60 width=242) (actual time=461.682..461.689 rows=14.00 loops=3)
                                Group Key: v.id
                                Batches: 1  Memory Usage: 32kB
                                Buffers: shared hit=14290 read=155452
                                Worker 0:  Batches: 1  Memory Usage: 32kB
                                Worker 1:  Batches: 1  Memory Usage: 32kB
                                ->  Hash Join  (cost=11.35..196351.01 rows=206106 width=234) (actual time=13.800..444.611 rows=57670.67 loops=3)
                                      Hash Cond: (i.villain_id = v.id)
                                      Buffers: shared hit=14290 read=155452
                                      ->  Parallel Seq Scan on incidents i  (cost=0.00..195785.30 rows=206106 width=16) (actual time=13.702..415.727 rows=165215.33 loops=3)
                                            Filter: ((deleted_at IS NULL) AND (hero_id = (InitPlan 1).col1))
                                            Rows Removed by Filter: 1501804
                                            Buffers: shared hit=14287 read=155452
                                      ->  Hash  (cost=10.60..10.60 rows=60 width=234) (actual time=0.071..0.072 rows=14.00 loops=3)
                                            Buckets: 1024  Batches: 1  Memory Usage: 9kB
                                            Buffers: shared hit=3
                                            ->  Seq Scan on villains v  (cost=0.00..10.60 rows=60 width=234) (actual time=0.050..0.052 rows=14.00 loops=3)
                                                  Buffers: shared hit=3
Planning:
  Buffers: shared hit=9 read=1
Planning Time: 0.588 ms
JIT:
  Functions: 73
  Options: Inlining false, Optimization false, Expressions true, Deforming true
  Timing: Generation 6.928 ms (Deform 2.827 ms), Inlining 0.000 ms, Optimization 2.274 ms, Emission 57.442 ms, Total 66.644 ms
Execution Time: 522.669 ms
```
