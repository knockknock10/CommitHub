# CommitHub

CommitHub is a full-stack, GitHub-like collaboration platform built with the MERN stack (MongoDB, Express, React, Node.js). It implements real version-control workflows — repositories, branches, commits, pull requests, code reviews, merge conflict resolution, and branch protection — wrapped in production-grade engineering: JWT authentication, role-based authorization, real-time collaboration over WebSockets, global search, notifications, organizations and teams, and 500+ integration tests.

This is not a simple CRUD demo. It is a deliberately engineered system that demonstrates how a real code-hosting product works under the hood.

## What Problem It Solves

Software teams need a platform to host code and collaborate on changes — pull requests, code reviews, releases, access control. Existing solutions (GitHub, GitLab) are proprietary or heavy to self-host. CommitHub is a self-contained, fully documented implementation of that product category, built to be understood, extended, and discussed in a technical interview.

## What Makes It Different from a Simple CRUD Project

| Dimension       | Typical CRUD project                        | CommitHub                                                                                   |
| --------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Version control | File uploads / records with version numbers | A real commit-and-tree model (`repoVersion`) with branches, refs, tags, and a diff engine   |
| Merging         | No concept                                  | Three-way merge with conflict detection and resolution strategies                           |
| Authorization   | Everyone can do everything                  | Owner / org / team / collaborator roles with fine-grained permissions, enforced server-side |
| Collaboration   | "View as list"                              | WebSocket real-time events for PRs, reviews, comments, notifications                        |
| Testing         | A few happy-path tests                      | 19 integration suites, 557 tests, per-file isolated databases                               |
| Observability   | `console.log`                               | Request IDs, structured logging, liveness/readiness endpoints, graceful shutdown            |

## Core Capabilities

### Repository Management
- Create, update, delete repositories (public and private)
- File and folder browser with branch switching
- Commit history and per-file history
- Raw file access, tree and blob endpoints
- Branch-aware file creation, editing, and deletion
- Stars and forks (with upstream tracking)

### Git Workflows
- Branch create, checkout, list, compare (ahead/behind + diff)
- Commits with working-tree change capture
- Pull requests within a repo and cross-repo (fork-based)
- Code reviews: approve / changes_requested / comment, tied to the reviewed commit
- Merge with branch-protection enforcement and required approvals
- Merge conflict detection and resolution (keep-source / keep-target / custom)
- Tags and releases (draft / published)

### Collaboration
- Repository collaborators with 5 roles (owner, maintainer, developer, reporter, read_only)
- Organizations (OWNER / ADMIN / MEMBER) with slug-based URLs
- Teams (maintainer / member) with per-repository permission grants
- Real-time collaborator updates

### Platform Features
- Global search across repositories, users, and organizations (regex-safe, paginated, private-repo aware)
- Notifications (15 types, @mentions, read/unread, real-time delivery)
- Activity feed (repository-scoped and global)
- Issues with labels and comments

### Security & Reliability
- JWT authentication with bcrypt password hashing (10 rounds)
- Server-side authorization on every mutation (centralized `authorizeRepository` / permission checks)
- Private-repository isolation across every endpoint (listings, search, activity, real-time)
- IDOR/BOLA prevention, input validation, NoSQL-injection and ReDoS defenses
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)
- Rate limiting on auth endpoints (in-memory, 100 req/min/IP)
- Configurable CORS with credential support
- Request correlation IDs, structured logging, slow-request detection
- Liveness/readiness endpoints and graceful shutdown (SIGTERM/SIGINT)

## Technology Stack

| Layer          | Technology                                                   |
| -------------- | ------------------------------------------------------------ |
| Frontend       | React 19, React Router 7, Vite 8, Axios, Socket.io Client    |
| Backend        | Node.js, Express 5, Socket.io 4                              |
| Database       | MongoDB, Mongoose 9                                          |
| Authentication | JWT (jsonwebtoken), bcryptjs                                 |
| Storage        | Local filesystem (repository content), AWS S3 SDK configured |
| Testing        | Node.js native test runner (`node --test`)                   |
| Observability  | Custom middleware (request ID, request logging)              |

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│  Express API │────▶│  Controllers│────▶│  MongoDB    │
│  (React)    │     │  + Socket.io │     │  + Services │     │  (Mongoose) │
└─────────────┘     └──────────────┘     └─────────────┘     └─────────────┘
     │                     │                    │
     │    REST + WS        │   domain events    │   file I/O
     ▼                     ▼                    ▼
