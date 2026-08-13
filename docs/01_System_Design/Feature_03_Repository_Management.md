# Feature 03 – Repository Management

---

# Status

🟡 Designing

Owner: Sanjeev Kumar

Priority: High

Sprint: 3

---

# Implementation Status (Aug 2026)

Repository management is implemented across the full lifecycle and integration-tested.

- `POST /api/repositories` creates a repository owned by the authenticated user, initializes it with a `main` branch, and links it into the owner's `repositories` array.
- `GET /api/repositories` returns the authenticated user's repositories (newest first).
- `GET /api/repositories/:id` returns one repository with `isOwner` and `isStarred` flags; public repositories are readable by any authenticated user, private repositories only by their owner.
- `PATCH /api/repositories/:id` lets the owner update the repository name, description, and visibility using an explicit allowed-field whitelist. A non-owner gets `403`.
- `DELETE /api/repositories/:id` lets the owner delete the repository. The delete cascades to the repository's issues and comments and removes the repository ID from every user's `starRepo` and `repositories` arrays. A non-owner gets `403`.
- `PATCH /api/repositories/:id/star` and `PATCH /api/repositories/:id/unstar` are idempotent; the repository `stars` count can only change when the user's `starRepo` array actually changes.
- The Repository page gained an owner-only Settings tab with an edit form (name, description, visibility) and a Delete repository danger zone that requires typing the repository name before deletion.

Verified with an integration test suite (55/55 cases passing, final run) against a dedicated test MongoDB database (`commithub_test`).

---

# Feature Objective

Users need to manage their repositories end to end: create them, list and read them, rename them, change the description, toggle public/private visibility, star or unstar them, and delete the ones they no longer want. This feature exposes those operations through the API and the existing Repository page while keeping every mutation restricted to the owner.

---

# High-Level Explanation

When a user creates a repository, the backend takes the owner from the authenticated session (never from the request body), validates the name/description/visibility, writes the document, and links it to the owner. Listing and reading reuse the same authentication and, for private repositories, ownership checks.

When the owner opens a repository, the backend returns the repository together with `isOwner` and `isStarred` flags. The frontend uses `isOwner` to render the Settings tab and `isStarred` to render the Star button.

In Settings, the owner can edit the name, description, and visibility. Saving sends a `PATCH` request; the backend authenticates the user, verifies ownership, whitelists the allowed fields, validates their values, and persists the changes. The Star button sends `PATCH /star` or `PATCH /unstar`, which atomically update the user's `starRepo` array and keep the repository count in sync.

Deleting requires a two-step confirmation in the UI (the user types the repository name). The `DELETE` request verifies ownership again, then removes the repository and everything that references it: its issues, their comments, and the repository ID held in any user's `starRepo` / `repositories` arrays.

---

# Detailed Flow

## Create

### Step 1 – Form

The user fills in the Create Repository form (`CreateRepoModal`) and submits.

### Step 2 – API Request

`createRepository(formData)` → `POST /api/repositories`.

### Step 3 – Route

`repositoryRoutes.js` matches the request and runs the `protect` middleware.

### Step 4 – Middleware

`authmiddleware.js` verifies the `Bearer` JWT and loads the user (`401` if missing, invalid, expired, or the user no longer exists).

### Step 5 – Controller

`createRepository` in `controllers/repoController.js`

- validates the name (non-empty string), description (string if present), and visibility (`public`/`private`)
- checks for a duplicate name owned by the same user (`400`)
- creates the document with `owner: req.user._id` and `branches: ["main"]`
- adds the repository ID to the owner's `repositories` array
- returns `201` with the created repository

### Step 6 – Database

MongoDB stores the `Repository` document; `User.repositories` is updated.

### Step 7 – Response / UI

The frontend navigates to the dashboard, which lists the user's repositories from `GET /api/repositories`.

---

## Read (list and by ID)

### Step 1 – Page Load

