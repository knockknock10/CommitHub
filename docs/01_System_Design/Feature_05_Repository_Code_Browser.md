# Feature 05 – Repository Code Browser

---

# Status

🟡 Designing

Owner: Sanjeev Kumar

Priority: High

Sprint: 5

---

# Implementation Status (Aug 2026)

Repository code browsing is implemented end to end and integration-tested.

- `GET /api/repositories/:id/tree?path=<dir>` returns the entries (folders first, then files, alphabetically) of a directory inside the repository working tree.
- `GET /api/repositories/:id/file?path=<file>` returns a single file's contents, name, path, and size.
- Both endpoints reuse the existing JWT `protect` middleware and the existing public/private visibility model: any authenticated user can read a public repository, only the owner can read a private one. Public repositories still require authentication, matching the existing security model.
- Repository files live on the backend filesystem in a per-repository working-tree directory (`repo-storage/<ownerId>/<repoId>/`), not in MongoDB. MongoDB keeps only metadata.
- Paths are resolved with a strict safe-path resolver that rejects `../`, absolute paths, backslash traversal, NUL bytes, and any resolved path that escapes the repository root, plus a realpath containment check that blocks symlink escapes.
- Files larger than 1 MB return `413` instead of being read into memory; binary files return `400`.
- Creating a repository now creates its storage directory; deleting a repository removes it.
- The Repository page Code tab renders a real file browser (breadcrumbs, folder navigation, file viewer) instead of the "coming soon" placeholder.

Verified with an integration test suite: 27 new cases (`backend/tests/repositoryContent.test.js`) plus the 55 existing repository-management cases, 82/82 passing, against dedicated test databases (`commithub_test` and `commithub_content_test`).

---

# Feature Objective

The Code tab of a repository currently tells the user "coming soon". This feature makes it show the repository's actual contents: a file tree, folder navigation, and a file viewer. The browser must read the same files the CommitHub CLI works with, and it must do so without letting a request escape the repository's filesystem boundary.

---

# High-Level Explanation

Each MongoDB `Repository` document maps to a dedicated working-tree directory on the backend filesystem at a deterministic path derived from the owner and repository IDs. The Code tab asks the backend for the entries of a directory (`tree`) or the contents of a file (`file`); the backend authenticates the user, verifies they may view the repository, resolves the requested path safely against the repository root, and reads from the working tree. The MongoDB document remains the metadata record (name, visibility, owner, stars, forks, branches) and is never treated as a store of file contents. Because the CLI's `.CommitHub` metadata lives inside the same working tree, CLI and web UI share one representation of a repository's files.

---

# Detailed Flow

```
React RepositoryCode
 ↓  fetchRepositoryTree / fetchRepositoryFile
Repository API (axios, JWT attached by interceptor)
 ↓  GET /api/repositories/:id/tree?path=...  or  GET /api/repositories/:id/file?path=...
Express route (repositoryRoutes.js)
 ↓  protect middleware
authmiddleware.js verifies the Bearer JWT and loads the user
 ↓
repoController.js handler
   1. validate repository ID (400 if malformed)
   2. load Repository (404 if missing)
   3. authorization: private repos are owner-only (403 otherwise)
   4. resolve requested path against repo root with safe-path rules (400 on traversal)
   5. stat the target (404 if missing; empty repo root → empty tree)
   6. realpath containment check (400 if a symlink escapes the root)
   7. read the directory or the file
 ↓
JSON response
 ↓
React state update → breadcrumbs, file list, or `<pre>` viewer
```

---

# Architecture

## MongoDB repository metadata vs actual repository files

The `Repository` document (backend/models/repoModel.js) holds metadata only:

```
name, description, visibility, owner, stars, forks, branches
```

Actual file contents live on the backend filesystem in a per-repository working tree:

```
<REPO_STORAGE_ROOT>/<ownerId>/<repoId>/
```

