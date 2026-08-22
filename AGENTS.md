# AGENTS.md

Guidance for AI coding agents working in this repository.

## Repository layout

- `backend/` — Express + Mongoose, ES modules (`.js` with `import`/`export`). Entry: `backend/server.js` (imports `config/db.js`, which connects via `process.env.MONGO_URI`).
- `commithub-frontend/` — React + Vite. Axios instance with JWT interceptor lives in `src/api/axios.js`; feature API modules live in `src/api/`.
- `docs/01_System_Design/` — one `Feature_NN_*.md` per feature plus `qs.md` (interview Q&A). This directory is gitignored.
- No TypeScript. Do not add new dependencies unless asked.

## Commands

Backend (from `backend/`):

- Run the full test suite: `node --test tests/*.test.js`
- Run one suite: `node --test tests/activitySystem.test.js`
- Lint frontend: `npm run lint` (from `commithub-frontend/`)
- Build frontend: `npm run build` (from `commithub-frontend/`)
- There is no separate typecheck step; the build is the compile check.

## Testing conventions

- Tests are HTTP integration tests: each file spawns the real Express app on a random port and drives it with `fetch` using real JWT auth.
- Tests connect to the shared Mongo instance using `MONGO_URI_TEST || MONGO_URI` with the database name replaced per file (e.g. `commithub_activity_test`, `commithub_branch_test`). Never point a test at the `commithub` production database.
- Repos write files to a temp `REPO_STORAGE_ROOT`, set before any repoStorage-dependent module is imported.
- Keep the full suite green after any change (`node --test tests/*.test.js`).

## Backend conventions

- Every protected route goes through `protect` (`middleware/authmiddleware.js`), which verifies the Bearer JWT and loads `req.user`.
- Repository authorization is centralized in `backend/utils/repoAccess.js`: `authorizeRepository(req, res, writeOperation)`. Read access = owner OR public; write access = owner only. It writes the 403/404 response itself; return early when it returns falsy.
- Controllers use the pattern: try → `authorizeRepository` → validate → perform operation → `createNotification`/`createActivity` (best-effort, never awaited for success) → respond. Errors go through `catch (error)` returning `res.status(500).json({ message: "Server error" })` (or a specific status).
- Side-effect services (`backend/utils/activityService.js`, `backend/utils/notificationService.js`) are best-effort by design: they never throw and never fail the primary operation. `createActivity` requires `actor` (always `req.user._id`) + `repository` + a valid `ACTIVITY_TYPES` enum value; anything invalid returns `null`.
- Filesystem commit engine lives in `backend/utils/repoVersion.js` (`.CommitHub/` refs under the storage root); `backend/utils/repoStorage.js` resolves repo roots.

## Feature-specific facts

- **Activity feed (Feature 11)**: `GET /api/activity` (global user feed) and `GET /api/repositories/:id/activity`. Global feed scope is exactly **owned ∪ public** — starred/participated/followed repos are deliberately excluded (starring is not an access grant; a repo made private after being starred would otherwise leak). The `type` filter accepts a comma-separated list (`type=ISSUE_CREATED,ISSUE_COMMENTED` → `$in`); invalid values → 400. Ordering is `{ createdAt: -1, _id: -1 }`. Duplicate events are prevented at the controller: star only on `modifiedCount === 1`, merge only once, `RELEASE_PUBLISHED` only on a draft→published transition.
- **Notifications (Feature 10)**: recipient-specific and independent from activity; one event can produce both.
- **Pull requests (Feature 12)**: routes under `/repositories/:id/pull-requests` (number is repo-scoped, looked up as `{ repository, number }`). Authorization: read actions = owner-or-public; update/close/reopen = author-or-owner; **merge = owner only** (`authorizeRepository(req, res, true)`). Duplicate open PRs for the same branch pair are rejected by a pre-check *and* a partial unique index (`{repository, sourceBranch, targetBranch}` filtered to `status: "open"`); the pair is reusable after close/merge. Numbers come from an atomic `$inc` on `Repository.prCount` before insert; rejected creates never burn a number. `reviewState` is derived at read time from embedded reviews (changes_requested > approved > commented > pending), never stored. Merge is a real fast-forward (`fastForwardMerge`); diverged → 409 with the PR left open, no fake/three-way merge. Close/reopen emit `PR_CLOSED`/`PR_REOPENED` activity + notifications. List endpoint stays lean: it strips `reviews`/`comments` bodies but reports `reviewState`. Indexes: unique `{repository, number}`, plus `{repository, status, number: -1}` for the list query.

## Frontend conventions

- Feature API modules in `src/api/` wrap the shared axios instance.
- Shared presentational logic lives in `src/utils/` (e.g. `activityUtils.js`).
- Routing: issues deep-link to `/issues/:id`; PRs/tags/releases/commits/branches have no deep routes — link to `/repo/:id` and pass `location.state?.tab`, which `RepositoryPage` consumes to initialize its active tab.
- Reuse the existing design system (`src/styles/activity.css`, `dashboard.css`, `repository.css`). Relative-time formatting is already established in repo list components.

## Repo/workflow gotchas

- The repo uses many small feature branches (`feat/*`, `feature/*`, `wip/*`). Check `git branch --show-current` before assuming the working tree matches what you last saw — work is frequently committed and branches switched outside the agent session.
- Do not run `git push`, open PRs, or merge unless explicitly asked. Commits may be made by the human as you work; preserve uncommitted work before any branch switch (back up to `/tmp` if a single file blocks a checkout).
- `.env` (cloud `MONGO_URI`) is gitignored; never log or commit secrets. Prefer `mongodb://admin:password@localhost:27017` (local Docker Mongo) for any live smoke test.
- Update `docs/01_System_Design/Feature_NN_*.md` and `qs.md` as part of feature work — document only what actually exists.

## Documentation conventions

- Feature docs use numbered `## 1. Objective` … sections (see `Feature_11_Activity_Feed.md`).
- `qs.md` questions follow `# Q##. <question>` with `## High-Level Explanation` and `## Interview Closing Statement` sections, ending with `# Feature NN Interview Closing Statement`. Always state the direct answer, the reasoning, trade-offs, failure scenarios, and scalability path.