┌─────────────┐      ┌──────────────┐   ┌─────────────────┐
│  Axios      │◀────▶│  Real-time   │   │  VCS Engine     │
│  Socket.io  │      │  (rooms/emit)│   │  (repoVersion)  │
└─────────────┘      └──────────────┘   └─────────────────┘
```

**Request flow:** Client → Observability (request ID, logging) → Security headers → CORS → Rate limiter (auth only) → JWT auth (`protect`) → Controller-level authorization → Controller → Services/Utils → MongoDB / filesystem → JSON response → Global error handler.

**Real-time flow:** Controllers emit domain events (`emitDomainEvent`) → Socket.io server listens → emits to rooms (`user:{id}`, `repo:{id}`, `pr:{id}`) → connected clients update live.

## Major Features

| Category              | Features                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Authentication**    | Signup, login, JWT (30-day), bcrypt, protected routes, auth rate limiting           |
| **Repositories**      | CRUD, public/private, file browser, branches, commits, stars, forks, releases, tags |
| **Pull Requests**     | Same-repo and cross-repo, reviews, merge, conflict resolution                       |
| **Code Review**       | Inline review comments, threads, resolve/unresolve, stale detection                 |
| **Branch Protection** | Required approvals (1–10), stale-review dismissal, merge-block reasons              |
| **Organizations**     | Slugs, OWNER/ADMIN/MEMBER roles, membership management                              |
| **Teams**             | maintainer/member roles, team→repository permission grants                          |
| **Collaborators**     | 5 roles, add/update/remove, real-time updates                                       |
| **Search**            | Repositories, users, organizations; regex-safe; paginated; private-repo aware       |
| **Notifications**     | 15 types, mentions, real-time, read/unread                                          |
| **Activity**          | Repository and global feeds, real-time events                                       |
| **Real-time**         | JWT-authenticated Socket.io, user/repo/PR rooms, 21 event types, reconnection       |
| **Issues**            | Labels, comments, open/close/reopen                                                 |

## Security

- **Authentication**: JWT (30-day expiry) verified in middleware; bcrypt (10 rounds); no password ever returned.
- **Authorization**: Centralized access checks (`authorizeRepository`, `authorizeRepositoryPermission`, `permissionService`) with owner > org-admin > collaborator-role > team-role precedence.
- **Private repositories**: access-checked on every endpoint (listings, search, activity, real-time room joins).
- **IDOR prevention**: every resource access validates ownership and access server-side.
- **Input validation**: ObjectId validation, enum checks, length limits, regex escaping (`escapeRegex`).
- **Rate limiting**: 100 req/min/IP on `/api/auth` (in-memory; Redis is the production evolution).
- **CORS**: configurable origins, credentials support.
- **Security headers**: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`.
- **Error handling**: clean JSON errors, no stack traces in production.
- **File safety**: path-traversal protection (`repoStorage.resolveRepoPath`), 1 MB file-size cap, no `..` escaping.

## Testing

- **Framework**: Node.js native test runner (`node --test`) with `node:assert/strict`.
- **Type**: HTTP integration tests against the real Express app and a real MongoDB.
- **Isolation**: each test file uses its own database (e.g., `commithub_auth_test`), plus a temp `REPO_STORAGE_ROOT`.
- **Coverage**: 19 suites (557 tests) covering auth, health, users, repositories, files, branches, commits, PRs, reviews, conflicts, merges, tags, releases, branch protection, search, notifications, activity, collaborators, forks, contract, and performance regressions.

Run tests:

```bash
cd backend
MONGO_URI=mongodb://admin:password@localhost:27017/commithub?authSource=admin npm test
```

## Performance

- **Database**: compound indexes on hot paths — `{owner, upstreamRepository, createdAt}`, `{repository, number}`, `{recipient, createdAt}`, `{repository, createdAt}`, and more (see `04_Database_Design.md`).
- **N+1 prevention**: batched permission checks and `.lean()` where serialization is not needed.
- **Pagination**: enforced limits (max 100) on search/list endpoints.
- **Real-time**: room-based emission scoped to users, repositories, and PRs — no broadcast storms.
- **Frontend**: debounced search, conditional rendering, `useRealtimeEvent` with handler caching.

