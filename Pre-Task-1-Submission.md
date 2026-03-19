# Task 1 Submission: Scalable GitHub Repository Data Aggregation System

**Submitted by:** Surya Vamsi  
**GitHub:** @Surya-github-cloud  
**Date:** March 17, 2026

---

## Deliverable 1: Architecture Diagram

> *(Paste or upload your architecture diagram image here)*

---

## Deliverable 2: Design Explanation

### System Overview

This design follows a cache-first, event-driven architecture to minimize GitHub API usage, ensure fast response times, and scale from 300 to 10,000+ repositories.

Repository data flows through two ingestion pathways:

- **Webhooks** — Real-time updates when repositories change on GitHub
- **Scheduled sync jobs** — Fallback batch syncs every 6 hours for reliability

Data passes through a hierarchical caching system (browser → Redis → database), keeping response times under 100ms for the vast majority of requests.

---

### Core Components

**1. Data Ingestion Layer**

- **Webhooks:** GitHub sends events instantly when repositories change (push, issues, PRs, stars). We verify the cryptographic signature and fetch fresh data immediately.
- **Scheduler:** A Celery background job runs every 6 hours, syncing only repositories that changed since the last run using selective updates.
- **Processor:** Validates data quality, normalizes formats, and enriches with calculated metrics before storage.

**2. Processing & Storage**

- **PostgreSQL:** Stores repository metadata (name, owner, language), historical snapshots (daily star/fork counts), and contributor information. Indexes on `owner`, `language`, and `updated_at` enable sub-10ms queries.
- **Historical Data:** Daily snapshots allow trend analysis without repeated API calls.

**3. Caching Strategy**

| Layer | TTL | Hit Rate | Latency |
|---|---|---|---|
| Browser Cache | 5 min | ~60% | 0ms |
| Redis Cache | 1–24 hrs | ~85% | <1ms |
| Database | — | ~15% | 50–200ms |

Cache TTL is tiered by repo popularity:
- **Hot repos** (>100 stars): 1 hour TTL
- **Warm repos** (10–100 stars): 6 hour TTL
- **Cold repos** (<10 stars): 24 hour TTL

Webhook events trigger immediate cache invalidation to keep data fresh.

**4. API Layer**

- REST endpoints: `GET /api/repositories`, `GET /api/repositories/{id}`, `GET /api/search`
- Cache-aside pattern: Check Redis → miss → query DB → store in Redis → return response
- Responses include cache metadata (status, TTL remaining, response time) for transparency

---

### Rate Limit Handling

GitHub's API allows 5,000 calls/hour. With 300 repositories and smart batching, the system stays well under that limit.

| Strategy | Effect |
|---|---|
| GraphQL batch queries | Fetch 10 repos per API call — 20x more efficient than REST |
| Selective sync | Only pull repos changed since last sync (~50 calls per run instead of 300) |
| Tiered scheduling | Active repos every 4h, regular every 24h, inactive weekly — ~140 calls/day total |
| Quota guard | Stops requests when quota drops below 10%, serves from cache until reset |

**Result:** ~140 API calls/day, well within GitHub's hourly limit. Safe buffer for growth.

---

### Update Mechanism

**Real-time (Webhook)**

1. GitHub detects a repository event (push, issue, PR, star, etc.)
2. Sends a signed `POST` to `/api/webhooks/github`
3. We verify the signature → fetch fresh data → update the database → invalidate cache
4. Connected browsers are notified via WebSocket — total time from event to updated UI: **~700ms**

**Fallback (Scheduled)**

Every 6 hours, Celery queries for repositories that changed since the last sync, batches them into GraphQL requests of 10, updates the database, and clears stale cache entries.

> **Why both?** Webhooks are fast but GitHub has a ~1% silent failure rate on delivery. Scheduled jobs catch anything missed and ensure eventual consistency.

---

### Data Storage Strategy

**Stored permanently (Database):**
- Repository metadata — name, owner, description, language, topics
- Daily star/fork snapshots for historical trend analysis
- Top 50 contributors per repository

