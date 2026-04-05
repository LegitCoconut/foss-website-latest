# Scaling Plan — Next.js + MongoDB + Garage S3

## Context
The FOSS Hub app is currently a single-node deployment (Next.js, MongoDB 7, Garage S3 v2.2.0) via Docker Compose. As usage grows, we need a scaling strategy across all three layers. This plan identifies bottlenecks and provides a phased approach.

---

## Current Architecture (Single Node)
- **Next.js 16** — `next start` (single process), JWT sessions (stateless)
- **MongoDB 7** — standalone, no replica set, default connection pool (~5)
- **Garage S3 v2.2.0** — single node, replication_factor: 1, SQLite backend
- **No caching layer** (no Redis)
- **No reverse proxy config** checked in (likely external)
- **No rate limiting**

---

## Phase 1: Quick Wins (No Architecture Changes)

### 1.1 — MongoDB Connection Pool Tuning
**File:** `src/lib/db.ts`

Increase the default pool from ~5 to 50 for concurrent request handling:
```ts
mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 50,
    minPoolSize: 5,
})
```

### 1.2 — Next.js Standalone Output
**File:** `next.config.ts`

Enable standalone output for smaller, optimized production builds:
```ts
output: "standalone"
```
This produces a self-contained `server.js` in `.next/standalone` that's Docker-friendly and much lighter than a full `node_modules` deployment.

### 1.3 — Add a Reverse Proxy (Caddy or Nginx)
Put Caddy/Nginx in front of Next.js to handle:
- TLS termination
- Gzip/Brotli compression
- Static file serving (offload `_next/static` from Next.js)
- Connection keepalive and buffering
- Basic rate limiting

Example Caddy addition to `docker-compose.yml`:
```yaml
caddy:
    image: caddy:2
    ports: ["80:80", "443:443"]
    volumes:
        - ./Caddyfile:/etc/caddy/Caddyfile
        - caddy_data:/data
```

### 1.4 — Async Download Logging
**File:** `src/app/api/download/[versionId]/route.ts`, `src/app/api/team-storage/[teamId]/files/[fileId]/download/route.ts`

Currently every download blocks response to write `DownloadLog`. Make it fire-and-forget:
```ts
// Don't await — let it run in background
DownloadLog.create({ ... }).catch(console.error);
```

### 1.5 — Restrict Image Optimization Domains
**File:** `next.config.ts`

Replace the wildcard `remotePatterns` with only the S3 endpoint to prevent abuse of the image optimization API:
```ts
images: {
    remotePatterns: [
        { protocol: "http", hostname: "172.20.80.212", port: "3900" },
    ],
}
```

---

## Phase 2: Add Caching Layer (Redis)