The Dashboard calls `fetchRepositories()` → `GET /api/repositories`; the Repository page calls `fetchRepositoryById(id)` → `GET /api/repositories/:id`.

### Step 2 – Route + Middleware

Both routes run `protect` first.

### Step 3 – Controller

- `getRepositories` returns `Repository.find({ owner: req.user._id })` sorted by `createdAt` descending.
- `getRepositoryById` validates the ID (`400`), loads the repository (`404`), computes `isOwner` and `isStarred`, and returns `200` for public repositories or the owner; a private repository requested by a non-owner returns `403`.

### Step 4 – Response / React state update

The page stores the repository plus `isOwner`/`isStarred` and renders the header, stats, tabs, Star button, and (for the owner) the Settings tab.

---

## Update

### Step 1 – Page Load

The Settings tab shows the edit form pre-filled from the repository document.

### Step 2 – Save

The user changes a field and clicks Save.

`updateRepository(id, formData)` → `PATCH /api/repositories/:id`.

### Step 3 – Route + Middleware

`protect` authenticates the user (`401` without a token).

### Step 4 – Controller

`updateRepository` then

- validates the repository ID (`400` if malformed)
- loads the repository (`404` if missing)
- checks ownership: a non-owner gets `403`
- picks out only the allowed fields (`name`, `description`, `visibility`) from the request body
- validates each provided value (`400` on empty or non-string name, duplicate name for the same owner, or a visibility other than `public`/`private`)
- applies the changes with `repository.set(updates)` and `save()`, which run the schema validators
- returns `200` with the updated repository (owner populated)

### Step 5 – UI Update

The frontend replaces its repository state with the response, so the header, badge, and stats reflect the new name, description, and visibility immediately.

---

## Star / Unstar

### Step 1 – Click

The user clicks the Star button on the repository page.

### Step 2 – API Request

`starRepository(id)` / `unstarRepository(id)` → `PATCH /api/repositories/:id/star` or `.../unstar`.

### Step 3 – Route + Middleware

`protect` authenticates the user.

### Step 4 – Controller

- `starRepository` validates the ID (`400`), loads the repository (`404`), and blocks non-owners from starring private repositories (`403`). It runs `$addToSet` on the user's `starRepo` and increments the repository `stars` only when the array actually changed, so double-starring cannot double-count.
- `unstarRepository` runs `$pull` on `starRepo` and decrements `stars` only when something was removed; repeated unstar cannot drive the count below zero. No visibility check is applied, so a user can always remove a repository from their own list.

### Step 5 – Response / UI

The response returns the new `stars` count and `isStarred`, which the page uses to update the button without a reload. On failure the page shows an inline error instead of failing silently.

---

## Delete

### Step 1 – Danger Zone

The owner scrolls to the Danger Zone and clicks Delete repository.

### Step 2 – Confirmation

A confirmation panel appears asking the user to type the exact repository name; the destructive button stays disabled until it matches.

### Step 3 – API Request

`deleteRepository(id)` → `DELETE /api/repositories/:id`.

### Step 4 – Route + Middleware

`protect` authenticates the user.

### Step 5 – Controller

`deleteRepository` then

- validates the repository ID (`400` if malformed)
- loads the repository (`404` if missing)
- checks ownership (`403` for a non-owner)
- collects the repository's issues
- deletes the comments on those issues
- deletes the issues
- pulls the repository ID from every user's `starRepo` and `repositories` arrays
- deletes the repository document
- returns `200` with `{ message: "Repository deleted" }`

### Step 6 – UI After Delete

The frontend navigates to the dashboard, which now lists the user's remaining repositories.

---

# Database Design

Actual models (from `backend/models`):