## Reliability

- **Endpoints**: `GET /api/health` (liveness) and `GET /api/health/ready` (readiness, 503 when DB is down).
- **Request tracking**: UUID request ID set on `X-Request-Id`, logged with method, URL, status, duration.
- **Slow-request detection**: responses over 1000 ms logged as warnings.
- **Graceful shutdown**: SIGTERM/SIGINT → stop accepting connections → drain HTTP server → close MongoDB → exit; 10 s force-exit fallback.
- **Process safety**: unhandled rejection / uncaught exception handlers (exit in production).
- **WebSocket resilience**: auto-reconnect (10 attempts, 1–5 s exponential backoff) with connection indicator.
- **Frontend**: global `ErrorBoundary`, axios interceptors (401 → logout redirect), per-request loading/error states.

## Real-time Functionality

Socket.io server attached to the same HTTP server, authenticated via JWT in the socket handshake. Clients join targeted rooms (`user:{id}`, `repo:{id}`, `pr:{id}`) after server-side access checks. 21 event types (see `realtime/eventTypes.js`): PR created/updated/closed/reopened/merged, reviews, review comments and threads, notifications, activity, collaborator changes, forks, and a CI status change channel (plumbing in place for external CI event ingestion).

`useRealtimeEvent(event, handler)` hook subscribes declaratively and cleans up on unmount.

## Organizations and Teams

- **Organizations**: owned by a user, slug-based URLs (`/organization/:slug`), public/private visibility, OWNER/ADMIN/MEMBER roles.
- **Teams**: belong to an organization, roles maintainer/member.
- **Team repository permissions**: a team can be granted a collaborator role on an org-owned repository; effective permission = highest applicable role.

## Pull Requests

- Source/target branch within a repo, or cross-repo from a fork (`sourceRepository`).
- Review states `approved`, `changes_requested`, `commented` — recorded against the reviewed commit.
- Merge eligibility enforced server-side: conflicts, branch protection, required approvals, changes-requested, stale reviews.
- Conflict resolution via three-way diff with `keep_source`, `keep_target`, and `custom` strategies.

## Repository Permissions

Five collaborator roles with cumulative permissions:

| Permission                 | owner | maintainer | developer | reporter | read_only |
| -------------------------- | ----- | ---------- | --------- | -------- | --------- |
| Read                       | ✓     | ✓          | ✓         | ✓        | ✓         |
| Push / create commits      | ✓     | ✓          | ✓         | –        | –         |
| Create / review PRs        | ✓     | ✓          | ✓         | ✓        | –         |
| Merge PRs                  | ✓     | ✓          | ✓         | –        | –         |
| Manage branch protection   | ✓     | ✓          | –         | –        | –         |
| Manage collaborators       | ✓     | ✓          | –         | –        | –         |
| Manage repository settings | ✓     | ✓          | –         | –        | –         |
| Delete repository          | ✓     | –          | –         | –        | –         |

## How to Run Locally

### Prerequisites

- Node.js 20+
- MongoDB 6+ (local, Docker, or Atlas replica set)
- npm 10+

### Database Setup

Using the included Docker Compose (recommended):

```bash
docker compose up -d
# starts mongo:7 on localhost:27017, db "commithub",
# user "admin" / password "password"
```

Or run MongoDB directly:

```bash
docker run -d --name mongodb \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=admin \
  -e MONGO_INITDB_ROOT_PASSWORD=password \
  -e MONGO_INITDB_DATABASE=commithub \
  mongo:7
```

### Environment Variables

**Backend** — create `backend/.env`:

```env
PORT=5001
MONGO_URI=mongodb://admin:password@localhost:27017/commithub?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
REPO_STORAGE_ROOT=/tmp/commithub-repos
```

**Frontend** — create `commithub-frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

### Backend Setup

```bash
cd backend
npm install
npm run dev        # or: npm start
# Server runs on http://localhost:5001
```

### Frontend Setup

```bash
npm run dev
```

---

# Environment Variables

Create a `.env` file inside the backend directory.

```env
PORT=5000

MONGO_URI=your_mongodb_connection

JWT_SECRET=your_jwt_secret

AWS_ACCESS_KEY_ID=your_aws_access_key

AWS_SECRET_ACCESS_KEY=your_aws_secret_key

AWS_REGION=your_region