### 2.1 — Add Redis to Docker Compose
```yaml
redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
    volumes:
        - redis_data:/data
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### 2.2 — Create Redis Client Utility
**New file:** `src/lib/redis.ts`

Simple helper wrapping `ioredis` with get/set/del and TTL-based caching.

### 2.3 — Cache Hot Paths
| Route | Cache Key | TTL | Invalidation |
|-------|-----------|-----|-------------|
| `GET /api/software` (published list) | `sw:list:{query_hash}` | 60s | On software create/update/delete |
| `GET /api/software/[id]` (detail) | `sw:{id}` | 120s | On software update |
| `GET /api/team-storage` (user teams) | `teams:user:{userId}` | 30s | On member add/remove |
| `GET /api/analytics` | `analytics` | 300s | Time-based |

### 2.4 — Rate Limiting with Redis
Use `@upstash/ratelimit` or a simple sliding-window counter in Redis for:
- `/api/download/*` — 30 req/min per user
- `/api/team-storage/*/files` POST — 10 req/min per user  
- `/api/register` — 5 req/min per IP
- `/api/auth/*` — 10 req/min per IP (brute-force protection)

---

## Phase 3: Horizontal Scaling

### 3.1 — Next.js: Multiple Instances
Since sessions are JWT (stateless), Next.js can scale horizontally behind a load balancer:

```
                    ┌─── Next.js Instance 1
Load Balancer ──────┼─── Next.js Instance 2
(Caddy/Nginx)       └─── Next.js Instance 3
                          │
                    ┌──── MongoDB Replica Set
                    └──── Garage S3 Cluster
```

Docker Compose scale: `docker compose up --scale app=3`

Or move to Docker Swarm / Kubernetes with a service definition.

### 3.2 — MongoDB: Replica Set
Convert standalone to a 3-node replica set for:
- **Read scaling** — read from secondaries for analytics/listing queries
- **High availability** — automatic failover
- **Backup** — point-in-time recovery from secondary

Update connection string:
```
mongodb://mongo1:27017,mongo2:27017,mongo3:27017/foss-distribution?replicaSet=rs0
```

Update Mongoose connection for read preference:
```ts
mongoose.connect(MONGODB_URI, {
    bufferCommands: false,
    maxPoolSize: 50,
    minPoolSize: 5,
    readPreference: "secondaryPreferred", // for read-heavy routes
})
```

### 3.3 — Garage S3: Multi-Node Cluster
Garage natively supports multi-node clustering. Scale from 1 to 3 nodes:

1. Update `garage.toml` on each node with unique `metadata_dir`, `data_dir`, and `rpc_public_addr`
2. Set `replication_factor: 3` (currently 1)
3. Use `garage node connect` to join nodes
4. Data is automatically distributed and replicated

This gives you:
- **Redundancy** — survive 1 node failure
- **Read throughput** — parallel reads from multiple nodes
- **Storage scaling** — add disks/nodes as needed

---

## Phase 4: Advanced Optimizations

### 4.1 — CDN for Static Assets
Put a CDN (Cloudflare, or self-hosted Varnish) in front of the S3 assets endpoint:
- Software icons and screenshots are immutable (already have `max-age=31536000`)
- Reduces S3 read load dramatically
- Can also front the `_next/static` assets

### 4.2 — MongoDB Indexes Audit
Add compound indexes for the most common query patterns:
```ts
// DownloadLog — for user activity page
DownloadLogSchema.index({ userId: 1, createdAt: -1 });

// TeamFile — already has { teamId: 1, createdAt: -1 } ✓

// Software — verify text index covers search patterns
SoftwareSchema.index({ status: 1, isFeatured: 1 }); // for homepage featured query
```

### 4.3 — Fix O(n) Admin Stats Endpoint
`GET /api/admin/system-stats` iterates all S3 objects to calculate bucket sizes. Replace with:
- Cache the result in Redis (5-minute TTL)
- Or store bucket size counters in MongoDB, updated on upload/delete

### 4.4 — Presigned URL Caching
Cache presigned download URLs for popular software (they expire in 5 min, so cache for 4 min):
```ts
const cacheKey = `presigned:${bucket}:${key}`;
let url = await redis.get(cacheKey);
if (!url) {
    url = await getPresignedDownloadUrl(bucket, key, 300);
    await redis.set(cacheKey, url, "EX", 240); // 4 min cache
}
```

### 4.5 — Database Connection Pooling via Proxy
For very high scale, put `mongos` (MongoDB proxy) or a connection pooler in front to manage connections across multiple Next.js instances, avoiding connection storms.

---

## Scaling Priority Order

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | MongoDB pool tuning (50 connections) | 5 min | High — unblocks concurrent requests |
| 2 | Standalone output + reverse proxy | 30 min | High — compression, TLS, static offload |
| 3 | Async download logging | 10 min | Medium — faster download responses |
| 4 | Redis caching layer | 2-3 hrs | High — reduces DB load 80%+ for reads |
| 5 | Rate limiting | 1-2 hrs | Medium — abuse protection |
| 6 | MongoDB replica set | 1-2 hrs | High — HA + read scaling |
| 7 | Garage multi-node | 1-2 hrs | High — storage redundancy + throughput |
| 8 | Next.js horizontal scaling | 30 min | High — handle more concurrent users |
| 9 | CDN for assets | 1 hr | Medium — reduces S3 read load |
| 10 | Index audit + stats caching | 1 hr | Medium — faster admin pages |

---

## Verification
After each phase:
1. `npx next build` — ensure build succeeds
2. Load test with `wrk` or `autocannon` against key endpoints
3. Monitor MongoDB connections with `db.serverStatus().connections`
4. Check Garage cluster health with `garage status`
5. Verify Redis hit rates with `redis-cli INFO stats`
