# Feature 02 – Repository Stars

---

# Status

🟡 Designing

Owner: Sanjeev Kumar

Priority: High

Sprint: 2

---

# Implementation Status (Aug 2026)

Repository starring is implemented and integration-tested.

- `PATCH /api/repositories/:id/star` adds the repository to the authenticated user's `starRepo` array and increments the repository `stars` count.
- `PATCH /api/repositories/:id/unstar` removes the repository from the user's `starRepo` array and decrements the `stars` count.
- Both operations are idempotent: starring an already-starred repository, or unstarring a repository that was never starred, does not change any count.
- `GET /api/repositories/:id` now returns an additional `isStarred` boolean so the frontend can render the correct button state on load.
- The Star button on the Repository page toggles between star/unstar and shows the live count.

Verified with an integration test suite (17/17 cases passing) plus a concurrency test (20 simultaneous star requests across 2 users produced exactly 2 stars) against a dedicated test MongoDB database.

---

# Feature Objective

Stars let users mark repositories they find useful or interesting. A star count is a lightweight popularity signal shown on the repository page, and a user's starred repositories appear in their profile.

The feature covers the complete star lifecycle: viewing the current state, starring, unstarring, and keeping the displayed count correct under repeated or simultaneous clicks.

---

# High-Level Explanation

When a user opens a repository page, the backend returns the repository document together with an `isStarred` flag computed from the requesting user's `starRepo` array.

When the user clicks the Star button, the frontend calls the star endpoint. The backend verifies the user can see the repository, atomically adds the repository ID to the user's `starRepo` array, and increments the repository's `stars` count only when the addition actually happened. Unstar is the reverse.

---

# Detailed Flow

## Step 1 – User Interaction

The user opens a repository page and sees the Star button with the current count.

---

## Step 2 – Initial State

`RepositoryPage` calls `fetchRepositoryById(id)`.

The backend returns the repository plus `isStarred` (computed from `req.user.starRepo`).

The button renders in the starred or unstarred style accordingly.

---

## Step 3 – Star Action

The user clicks the button.

The frontend calls `starRepository(id)` → `PATCH /api/repositories/:id/star`.

---

## Step 4 – Backend Processing

The `protect` middleware authenticates the user.

`starRepository` then

- validates the repository ID (`400` if malformed)
- loads the repository (`404` if missing)
- checks visibility: private repositories can only be starred by their owner (`403` otherwise)
- runs `$addToSet` on the user's `starRepo` (idempotent, race-safe)
- runs `$inc` on the repository `stars` only if the `$addToSet` actually modified the document

---

## Step 5 – Database

MongoDB applies the two updates.

Using `$addToSet` (instead of `$push`) guarantees a repository appears in `starRepo` at most once, so repeated stars cannot double-count.

---

## Step 6 – Response

The backend returns

{
  stars: <new count>,
  isStarred: true
}

---

## Step 7 – UI Update

The frontend updates the button label and the count without a page reload.

---

# Edge Cases

- Starring the same repository twice → count unchanged (idempotent)
- Unstarring a repository that was never starred → count unchanged (idempotent)
- Starring a private repository as a non-owner → `403`
- Starring a private repository as the owner → allowed
- Malformed repository ID → `400`
- Repository does not exist → `404`
- Missing / invalid / expired JWT → `401`
- Two users starring simultaneously → count incremented once per user
- The same user clicking Star 10 times quickly → count incremented once
- Repository count never goes negative on repeated unstar
- Repository deleted after the user starred it → orphaned entry in `starRepo` (no cascade delete yet)

---

# Design Decisions

## Why store the star relationship on the user and a count on the repository?

The user model already had a `starRepo` ObjectId array and the repository model already had a `stars` counter. Keeping this split means a user's starred list is read from one document and the count is a cheap `$inc` on the repository. No schema change was needed.

## Why `$addToSet` / `$pull` instead of `$push` / manual filtering?

`$addToSet` only adds an element if it is not already present, and `$pull` only removes matching elements. Both are atomic on a single document, which makes the operations idempotent and safe under concurrent requests.

## Why increment the count only when `modifiedCount === 1`?

A no-op `$addToSet` (already starred) or `$pull` (never starred) must not change the count. Gating the `$inc` on the actual modification keeps the count consistent with the array.

## Why use the raw collection for the user update?

`User.updateOne()` on a schema with `timestamps: true` automatically injects `$set: { updatedAt }`, so even a no-op star reports `modifiedCount: 1` and bumps the user's `updatedAt`. Using `User.collection.updateOne()` (the underlying MongoDB driver) returns the true `modifiedCount`, so idempotency works correctly and starring a repo does not touch the user's timestamp.

## Why does `GET /api/repositories/:id` return `isStarred`?

The frontend needs the initial button state. Computing it on the backend from the authenticated user's `starRepo` avoids an extra round trip and keeps the check consistent with the same data used by the star/unstar endpoints.

## Why is unstar allowed without a visibility check?

A user may only have starred a repository while it was public. If the owner later makes it private, the user would otherwise be locked out of removing it from their list. Unstar is idempotent and harmless, so no visibility check is applied.

---

# Security Considerations

- Star/unstar require a valid JWT (`protect` middleware); anonymous requests get `401`.
- A user can only star repositories they can view: private repositories are limited to the owner (`403` otherwise), matching the authorization rules from Repository Details.
- The repository ID is validated with `mongoose.Types.ObjectId.isValid` before any query, so malformed IDs return `400` instead of leaking a database CastError as a `500`.
- No user-controlled data is written into the star relationship beyond the repository ID.
- The response leaks no internal error details.

---

# Future Improvements

- Show the list of users who starred a repository
- Starred repositories tab on the profile page
- Repository star notifications / activity feed
- A dedicated `Star` collection (userId + repositoryId) with a unique compound index, which scales better than an unbounded array on the user document
- Move the star/unstar write into a single transaction (or an aggregation-pipeline update) so the user array and the repository count can never fall out of sync on a crash
- Dedicated star index on `repositories.stars` if sorting repositories by stars is needed

---

# Open Questions

**Should users be able to star their own repositories?**

Currently yes. This matches GitHub, where the owner can star their own repository. If the product decides otherwise, the owner branch can be excluded in the controller.

**Should private repositories be starrrable at all?**

Currently only by the owner, consistent with the visibility rules. A future collaborator model would extend this to users with read access.

---

# Interview Questions

See `qs.md` for the model answers for this feature.