```
User
 ├── userName          String (unique)
 ├── email             String (unique)
 ├── repositories      [ObjectId] → Repository
 └── starRepo          [ObjectId] → Repository

Repository
 ├── name              String (required)
 ├── description       String (default "")
 ├── visibility        "public" | "private" (default "public")
 ├── owner             ObjectId → User (required)
 ├── stars             Number (default 0)
 ├── forks             Number (default 0)
 └── branches          [String]

Issue
 ├── title             String (required)
 ├── description       String (required)
 ├── status            "open" | "closed" (default "open")
 ├── repository        ObjectId → Repository (required)
 ├── label             String (enum)
 ├── author            ObjectId → User
 └── assignee          ObjectId → User

Comment
 ├── content           String (required)
 ├── author            ObjectId → User (required)
 └── issue             ObjectId → Issue (required)
```

Relationships:

- `Repository.owner` → `User`. A user can own many repositories (`User.repositories` mirrors this back-reference).
- `User.starRepo` → `Repository`. A user can star many repositories; `Repository.stars` is the denormalized count.
- `Issue.repository` → `Repository` (required). An issue cannot exist without its repository.
- `Comment.issue` → `Issue` (required). Comments hang off issues, not directly off repositories, so they cascade through the issue.

Cascade behavior on `DELETE /api/repositories/:id` (all handled manually in the controller — the schema has no cascade hooks):

1. `Comment.deleteMany({ issue: { $in: issueIds } })` — comments of the repository's issues.
2. `Issue.deleteMany({ repository: repository._id })` — the issues themselves.
3. `User.updateMany({}, { $pull: { starRepo, repositories } })` — removes the repository ID from every user document, so no dangling references survive.
4. `Repository.findByIdAndDelete` — the repository document.

The repository ID is stable (renaming does not change `_id`), so issues and stars stay attached across a rename.

---

# Authorization

## Authentication

Every repository route is wrapped in the JWT `protect` middleware. A request without a token, or with an invalid/expired token, returns `401` before any controller logic runs. The middleware loads the user document and attaches it to `req.user`; if the token is valid but the user no longer exists, it also returns `401`.

## Ownership

Mutations re-check ownership inside the controller: `repository.owner.toString() === req.user._id.toString()`. A non-owner gets `403` for `PATCH`, `DELETE`, and for reading or starring private repositories.

## Backend is the security boundary

The backend derives the owner exclusively from the authenticated session. The request body can never choose or overwrite `owner` — `createRepository` uses `req.user._id`, and `updateRepository` builds its updates from a fixed whitelist, so `owner`, `stars`, `forks`, `createdAt`, and `updatedAt` cannot be manipulated through a `PATCH`.

## Frontend confirmation is not security

The "type the repository name to confirm" dialog only protects against accidental clicks. The `DELETE` request is independently authenticated and ownership-checked, so the API is safe even if the UI is bypassed entirely. The frontend only gates the visibility of the destructive button; it never grants permission.

---

# Edge Cases

- Missing / invalid / expired JWT → `401`
- Malformed repository ID → `400`
- Repository does not exist → `404`
- Creating, updating, or deleting someone else's repository → `403`
- Empty or non-string repository name → `400`
- Duplicate repository name for the same owner → `400` (create and update)
- Same repository name for a different owner → allowed
- Visibility other than `public` or `private` → `400`
- Request body with no allowed fields → `400`
- Unknown fields in the request body (e.g. `owner`, `stars`) → ignored
- Clearing the description → allowed (empty string is valid)
- Starring the same repository twice → count unchanged (idempotent)
- Unstarring a repository that was never starred → count unchanged
- Repeated unstar → count never goes below zero
- Starring a private repository as a non-owner → `403`
- Concurrent star requests from the same user → count incremented once
- Deleting a repository with issues and comments → issues and comments removed
- Deleting a repository with no issues → still succeeds
- Deleting a repository starred by other users → entries pulled from their `starRepo`
- Deleting a repository listed in users' `repositories` arrays → entries pulled
- Repository renamed → `_id` unchanged, so issues and stars stay attached
- Repository deleted mid-request → `404` on the next request
- Two users updating the same repository simultaneously → last write wins (no optimistic locking)

