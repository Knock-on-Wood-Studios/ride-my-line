# Production operations

## Health and errors

- `GET /api/health` is the machine-readable service check. A healthy production response is HTTP 200 with `ok: true` and `analytics: true`.
- Cloudflare Workers observability is enabled. Review exceptions, 5xx responses, CPU time, and request volume after every release and after traffic spikes.
- Investigate any 5xx rate above 1% over five minutes, three or more identical client-error events in 15 minutes, or a health-check failure immediately.
- Treat a Yard 1 clear rate below 70%, any yard clear rate below 10%, or a greater than 35-point clear-rate drop between adjacent yards as a design incident requiring replay review and playtesting.

## Event schema

Analytics Engine dataset: `ride_my_line_events`

| Column | Meaning |
| --- | --- |
| `blob1` | event name |
| `blob2` | yard ID |
| `blob3` | outcome |
| `blob4` | failure reason |
| `blob5` | build version |
| `blob6` | broad input method |
| `double1` | count (always 1) |
| `double2` | attempt number |
| `double3` | duration in milliseconds |
| `double4` | ink percentage |
| `double5` | stars collected |
| `double6` | checkpoints reached |

Example outcome rollup:

```sql
SELECT blob2 AS yard, blob3 AS outcome, SUM(_sample_interval) AS runs
FROM ride_my_line_events
WHERE blob1 = 'run_finished' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY yard, outcome
ORDER BY yard, outcome
```

Example failure rollup:

```sql
SELECT blob2 AS yard, blob4 AS reason, SUM(_sample_interval) AS failures
FROM ride_my_line_events
WHERE blob1 = 'run_finished' AND blob3 = 'fail' AND timestamp > NOW() - INTERVAL '7' DAY
GROUP BY yard, reason
ORDER BY failures DESC
```

Product events contain no player or session identifier and expire from Analytics Engine after three months.

## Incident record

For every incident, record detection time, deployment ID, affected routes and yards, user-visible impact, mitigation, rollback or fix version, verification evidence, and follow-up owner. Never copy request IPs or other unrelated infrastructure metadata into product-analysis notes.