- `REPO_STORAGE_ROOT` defaults to `process.cwd()/repo-storage` (i.e. `backend/repo-storage` when the server runs from `backend/`) and can be overridden with the `REPO_STORAGE_ROOT` environment variable (tests use a temp directory).
- The path is derived from `repository.owner` and `repository._id`, both of which are stable. Renaming a repository does not change its storage directory, and no schema change is required.
- The repository root is created when a repository is created and removed when it is deleted, so the document and the working tree share one lifecycle.
- The CLI and the web UI share this representation: the browser reads the working tree, and the CLI (`commithub init/add/commit/...`) operates on the same tree when run inside it, writing its bookkeeping into `<repoRoot>/.CommitHub`, which the browser hides from the file list (mirroring how `.git` is hidden).

This keeps MongoDB small (no giant file arrays, which would hit the 16 MB document limit and force the database to serve bytes it should not own), keeps file I/O on the filesystem where it belongs, and leaves room to move storage to S3 later without touching the API contract.

## Why not store files in MongoDB

Storing repository files as arrays inside the Repository document does not scale: documents are capped at 16 MB, every read/write rewrites the whole document, and bytes would compete with queries for working set and bandwidth. A filesystem (today) or object storage such as S3 (later) is the correct home for file blobs; MongoDB's job is the metadata and relationships.

---

# Security

## Authentication

Every tree/file route is wrapped in the existing JWT `protect` middleware (backend/middleware/authmiddleware.js). Missing, invalid, or expired tokens return `401` before any controller logic runs.

## Authorization

The controller enforces the same visibility model as `getRepositoryById`: a public repository is readable by any authenticated user; a private repository is readable only by its owner (`repository.owner.toString() === req.user._id.toString()`), otherwise `403`. No new authorization machinery was added, and the existing limitation is preserved — public repositories still require an authenticated session, exactly like the rest of the API today.

## Path validation

The request supplies a relative path in the `path` query parameter. `resolveRepoPath` in `backend/utils/repoStorage.js` rejects, with `400`:

- non-string or empty-after-trim inputs (empty string resolves to the repository root)
- paths containing a NUL byte
- absolute paths (`/...`, `\...`) and Windows-style drive prefixes (`C:`)
- any segment equal to `..` (both `/` and `\` separators)

It then re-verifies containment with `path.relative`: the resolved absolute path must be the root itself or a descendant of it.

## Path traversal prevention (`../../`)

The `..` segment is rejected before any filesystem call, so `../../.env`, `../../../etc/passwd`, `..\..\..\windows`, and URL-encoded variants (`%2e%2e%2f`) all return `400`. Express decodes percent-encoding before the controller sees the value, so encoded traversal is still caught by the same check.

## Filesystem boundary

Two independent layers enforce the boundary:

1. Lexical containment — the resolved path must stay under the repository root (checked in `resolveRepoPath`).
2. Real-path containment — after the target is known to exist, `assertRealPathWithin` resolves the repository root and the target with `fs.realpathSync` and requires the real target to remain under the real root. This blocks symlink escapes: a symlink inside the repo pointing to `../.env` resolves outside the root and returns `400`.

The controller never builds a filesystem path from the frontend value directly; it always goes through these checks first.

---

# Edge Cases

Handled by the implementation and covered by tests:

- No token / invalid token → `401`
- Malformed repository ID → `400`
- Repository does not exist → `404`
- Private repository requested by a non-owner → `403`
- Empty repository (no storage directory) → `200` with `entries: []`
- Requested directory does not exist → `404`
- Requesting a tree whose path points to a file → `400`
- Requesting a file whose path points to a directory → `400`
- Requesting a file with no `path` → `400`
- File does not exist → `404`
- `..` traversal, absolute path, backslash traversal, encoded traversal → `400`
- Symlink inside the repository that escapes the root → `400`
- File larger than 1 MB → `413`
- Binary/unreadable file (contains NUL bytes) → `400`
- The CLI bookkeeping directory `.CommitHub` is omitted from the tree
- Storage directory creation/removal failures → repository create/delete still behaves correctly (`500` on create failure with the document rolled back; delete best-effort)

---

# Design Decisions

## Why per-repository directories keyed by `(ownerId, repoId)` instead of a schema field

The repository ID is the natural primary key and is stable across renames, so deriving the path avoids a schema migration, keeps the mapping deterministic, and cannot drift from the database. It also gives a cheap first level of physical isolation between owners.

## Why the browser reads the live working tree instead of commit snapshots

There are no web-facing commits yet, and the feature deliberately does not implement commits/branches. The working tree is the source of truth that already exists and that the CLI writes to, so it is the honest thing to browse. Commit-snapshot browsing is documented as future work.

## Why two endpoints (`tree` and `file`) instead of one

A single endpoint that returns either a listing or content would conflate two different shapes and force the frontend to guess. Two small, single-purpose endpoints match the existing REST style of the repository routes.

## Why folders sort before files

Matching GitHub and the file lists already sketched in the UI keeps navigation predictable; both groups sort alphabetically.

## Why a 1 MB limit instead of streaming

Streaming/range reads are a production concern; for this slice a hard cap keeps responses bounded and prevents an enormous file from being slurped into memory and over the wire. `413` tells the user the file is known but not viewable yet, which is a better outcome than a hung tab.

## Why `.CommitHub` is hidden

It is CLI bookkeeping, not user content — the equivalent of `.git`. Hiding it means the web browser and the CLI present the same logical file list.

## Why create/delete touch the storage directory

The working tree is a derived artifact of the repository document. Creating the directory on create and removing it on delete keeps the two in sync; a leftover directory after delete would be an unreferenced orphan, and a missing directory on create would mean the browser has nothing to show.

## Why authorization is re-checked in the controller

Same rationale as the rest of the API: the frontend only controls what is rendered; the backend is the security boundary. Both endpoints repeat the validate → load → authorize prelude that the other repository handlers already use.

---

# Testing

Run with `npm test` in `backend/` (`node --test tests/*.test.js`).

`backend/tests/repositoryContent.test.js` (27 cases) covers, per endpoint:

Tree:

- `401` without a token; `400` malformed ID; `404` missing repository
- `403` private repository for a non-owner; public repository readable by any authenticated user; owner reads their private repository
- empty repository → `entries: []`
- folders first then files, alphabetical; entries carry `name`, `type`, `path`, and `size` for files
- nested directory listing via the `path` query parameter
- missing path → `404`; path points to a file → `400`
- `../` traversal → `400`; absolute path → `400`; backslash traversal → `400`

File:

- `401` without a token; `400` malformed ID; `404` missing repository
- `403` private repository for a non-owner; public file readable by any authenticated user
- no `path` → `400`; missing file → `404`; path is a directory → `400`
- `../` traversal → `400`; path outside the repository root (absolute path) → `400`
- file larger than the limit → `413`; binary file → `400`
- file reached through a symlink escaping the repository → `400`

Actual results at review time: 27/27 new cases pass, and the full backend suite passes 82/82 (55 existing repository-management + 27 new).

---

# Future Improvements

- Syntax highlighting for the file viewer
- Large-file streaming / range requests instead of the 1 MB cap
- Commit history and per-commit file snapshots wired into the browser
- Branch switching (the browser reads the working tree of the checked-out branch)
- Git-style tree snapshots so the browser can show any commit's contents, not just the live working tree
- S3-backed repository objects, with the file endpoints reading from object storage instead of the local disk
- Pagination and lazy loading for very large directories (the current listing stats every file for sizes, which is fine for teaching scale but not for millions of files)
- Caching of tree listings (invalidation on commit) to avoid repeated directory scans
- Public (unauthenticated) repository browsing, once the platform adopts a public-access model
- An upload/add-file API so files can be created from the web UI rather than only by the CLI

---

# Open Questions

**Should repository contents be versioned by commit snapshot in the browser?**

Today the browser shows the live working tree. Once commits are implemented, the Code tab should display the tree as of a selected commit/branch rather than the mutable working directory, with write paths still targeting the working tree.

**Should the 1 MB limit be configurable?**

A small env-driven cap would make the limit tunable per deployment without code changes; the constant is centralized in `utils/repoStorage.js` for now.

**Should hidden entries beyond `.CommitHub` be filtered?**

`.git` and other dot-directories are currently shown as ordinary folders. Filtering a known list (`.git`, `.svn`) would match GitHub more closely; it is intentionally out of scope for this slice.

---

# Interview Preparation

See `qs.md` for the model answers for this feature.