---

# Design Decisions

## Why are updates and deletes owner-only?

Reading a public repository is open to any authenticated user, but mutating it is a privileged action. Restricting update/delete to the owner matches how repositories are modeled today (a single `owner` field, no collaborator model yet) and prevents a user from hijacking or destroying another user's repository.

## Why an explicit allowed-field whitelist instead of `findByIdAndUpdate(id, req.body)`?

Passing `req.body` straight into an update would let a client overwrite `owner`, `stars`, or any other field it could guess. Building an `updates` object from a fixed set of allowed keys (`name`, `description`, `visibility`) means only those fields can ever change, so mass-assignment is impossible by construction.

## Why `repository.set(updates)` + `save()` instead of `findByIdAndUpdate`?

The repository document is already loaded for the ownership check, so reusing it avoids a second query. `save()` runs the schema's validators and lifecycle hooks, which a raw update would skip.

## Why does the update reject when the body has no valid fields?

An empty update is almost always a bug or a probe. Returning `400` makes the mistake visible instead of silently returning `200` with nothing changed.

## Why cascade-delete issues and comments?

An issue has no meaning without its repository (`Issue.repository` is required), and a comment has no meaning without its issue. Leaving them behind would create orphaned documents that are unreachable from any API. For a repository deletion in this project, deleting the dependent data is the honest behavior.

## Why pull the repository ID from users' `starRepo` and `repositories`?

Deleting a repository must not leave dangling ObjectIds in user documents. The delete pulls the ID from every user's arrays so no references point to a removed repository.

## Why sequential deletes instead of a transaction?

The development MongoDB is a standalone deployment without a replica set, so multi-document transactions are unavailable. The cascade is ordered so the most dependent data is removed first, and each step is idempotent. If a step fails, the request returns `500` and a subsequent delete (or manual cleanup) completes the job. A production deployment would wrap the cascade in a transaction.

## Why `$addToSet` / `$pull` for stars?

`$addToSet` only adds an element if it is not already present and `$pull` only removes matching elements. Both are atomic on a single document, making star/unstar idempotent and safe under concurrent requests. Gating the `$inc` on the user update's `modifiedCount` keeps the repository count consistent with the user's array.

## Why use the raw collection for the star/unstar user update?

`User.updateOne()` on a schema with `timestamps: true` injects `updatedAt` even for a no-op, so `modifiedCount` reports `1` and a repeated star would wrongly bump the count. Using `User.collection.updateOne()` (the underlying MongoDB driver) returns the true `modifiedCount`, so idempotency works correctly.

## Why return `isOwner` and `isStarred` from `GET /api/repositories/:id`?

The backend already computes ownership for the visibility check and can cheaply check the authenticated user's `starRepo`. Returning both flags means the frontend renders the Settings tab and Star button from authoritative data instead of guessing locally.

## Why require the user to type the repository name before deleting?

Typing the exact name forces a deliberate, intentional action and matches the destructive-action pattern used by GitHub. It is a UI safeguard; the API still enforces ownership independently, so the confirmation is not the security boundary.

---

# Security Considerations

- Every request passes through the JWT `protect` middleware; anonymous requests get `401`.
- Ownership is re-checked inside each mutation, not just once in the frontend, so the API is safe even if the UI is bypassed.
- The repository ID is validated with `mongoose.Types.ObjectId.isValid` before any query, so malformed IDs return `400` instead of leaking a database CastError as a `500`.
- Only `name`, `description`, and `visibility` can be written; every other body field is ignored.
- Validation errors are explicit `400` responses with a clear message; server failures return a generic `500` without internal error details.
- The owner is never taken from the request body; it is always read from the authenticated user or the repository document.

---

# Testing

Run with `npm test` in `backend/` (`node --test tests/*.test.js`) against a dedicated `commithub_test` database.

The suite (`backend/tests/repositoryManagement.test.js`) covers, per endpoint:

- `createRepository` (10 cases): unauthenticated `401`; creation owned by the authenticated user; owner spoofing via the body is ignored; duplicate name for the same owner → `400`; same name for a different owner → allowed; empty / non-string name → `400`; invalid visibility → `400`; name trimming; repository linked into `User.repositories`.
- `getRepositories` (2 cases): unauthenticated `401`; returns only the authenticated user's repositories.
- `getRepositoryById` (7 cases): unauthenticated `401`; malformed ID → `400`; not found → `404`; public repository readable by any user; private repository → `403` for a non-owner; owner can read their private repository; `isStarred` computed from the requester's `starRepo`.
- `updateRepository` (14 cases): unauthenticated `401`; malformed ID → `400`; not found → `404`; non-owner → `403`; empty / non-string name → `400`; duplicate rename → `400`; invalid visibility → `400`; body with only invalid keys → `400`; unknown fields (`owner`, `stars`) ignored even when a valid field is present; full update; partial update; clearing the description; stars/branches untouched.
- `deleteRepository` (8 cases): unauthenticated `401`; malformed ID → `400`; not found → `404`; non-owner → `403`; successful delete; cascade to issues and comments; `starRepo` cleaned for every user; delete of a repository with no issues.
- `starRepository` (7 cases): unauthenticated `401`; malformed ID → `400`; not found → `404`; private repository star → `403` for a non-owner; public star increments once; owner can star their own private repository; double star does not double-count.
- `unstarRepository` (7 cases): unauthenticated `401`; malformed ID → `400`; not found → `404`; unstar decrements once; unstarring a never-starred repository is a no-op; repeated unstar never goes below zero; 5 concurrent star requests produce exactly 1 star.

Actual results at review time: the suite was run multiple times; a clean final run passed **55/55 tests** (`tests 55`, `pass 55`, `fail 0`, `cancelled 0`) with a clean test database afterward (`users: 0, repositories: 0, issues: 0, comments: 0`).

Note on test reliability: the suite runs against a remote MongoDB Atlas database, so occasional network timeouts can surface as transient `PoolClearedOnNetworkError` failures unrelated to the code. A local MongoDB makes the suite fully deterministic. The suite's teardown uses `server.closeAllConnections()` before `server.close()` so the process exits cleanly and never leaves residue behind.

---

# Future Improvements

- Unique compound index on `Repository` `(owner, name)` so the duplicate check is enforced by the database, closing the small race between the check and the create.
- Soft delete (archive) so a deleted repository can be recovered before permanent removal
- Transfer repository ownership to another user
- Wrap the delete cascade in a MongoDB transaction (requires a replica set deployment)
- Audit log recording who changed what and when
- Rate limiting on update/delete to slow down abuse
- Optimistic concurrency (a version field or `updatedAt` precondition) instead of last-write-wins
- Dedicated `Star` collection (userId + repositoryId) with a unique compound index, which scales better than an unbounded array on the user document
- Wire the static `/repositories` list page (`Repositories.jsx`) to the repository API, matching the dashboard
- Delete cleanup for CLI `.CommitHub` folders and AWS S3 objects, which today live outside the MongoDB backend

---

# Open Questions

**Should deleting require re-entering the password?**

Currently no — the JWT is considered sufficient. GitHub requires a password for account-level actions; if the product wants that, the delete endpoint can ask for a password verification.

**Should repository names be unique per owner or globally?**

Currently unique per owner, matching the duplicate check in `createRepository`. Global uniqueness would prevent name reuse across users.

**Should the cascade include CLI and AWS S3 data?**

The CLI (`commit`, `branch`, `push`, ...) writes repository data to local `.CommitHub` folders and the AWS storage service writes objects to S3; neither is tracked in MongoDB, and no HTTP endpoint exists to clean them up. Cleaning those up at delete time is out of scope for this feature and is noted in Future Improvements.

---

# Interview Questions

See `qs.md` for the model answers for this feature.