AWS_BUCKET_NAME=your_s3_bucket_name
```

---

# AWS S3 Workflow

CommitHub uses AWS S3 for storing uploaded files and assets.

### Flow

1. User uploads a file
2. Backend processes the upload
3. File is stored in AWS S3
4. S3 returns the file URL
5. URL is saved in the database
6. Frontend accesses the stored asset

---

# Current Progress

## Completed

- Authentication pages
- Backend setup
- MongoDB integration
- AWS S3 integration
- API structure
- Responsive UI
- Pull request merge frontend (live merge status, conflict display, owner-gated merge button, merged metadata)
- Pull request conflict resolution (base/source/target conflict detail with regions, keep-source/keep-target/custom strategies, resolution committed to the source branch as a merge commit, stale-resolution rejection, BASE/SOURCE/TARGET resolver UI)
- Pull request reviews and branch protection (commit-tied approvals with stale-review dismissal, required distinct-approver counts, changes-requested blocking, server-enforced merge eligibility with structured block reasons, owner-only protection settings)
- Code review comments and review threads (file/line-level inline comments, threaded conversations, thread resolution, commit-based outdated detection, notifications, 30 integration tests)
- CI status checks (commit status lifecycle, webhook-based CI provider integration)
- External CI status integration (provider registration, HMAC webhook verification, status mapping)

---

## In Progress

- Repository workflow system
- Collaboration features
- Dashboard pages
- User profile management

---

## Planned Features

- Notifications
- Organization support
- Activity tracking
- Real-time collaboration
- CI/CD integrations

---

# Contributing

Contributions are welcome.

## Steps

1. Fork the repository

2. Create a feature branch

```bash
cd backend
npm start
node seeder.js     # creates sanjeevkumar user and two demo repos
```

### Test Commands

```bash
cd backend
MONGO_URI=mongodb://admin:password@localhost:27017/commithub?authSource=admin npm test
```

### Build Commands

```bash
cd commithub-frontend
npm run build      # outputs to dist/
npm run lint       # ESLint
```

## Project Structure

```
CommitHub/
├── backend/
│   ├── config/            # Config, DB connection, AWS client
│   ├── controllers/       # Request handlers (auth, repo, PR, org, team, ...)
│   ├── middleware/        # JWT auth, errors, observability
│   ├── models/            # Mongoose schemas (17 models)
│   ├── routes/            # Express routing
│   ├── realtime/          # Socket.io server, event types, domain-event wiring
│   ├── services/          # Permissions, notifications, activity, domain events
│   ├── utils/             # VCS engine, diff/merge, repo storage, file walker
│   ├── tests/             # 19 integration suites + helpers
│   ├── seeder.js          # Demo data
│   └── server.js          # App entry point
├── commithub-frontend/
│   └── src/
│       ├── api/           # Axios instance + API modules
│       ├── components/    # auth, dashboard, repo, issue, comments, activity
│       ├── context/       # AuthContext, SocketContext
│       ├── hooks/         # useDebounce, useRealtimeEvent
│       ├── pages/         # Dashboard, Repository, PR, Issues, Org, Profile, ...
│       ├── routes/        # ProtectedRoute
│       ├── styles/        # CSS
│       ├── App.jsx        # Routing
│       └── main.jsx       # Entry (ErrorBoundary, Providers)
├── docs/                  # Architecture, API, DB, interview preparation
├── docker-compose.yml     # Mongo 7 for local development
└── package.json
```

## Documentation

See `docs/` for detailed documentation:

| Document                      | Description                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `00_Project_Overview.md`      | High-level project summary and demo flow                   |
| `01_System_Architecture.md`   | System architecture, request/auth/PR/real-time flows       |
| `02_Backend_Architecture.md`  | Backend layers, middleware, services, VCS engine           |
| `03_Frontend_Architecture.md` | React structure, contexts, hooks, API layer                |
| `04_Database_Design.md`       | All 17 schemas, relationships, indexes, queries            |
| `05_API_Documentation.md`     | Full REST API reference                                    |
| `01_System_Design/`           | Per-feature design documents (24 files)                    |
| `07_Interview_Notes/`         | Interview prep: auth, security, performance, system design |
| `08_Mistakes_and_Lessons.md`  | Retrospective from the full build                          |
| `09_Future_Improvements.md`   | Realistic roadmap                                          |
| `10_Project_Walkthrough.md`   | End-to-end technical walkthrough                           |

## API Overview

Base URL: `/api` (all endpoints require `Authorization: Bearer <token>` except health and auth).

| Area              | Example endpoints                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Health            | `GET /health`, `GET /health/ready`                                                                                                                                        |
| Auth              | `POST /auth/signup`, `POST /auth/login`                                                                                                                                   |
| Repositories      | `GET/POST /repositories`, `GET/PATCH/DELETE /repositories/:id`                                                                                                            |
| File browser      | `GET/POST/PUT/DELETE /repositories/:id/file`, `GET /repositories/:id/tree`, `GET /repositories/:id/raw`                                                                   |
| Branches          | `GET/POST /repositories/:id/branches`, `POST /repositories/:id/branches/checkout`, `GET /repositories/:id/compare`                                                        |
| Commits           | `GET/POST /repositories/:id/commits`, `GET /repositories/:id/commits/:commitId`, `GET /repositories/:id/changes`                                                          |
| Pull requests     | `GET/POST /repositories/:id/pull-requests`, `GET/PATCH .../:number`, `POST .../:number/close\|reopen\|merge`                                                              |
| Reviews           | `GET/POST .../:number/reviews`, `PATCH .../:number/reviews/:reviewId`                                                                                                     |
| Review comments   | `GET/POST .../:number/review-comments`, threads, replies, resolve/unresolve                                                                                               |
| Merge & conflicts | `GET .../:number/merge-status`, `GET .../:number/conflicts`, `POST .../:number/conflicts/resolve`, `GET /repositories/:id/merge-analysis`, `POST /repositories/:id/merge` |
| Branch protection | `GET/PUT /repositories/:id/branch-protection/:branch`                                                                                                                     |
| Tags & releases   | `GET/POST .../tags`, `GET/DELETE .../tags/:tagName`, `GET/POST .../releases`, `GET/PATCH .../releases/:releaseId`                                                         |
| Collaborators     | `GET/POST .../collaborators`, `PATCH/DELETE .../collaborators/:userId`, `GET .../collaborators/me`                                                                        |
| Forks             | `POST /repositories/:id/fork`, `GET /repositories/:id/forks`                                                                                                              |
| Issues            | `GET/POST /issues/repository/:id`, `GET/PATCH /issues/:id`, close/reopen                                                                                                  |
| Comments          | `GET/POST /comments/:issueId`, `DELETE /comments/delete/:commentId`                                                                                                       |
| Organizations     | `POST /organizations`, `GET /organizations/:slug`, members add/remove                                                                                                     |
| Teams             | `GET /teams/:orgSlug`, `POST /teams`, `POST/DELETE /teams/members`                                                                                                        |
| Org repos         | `GET /org-repos/:orgSlug`                                                                                                                                                 |
| Search            | `GET /search?q=&type=`                                                                                                                                                    |
| Notifications     | `GET /notifications`, unread-count, mark read/read-all, delete                                                                                                            |
| Activity          | `GET /activity`, `GET /repositories/:id/activity`                                                                                                                         |
| Users             | `GET /users/profile/:id`                                                                                                                                                  |

## Known Limitations

Honest scope notes (all are documented in `09_Future_Improvements.md`):

- **In-memory rate limiting** — not suitable for multi-instance deployment.
- **Single-instance WebSocket** — Socket.io is not horizontally scaled (no Redis adapter).
- **Local file storage** — repo content lives on the local filesystem; AWS S3 SDK is configured but not the primary store.
- **No distributed cache** — no Redis/Memcached layer.
- **No background job queue** — notifications, activity, and webhook-flavored work run synchronously.
- **Simplified Git** — commits, trees, and diffs are modeled natively; the actual Git wire protocol is not implemented.
- **Search** — MongoDB regex/text search, not Elasticsearch/OpenSearch.
- **No production deployment** — Docker Compose targets local development; no cloud/infra manifests.
- **No audit log** — the activity feed is an event history, not an immutable audit trail.
- **CI/CD** — a real-time CI-status event channel exists, but there is no external webhook receiver or pipeline engine.

## Future Improvements

See `docs/09_Future_Improvements.md` for the full roadmap. Highlights:

- Redis rate limiting and queued background jobs (BullMQ)
- Socket.io Redis adapter for horizontal real-time scaling
- Object storage (S3/MinIO) as the primary repo backend
- Elasticsearch/OpenSearch-based code search
- Structured logging service + OpenTelemetry tracing + metrics export
- JWT refresh-token flow
- GPG commit signing, repository templates, code-owners

## Information Architecture

CommitHub separates the platform-wide and personal experiences into distinct,
linked surfaces:

- **Home (`/`)** — the public, community experience for signed-in users:
  a recent public-activity feed plus discovery rails (recent repositories,
  trending repositories, new members, organizations). Everything is served by
  real APIs (`GET /activity`, `GET /discover`); private repository activity is
  never exposed.
- **My Profile / Dashboard (`/dashboard`)** — the current user's personal
  dashboard: profile card (avatar, name, `@username`, bio, joined, followers /
  following) with **Overview / Repositories / Stars / Activity** tabs built from
  the user's own repositories, starred repositories, and user-scoped activity.
- **User profile (`/profile/:id`)** — the same four-tab profile experience for
  any other user. Only **public** repositories and activity are shown unless
  the viewer has access; privacy is enforced server-side.
- **Repository (`/repo/:id`)** — owner + name + description + visibility +
  stars/forks/issues/PRs, and independent file/code browsing.
- **Organization (`/organization/:slug`)** — org profile, members, and teams.

The topbar avatar opens the current user's **Profile → `/dashboard`**, plus
Settings and Logout; the CommitHub logo and the sidebar "home" link return to
the community Home feed.

## Local Demo & Development Seed

A one-shot, idempotent dev seed builds a realistic multi-user sandbox using the
real models and services (no fake React state). It never wipes existing data —
users/repos are found-or-created, so it is safe to re-run.

```bash
cd backend
node seed-dev.js
```

### Seeded accounts

| Username       | Email                | Password            | Rôle                                    |
| -------------- | -------------------- | ------------------- | --------------------------------------- |
| `sanjeevkumar` | sanjeev@example.com  | `DevPassword123!`   | Owner of CommitHub / OpenSource Labs    |
| `alexmorgan`   | alex@example.com     | `DevPassword123!`   | Developer on CommitHub, ADMIN OpenSource Labs |
| `priyasharma`  | priya@example.com     | `DevPassword123!`   | Reporter on task-manager, MEMBER OpenSource Labs |
| `danielchen`   | daniel@example.com   | `DevPassword123!`   | Owner of DevForge org, maintainer ml-playground |
| `emmawilson`   | emma@example.com     | `DevPassword123!`   | ADMIN DevForge, developer chat-server  |

> The script normalizes seeded users' email/password to the values above, so the
> shared password works even if a user already existed.

### What gets seeded

- **17 repositories** (public + private) with real file trees on disk under
  `backend/repo-storage/{ownerId}/{repoId}` (JS, JSX, Python, Go, HTML/CSS,
  JSON, Markdown, `Dockerfile`, `go.mod`, notebooks…) and one real initial
  commit each (created through the native VCS engine).
- **Repository collaborators** across roles (maintainer / developer / reporter /
  read_only), honored server-side.
- **Organizations & teams** — OpenSource Labs (`opensource-labs`) and DevForge
  (`devforge`) with OWNER/ADMIN/MEMBER roles; teams (Frontend Guild, Backend
  Guild, DevOps) with member counts.
- **15 issues** (open/closed, labels, assignees) and **10 pull requests**
  (open/closed/merged, per-repo numbering, source→target branches).
- **Stars & follows**, activity records, and notifications across users — enough
  to exercise every dashboard, feed, and bell.

### Suggested demo walkthrough

1. Log in as `sanjeevkumar` → search `alexmorgan` → open his profile → open
   `task-manager` → browse `src/controllers/taskController.js`.
2. Try to open `alex-private-project` or `expense-tracker` as someone who isn't
   invited — it is denied at the API level.
3. Log in as `alexmorgan` → open `opensource-labs` → **Teams** tab → **People**
   tab (invite members by username, e.g. `danielchen`).
4. As `priyasharma`, open the `task-manager` issue "Fix authentication redirect"
   and comment; log in as `alexmorgan` and reply — both see the thread.
5. Star a public repo, open a PR detail (e.g. CommitHub `#1`), fork a repo, and
   mark notifications as read.
- Kubernetes deployment manifests and horizontal scaling