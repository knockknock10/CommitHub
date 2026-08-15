# Feature 06 – Commit System and Commit History

---

# Status

🟡 Designing

Owner: Sanjeev Kumar

Priority: High

Sprint: 6

---

# Implementation Status (Aug 2026)

The commit system is implemented end to end and integration-tested.

- `POST /api/repositories/:id/commits` creates a commit from the current working tree of the repository and returns its metadata.
- `GET /api/repositories/:id/commits` returns the commit history of the current branch, newest first, with `limit`/`offset` pagination.
- `GET /api/repositories/:id/commits/:commitId` returns a single commit with its changed files.
- `GET /api/repositories/:id/changes` returns the added/modified/deleted changes between the current commit and the working tree.
- Commits live in the repository's `.CommitHub` filesystem bookkeeping (`.CommitHub/commits/<id>/`), extending the existing CLI's storage design. MongoDB is unchanged: it still holds only repository metadata.
- Each commit stores a full immutable snapshot of the working tree under `commits/<id>/snapshot/` plus a `meta.json` with `id`, `message`, `author`, `timestamp`, `parent`, and `files`.
- The commit ID is generated server-side (SHA-1 over the commit metadata, truncated to 12 hex characters); it is never accepted from the client.
- Commit creation is owner-only; history/single-commit/changes follow the existing read rules (public: any authenticated user, private: owner).
- Empty commits are rejected with `400 "No changes to commit"`; messages are validated (required, trimmed, max 200 characters).
- The Repository page gained a Commits tab with a change summary, a commit form (owner only), a clickable history list, and a commit detail view with the changed files.

Verified with an integration test suite: 33 new cases (`backend/tests/commitSystem.test.js`) on top of the existing suites, all passing against a dedicated test database (`commithub_commit_test`) and a temp storage root.

---

# Feature Objective

Repositories currently have files (Feature 05) but no version history: a file's previous state is unrecoverable. This feature adds the first real commit workflow — detect changes, create an immutable commit snapshot, advance the branch reference, and expose the history through the web application. It deliberately stops before branches, checkout, merge, and pull requests.

---

# High-Level Explanation

A repository is a working-tree directory whose version-control bookkeeping lives in a `.CommitHub` folder inside it. Creating a commit diffs the working tree against the snapshot of the current head commit, snapshots the entire working tree into an immutable commit directory, records metadata (message, author, timestamp, parent, changed files), and advances the current branch reference to the new commit. The history is then a parent chain walked from the branch reference. All of this happens on the backend filesystem that already holds the repository; MongoDB continues to store only repository metadata.

---

# Detailed Flow

```
React RepositoryCommits
 ↓  fetchRepositoryChanges / fetchRepositoryCommits / createRepositoryCommit / fetchRepositoryCommit
Repository API (axios, JWT attached by interceptor)
 ↓  GET/POST /api/repositories/:id/commits…  |  GET /api/repositories/:id/changes
Express route (repositoryRoutes.js)
 ↓  protect middleware
authmiddleware.js verifies the Bearer JWT and loads the user
 ↓
commitController.js handler
   1. validate repository ID (400 if malformed)
   2. load Repository (404 if missing)
   3. authorization (write → owner only; read → public/private visibility rules)
   4. validate message (create) or commit ID (read)
   5. resolve repo storage root from (owner, repository._id)
 ↓
repoVersion.js filesystem service
   create:  ensure .CommitHub exists → read current branch + head commit →
            diff working tree vs head snapshot → reject if no changes →
            write snapshot + meta.json → advance refs/heads/<branch> → return metadata
   history: walk parent chain from refs/heads/<branch>, newest first
   single:  read meta.json for the validated commit ID
   changes: diff working tree vs head snapshot
 ↓
JSON response
 ↓
React state update → change summary, commit form result, history list, or detail view
```

---

# Architecture

## Two stores, one meaning

Feature 05 established the split and this feature keeps it:

| Concern | Where it lives |
| --- | --- |
| Repository metadata (name, visibility, owner, stars, forks, branches) | MongoDB `Repository` document |
| Working tree (file bytes) | `<REPO_STORAGE_ROOT>/<ownerId>/<repoId>/` |
| Version-control bookkeeping (HEAD, refs, commits) | `<repoRoot>/.CommitHub/` |

Commits belong in the `.CommitHub` filesystem, not MongoDB, for the same reasons repository files do: commit snapshots are bytes that would hit MongoDB's 16 MB document limit and compete with queries; a commit object is a directory of immutable files that the CLI already models; and keeping commit data next to the tree it snapshots makes the "commit = frozen version of this directory" invariant easy to reason about and cheap to implement.

## Where the logic lives

- `backend/utils/repoVersion.js` — the filesystem version-control service: ensure/init the `.CommitHub` layout, read HEAD and branch refs, walk the working tree, diff, snapshot, create commits, read history and single commits.
- `backend/controllers/commitController.js` — HTTP handlers that reuse the shared validate → load → authorize prelude and call the service.
- `backend/routes/repositoryRoutes.js` — the four new routes.

---

# Data Model

## Commit metadata (`commits/<id>/meta.json`)

```json
{
  "id": "a1b2c3d4e5f6",
  "message": "Add repository browser",
  "author": { "name": "sanjeev", "email": "sanjeev@example.com" },
  "timestamp": 1770000000000,
  "parent": "previous-commit-id",
  "files": [
    { "path": "src/App.jsx", "status": "M" },
    { "path": "src/new.txt", "status": "A" },
    { "path": "old.txt", "status": "D" }
  ]
}
```

- `id` — server-generated SHA-1 over `{author, message, timestamp, parent, changes}`, truncated to 12 hex characters. Deterministic for a given input, not client-supplied, and not a content-address of the snapshot.
- `parent` — the commit ID that `refs/heads/<branch>` pointed to when this commit was created; `null` for the first commit. A linear history (a single parent) is the only relationship this feature produces.
- `files` — the full change list for this commit with `A` (added), `M` (modified), `D` (deleted).
- `timestamp` — `Date.now()` at commit creation (epoch ms).

## Snapshot (`commits/<id>/snapshot/`)

The snapshot mirrors the working-tree layout with relative paths preserved:

```
commits/<id>/
 ├── snapshot/
 │   ├── README.md
 │   └── src/app.js
 └── meta.json
```