**Fetched dynamically (cached on-demand):**
- Current star/fork counts (kept fresh via webhooks)
- Recent commits — last 50, cached for 6 hours
- Activity metrics — calculated on demand, lightweight

---

### Scalability Plan

| Scale | Infrastructure | API Usage | Est. Cost |
|---|---|---|---|
| 300 repos | 1x PostgreSQL (8GB), 1x Redis (2GB), 1x API server | ~140 calls/day (2.8% of quota) | ~$150/mo |
| 1,000 repos | PostgreSQL + 1 read replica, Redis cluster (3 nodes), 3x API servers + load balancer | 5,000+ quota headroom remains | ~$600/mo |
| 10,000 repos | Sharded PostgreSQL (4×2 replicas), Redis cluster (10+ nodes), Kubernetes auto-scale, Kafka, CDN | Multiple GitHub Apps for token pooling | $5,000+/mo |

**Scaling principle:** Caching absorbs ~85% of traffic before it reaches the database. Sharding distributes data load. Kubernetes handles traffic spikes. Kafka is introduced only at 10,000 repos where webhook volume becomes a throughput concern.

---

### Performance Optimization

- **Multi-layer caching** (browser → Redis → DB) keeps p99 response times under 200ms
- **PgBouncer** connection pooling reduces database connection overhead
- **Gzip compression**, pagination at 50 repos/page, and field selection keep API payloads lean
- **Read replicas** handle the majority of read traffic, keeping the primary free for writes

---

### Failure Handling

| Failure | Response | User Experience |
|---|---|---|
| GitHub API outage | Serve cached data; resume sync when API recovers | Sees data up to 6 hours old |
| Database unavailable | Query read replicas; fall back to Redis | Slightly slower but correct |
| Redis unavailable | Query database directly | 200ms latency instead of <1ms |
| Rate limit exhausted | Queue requests; wait for reset; serve from cache | No visible degradation |
| Webhook delivery failure | Caught by 6-hour scheduled sync | Data updates within 6 hours |

**Design principle:** Multiple fallback layers ensure graceful degradation. The system prioritizes availability over perfect freshness.

---

## Deliverable 3: API Flow Description

Here is how a typical user request moves through the system:

1. **Browser checks local cache** — if data exists and is under 5 minutes old, it renders immediately (0ms).
2. **API request sent** — `GET /api/repositories?page=1&limit=50` passes through the API gateway (auth check, rate limit check).
3. **Redis cache check** — key: `repo:list:page:1:limit:50`. Hit returns in <1ms. Miss proceeds to DB.
4. **Database query** — `SELECT * FROM repositories ORDER BY updated_at DESC LIMIT 50` (~100–150ms). Result is stored in Redis with a 1-hour TTL.
5. **Response returned** — JSON with data, pagination metadata, cache status, and response time (~150–200ms total on cache miss).
6. **Real-time updates via webhook** — when a repo changes, GitHub fires a webhook → backend verifies signature → fetches fresh data → updates DB → invalidates cache → WebSocket push to connected clients. Total time: **~700ms**.

---

## Deliverable 4: Technology Justification

| Component | Technology | Why |
|---|---|---|
| Backend | FastAPI (Python 3.11+) | Native async/await for concurrent webhook handling, auto-generated OpenAPI docs, Pydantic validation, 2–3x faster than Flask |
| Database | PostgreSQL 14+ | ACID guarantees, JSONB for flexible metadata, advanced indexing, proven at scale |
| Cache | Redis 7+ | Sub-millisecond latency, Pub/Sub for cache invalidation signals, native clustering for horizontal scale |
| Job Queue | Celery + Redis | Distributed task processing, built-in retry with exponential backoff, cron-style scheduling |
| Frontend | React 18+ | Component model maps cleanly to repository cards, efficient re-rendering, mature ecosystem |
| Deployment | Docker + Kubernetes | Reproducible builds, auto-scaling on demand, self-healing pods, zero-downtime rolling deploys |
| Monitoring | Prometheus + Grafana | Open-source, flexible metric scraping, real-time dashboards, SLO-based alerting |