The web service stores snapshots under `snapshot/` (the CLI's older flat layout put file copies directly in the commit dir). `getSnapshotRoot` reads `snapshot/` when present and falls back to the commit dir itself, so legacy CLI-style commit dirs can still be diffed.

---

# Working Tree vs Committed State

- **Working tree** — the mutable directory `<REPO_STORAGE_ROOT>/<ownerId>/<repoId>/` (minus `.CommitHub`). This is what Feature 05 browses and what `add`/commit read from.
- **Committed state** — the immutable snapshot at the head commit, i.e. the files under `.CommitHub/commits/<headId>/snapshot/`.

A commit is a frozen copy of the working tree at a moment in time. The two states are physically separate directories, so editing the working tree can never mutate a commit's snapshot. Change detection computes the difference between them; a "clean" working tree means the diff is empty.

---

# Commit Creation Flow

`POST /api/repositories/:id/commits` with `{ "message": "..." }`:

1. **Authenticate** — `protect` middleware verifies the JWT and loads the user.
2. **Verify repository** — validate `id` (400), load the `Repository` document (404).
3. **Authorize** — commit creation is a write, so only the owner may create commits, even in a public repository (matching how `updateRepository`/`deleteRepository` are owner-only). 403 otherwise.
4. **Validate message** — must be a non-empty string after trimming (400 `"Commit message is required"`), at most 200 characters (400).
5. **Ensure bookkeeping** — `ensureVersionControl` idempotently creates `.CommitHub/{commits, staging, refs/heads}`, `HEAD`, and `config.json` if absent (mirroring `init`).
6. **Read the branch reference** — parse `HEAD` (`ref: refs/heads/main`) to get the current branch, then read `refs/heads/<branch>` for the parent commit ID (`null` when empty).
7. **Diff** — compare the working tree against the head snapshot (or treat every file as added when there is no head commit).
8. **Reject empty commits** — if the diff is empty, return 400 `"No changes to commit"`. The server never fabricates an empty commit.
9. **Generate the commit ID** and write the snapshot + `meta.json`.
10. **Advance the reference** — overwrite `refs/heads/<branch>` with the new commit ID. `HEAD` is untouched (it still points at the same branch).
11. **Respond** — 201 with the commit metadata.

Consistency boundary: the commit directory is written first, and only after it is fully written does the branch reference move. If any snapshot/meta write fails, the partial commit directory is deleted and the reference is never advanced — the repository remains at its previous commit. If the reference write itself fails, the unreferenced commit directory is removed best-effort and the error is returned; the branch still points at the previous commit, so the repository is not corrupted (the working-tree changes remain and can be committed again).

---

# Commit History Flow

`GET /api/repositories/:id/commits?limit=50&offset=0`:

1. Authenticate and authorize for read (public → any authenticated user; private → owner).
2. Read the current branch from `HEAD` and the head commit from `refs/heads/<branch>`.
3. Walk the parent chain from the head commit, reading each `meta.json`, collecting `id`, `message`, `author`, `timestamp`, `parent`.
4. Apply `limit` (default 50, max 100) and `offset` while walking; stop once `limit` commits are collected.
5. Return the commits in the natural chain order — newest first, matching the UI.

A corrupt or missing ancestor stops the walk at the first bad commit (the readable prefix is still returned); an empty branch reference returns `[]`.

---

# Storage Design

```
<repoRoot>/.CommitHub/
 ├── HEAD                 "ref: refs/heads/main"
 ├── config.json          { author, currentBranch, remotes }   (CLI compat)
 ├── staging/             CLI staging area (unused by web commits)
 ├── refs/heads/
 │   └── main             current commit ID
 └── commits/
     └── <commitId>/
         ├── snapshot/    immutable copy of the working tree
         └── meta.json    commit metadata
```

This reuses the layout `init` already creates (commits, staging, refs/heads, HEAD, config.json). The web layer only adds the `snapshot/` subdirectory and richer `meta.json`; it does not invent a parallel bookkeeping structure.

---

# Immutability

A commit directory is written once and never modified afterward:

- The snapshot is a byte-for-byte copy of the working tree at commit time; later edits to the working tree change different paths, so the snapshot cannot drift.
- The commit directory lives inside `.CommitHub`, which is excluded from change detection and from the Feature 05 tree listing — a commit never becomes part of a future commit's input.
- Reads only ever open the file; no endpoint mutates an existing commit.

This invariant is enforced structurally (separate directories, copy-on-commit) rather than by locking, and is verified by a test that modifies the working tree after a commit and asserts the old snapshot is unchanged.

---

# HEAD and branch-reference behavior

- `HEAD` (`ref: refs/heads/main`) says *which branch is checked out*. It does not change when a commit is created.
- `refs/heads/<branch>` holds *the commit the branch points to*. Creating a commit overwrites this file with the new commit ID; the parent of the new commit is the previous value.
- The current branch is derived from `HEAD` (split on the last `/`), so branch creation/checkout (future features) only need to write different files in this layout.
- The CLI's `config.json` also records `currentBranch`, but the web service derives the branch from `HEAD`, matching Git and the CLI's own `branch` controller.

---

# Authorization

- Commit creation (`POST .../commits`) — owner only, for both public and private repositories. This matches the existing write-operation rule (`updateRepository`, `deleteRepository`).
- History (`GET .../commits`), single commit (`GET .../commits/:commitId`), and changes (`GET .../changes`) — read rules: public repositories are readable by any authenticated user, private repositories by the owner only.
- Authentication always comes first via the existing `protect` middleware; no new JWT machinery was added.

---

# Security

- **Repository path** — all filesystem access goes through `getRepoRoot(owner, repository._id)`; paths are never built from client input for commit operations.
- **Commit IDs** — validated against `/^[0-9a-f]{4,40}$/i` before any path join, so `../`, absolute paths, and non-hex values are rejected with `400` and can never escape the commits directory.
- **Commit messages** — validated (required, trimmed, max length); the message is only ever written as a string inside `meta.json`.
- **No client-supplied file paths** — the changed-file list is derived by walking the working tree on the server; nothing from the request is joined into a filesystem path.
- **Symlinks** — the working-tree walker only descends into real directories and only snapshots regular files (`dirent.isFile()`), so a symlink cannot smuggle an out-of-tree target into a snapshot.
- **`.CommitHub` exclusion** — bookkeeping is never snapshotted and never appears as a change.
- **Failure surface** — filesystem errors are mapped to `500 "Server error"`; no stack traces are returned.

---

# Error handling

| Case | Status |
| --- | --- |
| No token / invalid token | 401 |
| Malformed repository ID | 400 |
| Repository not found | 404 |
| Commit by a non-owner (public or private) | 403 |
| Missing or empty commit message | 400 |
| Message longer than 200 characters | 400 |
| No changes to commit (empty commit) | 400 |
| Invalid commit ID (non-hex, too short, traversal) | 400 |
| Commit not found | 404 |
| Corrupted commit metadata | 500 |
| Filesystem error during commit | 500 (partial commit dir removed) |
| Branch/HEAD update failure | 500 (commit dir removed, ref unchanged) |

---

# Edge cases

Handled and covered by tests:

- First commit: no head commit → every working-tree file is `A`, `parent: null`.
- Empty repository → `No changes to commit`.
- Commit after commit with no edits → `No changes to commit`.
- Modified file produces `M`; the new snapshot has the new content and the old snapshot keeps the old content.
- Deleted file produces `D`; the new snapshot omits it.
- Nested directories snapshot with their relative paths intact.
- History is newest first; `limit`/`offset` are honoured.
- A corrupt `meta.json` stops history at the readable prefix and returns 500 for the direct single-commit read.
- A missing ancestor commit stops the history walk instead of throwing.
- `.CommitHub` never appears in commits or changes.
- Private repository history/changes are 403 for non-owners; public repository history is readable by any authenticated user.

---

# Design decisions

## Why commits stay in `.CommitHub` and not MongoDB

The Feature 05 split already says MongoDB is metadata and bytes live on disk. Commits are bytes (snapshots) plus a small metadata record. Putting either in MongoDB either blows the document limit or forces the DB to serve bytes it does not own; keeping commits in `.CommitHub` also means the CLI and the web share one commit store, and immutability is guaranteed by the filesystem. A MongoDB `Commit` collection would duplicate a source of truth that already exists.

## Why a full working-tree snapshot per commit

The CLI's `commit` copies only staged files; the web has no staging UI, so the first slice snapshots the entire working tree at commit time. This makes every commit independently readable and change detection trivial, at the cost of storing duplicates of unchanged files — acceptable at teaching scale, and the future content-addressable design removes the duplication.

## Why the web commits everything (no web staging)

The CLI already has `git add`-style staging, but the web API has no way to stage files yet (files can only be created through the CLI or directly on disk). Rather than pretend staging exists, web commits include all working-tree changes — equivalent to `git commit -a`. Documented as a limitation; a future staging API can reuse the existing `staging/` directory.

## Why commit creation is owner-only for public repositories too

Writes on this platform are owner-only (`updateRepository`, `deleteRepository`). Any authenticated user could already read a public repo; allowing them to write commits would be a new collaboration model that belongs to a future "contributions/forks" feature, not this one.

## Why `commits/<id>/snapshot/` instead of files directly in the commit dir

Preserving relative paths requires a subdirectory (the CLI's flat copy could not handle nested files, and files named `meta.json` would collide with the metadata file). `getSnapshotRoot` keeps compatibility with legacy flat commit dirs.

## Why SHA-1 over metadata, truncated

Preserves the existing hash-based commit-ID approach while making the ID deterministic for identical inputs, server-controlled, and short enough to display. It is not a content-address of the snapshot, which is documented as future work.

## Why pagination is `limit`/`offset`

The existing API style is simple REST; `limit`/`offset` is enough for a repository with a handful of commits. The walk is linear anyway (each ancestor read is one small JSON file). A cursor/keyset design is the documented scaling path for long histories.

---

# Testing

Run with `npm test` in `backend/` (`node --test tests/*.test.js`).

`backend/tests/commitSystem.test.js` (33 cases) covers:

Commit creation:

- `401` without a token; `400` malformed ID; `404` missing repository
- `403` for a private repository and for a public repository committed by a non-owner
- missing message, empty (whitespace-only) message, oversized message → `400`
- commit with an added file: metadata (`id`, `message`, `author`, `timestamp`, `parent: null`, `files`)
- nested files snapshot with structure preserved
- parent recorded on a follow-up commit
- modified file detected (`M`) with both snapshots correct
- deleted file detected (`D`)
- `400 "No changes to commit"` for a fresh empty repo and after a successful commit
- immutability: snapshot unchanged after later working-tree edits
- branch reference advanced to the new commit ID
- `.CommitHub` bookkeeping excluded from commits

Commit history:

- empty history → `[]`
- newest-first order with correct metadata and parent links
- `limit` and `offset` honoured
- public history readable by another authenticated user; private history → `403`

Single commit:

- returns `id`, `message`, `author`, `timestamp`, `parent`, `files`
- invalid ID → `400`; too-short ID → `400`; encoded path-traversal ID → `400`
- missing commit → `404`
- corrupted `meta.json` → `500`

Working-tree changes:

- added/modified/deleted reported in one list
- clean working tree → `[]`
- private repository changes → `403` for a non-owner

Actual results at review time: 33/33 new cases pass, and the full backend suite passes 115/115 (55 repository-management + 27 content + 33 commit-system).

---

# Known limitations

- No web staging: web commits include every working-tree change (`git commit -a` semantics). The CLI's `staging/` directory is untouched but not consumed by the web layer.
- Commit IDs are not content-addressed; identical blobs are duplicated across snapshots. The metadata-based SHA-1 ID is deterministic but does not deduplicate.
- No locking: two concurrent commit requests could both read the same parent and the last ref write would win, orphaning the other commit directory. Acceptable for a single-user teaching platform; a per-repo lock is the fix.
- No merge commits or multi-parent commits; history is strictly linear.
- The CLI's own `log`/`status` commands are internally inconsistent with this layout (they read `commit.json`/`branches/`), which is pre-existing and out of scope; the web API is the consistent reader.
- Symlinks are excluded from snapshots and change detection.
- No per-commit file browsing yet: the Feature 05 browser still reads the working tree (the `snapshot/` layout was chosen so it can later point at a commit).

---

# Future improvements

- Content-addressable storage: store each blob once, keyed by its SHA-1, and have the snapshot reference blob IDs — true deduplication and Git-like objects.
- Per-commit file browsing: pass an optional commit reference to the tree/file endpoints and read from `commits/<id>/snapshot/`.
- Web staging: a file-selection UI backed by the existing `staging/` directory.
- Branches, checkout, and merge on top of `refs/heads/` (already a branch-reference layout).
- Diff between two commits (compare two snapshots, reuse the change detector).
- Cursor-based pagination and a commit index for very long histories.
- Author config via the repository `config.json` when the platform adds multiple authors.

---

# Open questions

**Should web commits respect CLI staging when it exists?**

Today the web layer ignores `staging/`. If a CLI user stages files and then commits from the web, the web commit includes everything. A future staging-aware mode could read the staging set first.

**Should non-owners be able to contribute commits to public repositories?**

This is a product decision, not a technical one. The plumbing (per-user author metadata) already supports it; the authorization rule would change from owner-only to a contribution model.

---

# Interview Preparation

See `qs.md` (Feature 06 section, Q11 onward) for model answers based on this implementation.
