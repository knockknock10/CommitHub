# Q1. What should happen when a user clicks on a repository card?
Model Answer
When a user clicks on a repository card from the dashboard, the application should navigate the user to the Repository Details page for the selected repository. This process involves multiple layers of the application, including frontend routing, backend API communication, authentication, authorization, database retrieval, and UI rendering. The objective is to retrieve the latest repository information securely and display it while handling all possible error conditions.
Step-by-step flow
Step 1 – User Interaction
The process begins when the user clicks on a repository card displayed on the dashboard.
Step 2 – Client-side Routing
React Router intercepts the click event and changes the URL from
/dashboard
to
/repositories/:repositoryId
without performing a full page refresh.
Step 3 – Repository Page Initialization
The RepositoryPage component is mounted.
The component extracts the repository ID from the URL using React Router's useParams() hook.
Step 4 – Data Fetching
Once the component is mounted, a useEffect() hook triggers an API request.
Instead of storing repository information inside React Router state, the page always requests the latest repository information from the backend.
This ensures the displayed data is always up to date.
Step 5 – API Communication
Axios sends
GET /api/repositories/:repositoryId
to the backend.
The JWT stored in local storage is attached to the Authorization header.
Step 6 – Authentication
The backend authentication middleware verifies:
JWT exists
JWT is valid
User exists
User is authenticated
If authentication fails, the server immediately returns
401 Unauthorized
Step 7 – Authorization
The controller checks whether:
the repository exists
it is public
or the authenticated user has permission to access it
If the user is not authorized,
403 Forbidden
is returned.
Step 8 – Database Retrieval
If authorization succeeds, MongoDB retrieves the repository document.
Additional related information such as the repository owner may also be fetched.
Step 9 – Response
The backend returns a JSON response containing all required repository information.
Step 10 – UI Rendering
React receives the response.
The loading state is removed.
The repository information is stored in component state.
The Repository Details page is rendered.
Edge Cases
The implementation must also handle:
Repository does not exist (404)
Invalid repository ID (400)
Unauthorized access (401)
Forbidden access (403)
Server failure (500)
Network timeout
Empty repository
Missing README
Implemented behavior (Aug 2026)
Authentication middleware returns 401 when the JWT is valid but the user was deleted.
GET /api/repositories/:id returns 400 for a malformed ID, 404 for a missing repository, 200 for public repositories and the owner, and 403 for private repositories requested by a non-owner.
Verified by an integration test suite (12/12 passing) against a dedicated test MongoDB database.
Interview Closing Statement
The primary goal of this flow is to ensure that the Repository Details page always displays the most recent repository information while enforcing authentication, authorization, and graceful error handling.

1. Objective

Why does this feature exist?

--------------------------------

2. High-Level Explanation

Explain the entire idea in one paragraph.

--------------------------------

3. Detailed Flow

Step 1

Step 2

Step 3

...

--------------------------------

4. Edge Cases

What could fail?

--------------------------------

5. Design Decisions

Why did you choose this approach?

--------------------------------

6. Future Improvements

How would this evolve as the application grows?

Feature 01 – Repository Details

1. Requirement Analysis
2. Functional Requirements
3. Non-Functional Requirements
4. User Stories
5. Use Cases
6. Complete Request Lifecycle
7. UI Components
8. User Actions
9. API Design
10. Database Design
11. Frontend Architecture
12. Backend Architecture
13. Security Considerations
14. Edge Cases
15. Testing Strategy
16. Design Decisions
17. Future Improvements
18. Interview Questions
19. Lessons Learned

# Q2. What information should be visible on the Repository Details page?

## Feature Objective

The Repository Details page should provide users with all the necessary information required to understand, manage, and collaborate on a repository. Similar to GitHub, this page serves as the central workspace for repository-related activities. Every important detail about the repository should be available without requiring the user to navigate to multiple pages.

---

## High-Level Explanation

When a repository is opened, the user should immediately see its identity, ownership information, statistics, available actions, repository contents, and navigation to related features such as Issues, Pull Requests, Branches, and Settings. The information should be organized logically so that users can quickly understand the repository's current state.

---

## Information to Display

### 1. Repository Header

The header provides the primary identity of the repository.

Display:

- Repository Name
- Repository Description
- Repository Owner
- Repository Visibility (Public / Private)
- Primary Programming Language
- Repository Topics
- License
- Homepage URL (if available)
- Creation Date
- Last Updated Date

---

### 2. Repository Statistics

Display repository metrics including:

- Stars
- Forks
- Watchers
- Number of Branches
- Number of Open Issues
- Number of Pull Requests
- Number of Contributors
- Repository Size

---

### 3. Repository Actions

Provide quick actions such as:

- Star Repository
- Fork Repository
- Watch Repository
- Clone Repository
- Copy HTTPS URL
- Copy SSH URL
- Download ZIP

---

### 4. Navigation Tabs

The Repository page should contain navigation tabs for different repository modules.

Tabs include:

- Code
- Issues
- Pull Requests
- Actions
- Projects
- Wiki
- Security
- Insights
- Settings

---

### 5. Code Explorer

Display:

- Current Branch
- Latest Commit Message
- Latest Commit Hash
- Commit Timestamp
- Folder Structure
- Files
- README.md
- LICENSE
- .gitignore

---

### 6. Sidebar Information

Display additional repository information.

- About
- Website
- Topics
- Releases
- Packages
- Languages Used
- Contributors

---

## Edge Cases

- Repository contains no files.
- README is missing.
- Repository has no description.
- Repository has only one branch.
- Repository has no contributors.
- Repository has no releases.

---

## Design Decisions

Repository information is grouped into logical sections to improve readability and user experience. Frequently accessed information is placed at the top, while secondary information is placed in the sidebar.

---

## Future Improvements

- Repository Analytics
- Dependency Graph
- Security Alerts
- Traffic Statistics
- Repository Insights
- AI Repository Summary

---

# Q3. Which actions should the user be able to perform?

## Feature Objective

A repository is not only meant to display information but also to allow users to interact with and manage it. The Repository Details page should expose all common repository operations through intuitive user actions.

---

## High-Level Explanation

Users should be able to perform all repository-related operations from a single page without unnecessary navigation. Available actions should depend on the user's permissions and repository visibility.

---

## User Actions

### General Actions

- View Repository
- Refresh Repository
- Copy Repository Link

---

### Repository Management

- Edit Repository
- Delete Repository
- Archive Repository
- Change Visibility
- Rename Repository

---

### Collaboration

- Invite Collaborators
- Remove Collaborators
- Manage Permissions

---

### Repository Interaction

- Star Repository
- Unstar Repository
- Watch Repository
- Unwatch Repository
- Fork Repository

---

### Code Management

- Clone Repository
- Download ZIP
- Upload Files
- Create Folder
- Create README
- Add Files

---

### Branch Management

- Create Branch
- Delete Branch
- Switch Branch
- Merge Branch

---

### Issue Management

- Create Issue
- Edit Issue
- Close Issue
- Reopen Issue
- Add Labels
- Assign Users

---

### Pull Requests

- Create Pull Request
- Review Pull Request
- Merge Pull Request
- Close Pull Request

---

### Settings

- Change Default Branch
- Configure Repository Settings

---

## Edge Cases

- User does not have permission.
- Repository is archived.
- Repository is read-only.
- Repository is private.

---

## Design Decisions

Only actions that the authenticated user is authorized to perform should be visible. Unauthorized actions should either be hidden or disabled.

---

## Future Improvements

- Bulk File Upload
- Drag-and-Drop Upload
- AI Code Review
- Repository Templates

---

# Q4. What backend APIs are required?

## Feature Objective

REST APIs provide communication between the frontend and backend. Every user interaction should correspond to a clearly defined API endpoint.

---

## Repository APIs

### Fetch All Repositories

GET

/api/repositories

Purpose:

Retrieve all repositories belonging to the authenticated user.

---

### Fetch Repository

GET

/api/repositories/:repositoryId

Purpose:

Retrieve a specific repository.

---

### Create Repository

POST

/api/repositories

Purpose:

Create a new repository.

---

### Update Repository

PATCH

/api/repositories/:repositoryId

Purpose:

Update repository information.

---

### Delete Repository

DELETE

/api/repositories/:repositoryId

Purpose:

Delete repository.

---

### Star Repository

POST

/api/repositories/:repositoryId/star

Purpose:

Add a star.

---

### Remove Star

DELETE

/api/repositories/:repositoryId/star

Purpose:

Remove star.

---

### Fork Repository

POST

/api/repositories/:repositoryId/fork

Purpose:

Create repository fork.

---

### Repository Branches

GET

/api/repositories/:repositoryId/branches

Purpose:

Retrieve repository branches.

---

### Repository Files

GET

/api/repositories/:repositoryId/files

Purpose:

Retrieve repository files.

---

### README

GET

/api/repositories/:repositoryId/readme

Purpose:

Retrieve README content.

---

### Repository Activity

GET

/api/repositories/:repositoryId/activity

Purpose:

Retrieve recent repository activity.

---

## Design Decisions

Each API should have a single responsibility and follow RESTful conventions.

---

## Future Improvements

- GraphQL API
- API Versioning
- Rate Limiting
- Caching

---

# Q5. What additional data should the Repository model contain?

## Feature Objective

The Repository model should store all data required to support GitHub-like repository management while remaining scalable and maintainable.

---

## Current Model

Current fields include:

- Name
- Description
- Owner
- Visibility
- Stars
- Forks
- Branches

---

## Proposed Model

Additional fields include:

- Repository ID
- Default Branch
- Watchers
- Topics
- Homepage URL
- License
- Primary Language
- README Content
- Collaborators
- Issue Count
- Pull Request Count
- Repository Size
- Commit Count
- Last Commit ID
- Last Commit Time
- Archived Status
- Template Status
- Created At
- Updated At

---

## Design Decisions

Instead of storing unnecessary duplicated information, counts should be maintained carefully and relationships should reference other collections where appropriate.

---

## Future Improvements

- Repository Tags
- Security Policies
- Code Owners
- Release Information

---

# Q6. What edge cases should be handled?

## Feature Objective

The application should behave predictably even when unexpected situations occur. Proper error handling improves reliability and user experience.

---

## Repository Access

- Repository not found
- Invalid Repository ID
- Repository deleted during request

---

## Authentication

- JWT expired
- Invalid JWT
- User not logged in

---

## Authorization

- Private repository access denied
- User removed from collaborators
- Owner account deleted

---

## Repository State

- Empty repository
- Missing README
- No branches
- No commits
- No issues
- No pull requests

---

## Network Problems

- No internet connection
- Slow response
- Request timeout
- Backend unavailable

---

## Server Problems

- Database unavailable
- Internal Server Error (500)
- Validation failure

---

## User Experience

- Loading state
- Empty state
- Retry mechanism
- Error page
- Skeleton Loader

---

## Design Decisions

Every error should return an appropriate HTTP status code and display a meaningful message to the user instead of exposing internal server information.

---

## Future Improvements

- Automatic Retry
- Offline Mode
- Background Synchronization
- Optimistic UI Updates

---

# Feature 02 – Repository Stars

# Q1. How would you implement starring a repository such that double-clicking cannot double the count?

## Feature Objective

The star action must be idempotent: calling it any number of times must produce the same result as calling it once. A user must never be able to inflate a repository's star count by clicking repeatedly or sending concurrent requests.

## High-Level Explanation

I store the star relationship on the user document as a `starRepo` array of repository IDs, and a separate `stars` counter on the repository document. To make the operation idempotent and race-safe, I use MongoDB's `$addToSet` operator, which only inserts the ID if it is not already present. I then increment the repository count only if the `$addToSet` actually modified the user document.

## Detailed Flow

Step 1 – The authenticated user calls `PATCH /api/repositories/:id/star`.

Step 2 – The backend validates the repository ID, loads the repository, and enforces visibility (private repositories are owner-only).

Step 3 – `$addToSet` adds the repository ID to `user.starRepo`. MongoDB serializes concurrent writes to the same document, so even if two requests race, only one of them sees a real modification.

Step 4 – The controller checks `modifiedCount`. If it is `1`, it runs `$inc: { stars: 1 }` on the repository. If it is `0`, the repository was already starred and nothing changes.

Step 5 – The response returns the current count and `isStarred: true`.

## Edge Cases

- Double click → second request is a no-op, count unchanged
- Two users star at the same time → each user document gets its own `$addToSet`; both increments are legitimate, so the count increases by 2
- Unstar when never starred → `$pull` is a no-op, count unchanged

## Design Decisions

The `$addToSet` + `modifiedCount` pattern gives idempotency and atomicity without a transaction. Counting on the repository and the relationship on the user avoids reading the full array to compute a count.

## Failure Cases

A crash between the user update and the count increment leaves the array and the count temporarily inconsistent. In production I would combine both writes into a single aggregation-pipeline update or a transaction.

## Interview Closing Statement

Idempotency is enforced at the database layer with `$addToSet`, not in application logic, so it holds even under concurrent requests.

---

# Q2. How do you keep the star count and the starred-list consistent under concurrency?

## High-Level Explanation

MongoDB guarantees that writes to a single document are serialized. Since the `$addToSet` (or `$pull`) targets a single user document, two racing requests from the same user are applied one after the other. Only the first can report `modifiedCount: 1`, so only the first increments the repository count. Different users target different user documents, so their increments are independent and all legitimate.

## Why the count cannot drift

The count is only ever changed when the relationship array actually changed. A no-op star (already starred) or no-op unstar (never starred) does not touch the counter. This invariant is what keeps the two data stores in sync for normal traffic.

## Scaling and production notes

- At GitHub scale I would replace the per-user array with a dedicated `Star` collection using a unique compound index on `(userId, repositoryId)` and `$inc` the count inside the same write, or maintain the count as a computed aggregate.
- Unbounded arrays on the user document grow with every starred repository and eventually hit the 16 MB document limit, so a dedicated collection is the scalable design.
- A transaction or an aggregation pipeline that updates both the relationship and the counter atomically removes the crash-window inconsistency entirely.

## Interview Closing Statement

The key idea is that atomic per-document operators plus gating the counter on `modifiedCount` gives correct behavior without distributed locks or transactions.

---

# Q3. How does authorization apply to starring?

## High-Level Explanation

Starring requires authentication because a star is a personal action tied to a user identity. It also reuses the repository visibility rules: a user can only star a repository they can actually view.

## Details

- `protect` middleware rejects requests without a valid JWT with `401`.
- A public repository can be starred by any authenticated user.
- A private repository can only be starred by its owner; anyone else receives `403`.
- Unstar intentionally has no visibility check so a user can always remove a repository from their own list, even if it became private after they starred it.

## Security

- The repository ID is validated before querying, so malformed input returns `400` instead of a `500` CastError.
- No data from the request body is written into the relationship; only the repository ID from the database is used.

## Interview Closing Statement

Authorization here is the same model as repository viewing: authenticate every request, then apply visibility rules before mutating state.

---

# Q4. How would you design this at GitHub scale?

## High-Level Explanation

At GitHub scale the per-user array design is replaced by a dedicated star relationship collection, counts become either derived aggregates or maintained counters, and writes are made atomic.

## Evolution

- A `Star` collection with `userId`, `repositoryId`, `createdAt` and a unique compound index on `(userId, repositoryId)` replaces the unbounded user array. This supports pagination of "who starred this" and "repositories I starred".
- The star count is kept as a counter updated with `$inc` in the same logical operation as the relationship insert, using a transaction or a single aggregation-pipeline update.
- Reads are cached (e.g. a repository's star count cached with a short TTL or event invalidation) because the count is read far more often than it changes.
- Ordering repositories by stars uses the counter field with an index, avoiding a full-table aggregation.

## Performance

- Lookup by `(userId, repositoryId)` is a single indexed point read.
- The star toggle is two indexed writes instead of reading and rewriting a growing array.

## Interview Closing Statement

The array works for a teaching-scale app; the production design moves the relationship to its own collection so it paginates, indexes, and caches cleanly.

---

# Feature 03 – Repository Management

# Q1. How do you authorize repository updates and deletes?

## High-Level Explanation

Reading a repository is open to any authenticated user if it is public, but changing or destroying a repository is a privileged operation. Both `PATCH /api/repositories/:id` and `DELETE /api/repositories/:id` authenticate the user with the JWT `protect` middleware and then verify that the authenticated user is the repository's `owner`. Anything else gets `403`.

## Detailed Flow

Step 1 – The request arrives with a `Bearer` token; `protect` verifies it and loads the user (`401` on missing, invalid, or expired tokens, or if the user no longer exists).

Step 2 – The controller validates the repository ID with `mongoose.Types.ObjectId.isValid` (`400` if malformed) and loads the repository (`404` if missing).

Step 3 – Ownership is compared: `repository.owner.toString() === req.user._id.toString()`. A mismatch returns `403` with "You do not have access to this repository".

Step 4 – Only after that check does the controller mutate the document.

## Edge Cases

- No token → `401`
- Expired token → `401`
- Malformed ID → `400`
- Repository not found → `404`
- Non-owner PATCH or DELETE → `403`
- Owner PATCH or DELETE → succeeds

## Design Decisions

Ownership is checked inside the controller on every mutation, never only in the frontend, so the API remains safe even if the UI is bypassed. The owner is always read from the repository document — never from the request body — so a client cannot transfer or delete someone else's repository by sending an `owner` field.

## Failure Cases

The repository could be deleted between the ownership check and the write; the second write then simply affects nothing, or the next request returns `404`.

## Interview Closing Statement

Authorization is a per-request server-side check: authenticate first, then verify that the actor is the document's owner before allowing any mutation.

---

# Q2. How do you prevent partial updates / mass-assignment?

## High-Level Explanation

I never pass `req.body` to an update. Instead I build a clean `updates` object from an explicit whitelist of allowed fields — `name`, `description`, and `visibility` — and copy only the values that were actually provided. Every other key in the body is ignored, so a client cannot overwrite `owner`, `stars`, or any internal field.

## Detailed Flow

Step 1 – Destructure only the allowed keys: `const { name, description, visibility } = req.body;`.

Step 2 – For each key that is present, validate the value:

- `name` must be a non-empty string and must not already belong to another repository of the same owner (`400` otherwise)
- `description` must be a string (an empty string is allowed, so it can be cleared)
- `visibility` must be `public` or `private`

Step 3 – Add valid values to `updates`.

Step 4 – If `updates` is empty, return `400` ("No valid fields to update").

Step 5 – Apply with `repository.set(updates)` then `save()`, which runs the schema validators.

## Edge Cases

- Body contains `owner` or `stars` → ignored, update succeeds
- Body contains only invalid keys → `400`
- Body contains `name: ""` or `name: 42` → `400`
- Body contains `visibility: "spy"` → `400`
- Renaming to a name used by a different owner → allowed (uniqueness is per owner)

## Design Decisions

The whitelist is the defense-in-depth layer. Even if validation logic had a bug, the set of fields that can reach the database is fixed at three. Using the already-loaded document plus `set()`/`save()` also means the ownership check and the write operate on the same data.

## Failure Cases

A future developer might add a field to the schema and forget to add it to the whitelist; the field could then never be updated through this endpoint. That is a safe failure (it cannot corrupt data) and is solved by adding the field to the whitelist explicitly.

## Interview Closing Statement

Mass-assignment is prevented structurally: the request body is reduced to a fixed, validated set of fields before it ever reaches the database layer.

---

# Q3. How do you handle deletion of a repository that has issues and comments?

## High-Level Explanation

Before deleting the repository I analyze what references it: `Issue.repository` (required), `Comment.issue` (comments hang off issues, so they cascade indirectly), and `User.starRepo` / `User.repositories` (arrays that may hold the repository ID). I then remove the dependent data in dependency order, ending with the repository itself.

## Detailed Flow

Step 1 – After the ownership check, load the repository's issues: `Issue.find({ repository: repository._id })`.

Step 2 – Delete the comments on those issues: `Comment.deleteMany({ issue: { $in: issueIds } })`.

Step 3 – Delete the issues: `Issue.deleteMany({ repository: repository._id })`.

Step 4 – Pull the repository ID from every user: `User.updateMany({}, { $pull: { starRepo: ..., repositories: ... } })`.

Step 5 – Delete the repository document.

Step 6 – Return `200` with `{ message: "Repository deleted" }`.

## Edge Cases

- Repository with no issues → the deleteMany calls are no-ops, deletion still succeeds
- Repository starred by many users → all `starRepo` arrays are cleaned
- Repository with open and closed issues → all are removed regardless of status
- Comments whose issue is missing → unaffected (query targets existing issue IDs)

## Design Decisions

An issue has no meaning without its repository and a comment has no meaning without its issue, so cascade-deleting them is the honest behavior for a permanent delete — otherwise unreachable orphan documents accumulate. This also closes the known gap from Repository Stars, where a deleted repository used to leave dangling IDs in users' `starRepo` arrays.

## Failure Cases

The development MongoDB is a standalone deployment without a replica set, so multi-document transactions are unavailable. The cascade is ordered so the most dependent data is deleted first, and every step is idempotent, so a crash mid-cascade can be finished by re-running the delete. A production design would wrap all steps in a single transaction.

## Interview Closing Statement

Deletion is a cascade, not a single document drop: I enumerate everything that references the repository, delete the dependent data first, then remove the repository and clean the references held by other users.

---

# Q4. How do you keep the UI and backend state consistent after an update or delete?

## High-Level Explanation

The update endpoint returns the freshly saved repository document, and the frontend replaces its repository state with that response. The delete endpoint succeeds with a confirmation message, and the frontend navigates away to the repositories list, since the page's subject no longer exists.

## Detailed Flow (update)

Step 1 – The form calls `updateRepository(id, formData)` → `PATCH /api/repositories/:id`.

Step 2 – The backend persists the changes and returns `200` with the updated, owner-populated repository.

Step 3 – The Settings component calls `onUpdated(updated)`, and `RepositoryPage` stores it with `setRepository(updated)`.

Step 4 – The header (name), badge (visibility), and stats re-render from the same state, so there is a single source of truth with no page reload.

## Detailed Flow (delete)

Step 1 – The confirmed action calls `deleteRepository(id)` → `DELETE /api/repositories/:id`.

Step 2 – On `200`, the component navigates to `/repositories` — the current page no longer represents anything, so keeping it mounted would show a ghost.

Step 3 – On failure, the error is shown inline and the page stays put with its state intact.

## Design Decisions

Mutating responses return the full updated document rather than `204 No Content`. That lets the client sync in one round trip and avoids a follow-up `GET` that could race a visibility change. Navigation on delete prevents the UI from displaying a repository the backend no longer has.

## Failure Cases

A failed save returns `400`/`403`/`500` with a message; the frontend shows it and keeps the user's unsaved input so nothing is lost. If the server dies after persisting but before responding, the client shows an error even though the change landed — retrying the request is idempotent and safe.

## Interview Closing Statement

The backend returns the authoritative post-mutation document and the frontend adopts it as its only state; for delete, success means the page is no longer valid, so the UI navigates away instead of trying to render a deleted repository.

---

# Q5. How do you handle concurrent updates to the same repository?

## High-Level Explanation

Today the model is last-write-wins. Two concurrent `PATCH` requests both load the repository, both pass the ownership check, and each applies its own validated subset of fields. The second `save()` to persist wins for the fields it changed; because each request only sets the fields it received, the two updates usually compose rather than clobber each other.

## Detailed Flow

Step 1 – Request A and request B both call `PATCH` with different field sets.

Step 2 – Both pass ownership and validation.

Step 3 – Request A sets `{ name }`; request B sets `{ visibility }`.

Step 4 – Both `save()`; since each built its `updates` from its own body, `name` and `visibility` both persist — the operations compose.

Step 5 – If both update the same field with different values, the last write wins.

## Edge Cases

- Two updates to different fields → both land
- Two updates to the same field → last writer wins
- A rename racing with a delete → one of them wins; if delete wins, the rename hits `404`

## Design Decisions

Last-write-wins is acceptable for a teaching-scale app with a single owner per repository. The per-field `updates` object makes same-document writes compose better than whole-document replacement, because each request writes only the keys it was given.

## Failure Cases

Last-write-wins can silently drop an older update: if a user edits in two tabs, the later click overwrites the earlier one with no warning. Production would add optimistic concurrency — e.g. a `version` field or an `updatedAt` precondition — so a stale client is rejected with `409` instead of overwriting newer data.

## Interview Closing Statement

Concurrency is handled at the field level: each request writes only the fields it validated, so parallel edits to different fields compose, while the same field simply follows last-write-wins — with optimistic locking as the production upgrade path.

---

# Q6. How do you communicate destructive-action confirmation in the UI?

## High-Level Explanation

Deleting a repository is irreversible, so the UI must make the user slow down and deliberately confirm. The first click on "Delete repository" expands a confirmation panel instead of performing the action; the destructive button stays disabled until the user types the exact repository name. Only then can the delete request be sent.

## Detailed Flow

Step 1 – The Danger Zone shows a "Delete repository" button next to a warning that the repository and its issues cannot be restored.

Step 2 – Clicking it flips a `confirmingDelete` state that renders an inline confirmation panel with an input pre-hinted with the repository name.

Step 3 – The user must type the exact repository name; the button is disabled while `confirmName !== repository.name`.

Step 4 – The confirmed click calls `deleteRepository`, which shows a loading label ("Deleting...") and disables the button while in flight.

Step 5 – Success navigates to `/repositories`; failure shows the API error inline and re-enables the button.

## Design Decisions

Typing the name is a stronger signal than a bare "Are you sure?" popup, because it requires the user to know and reproduce the exact identifier. It matches the destructive-action pattern users already know from GitHub. The confirmation is a UX safeguard only — the API independently enforces ownership, so the UI check is not the security boundary.

## Edge Cases

- Mismatched name → button stays disabled
- Cancel → panel collapses, input cleared, no request sent
- Delete fails (e.g. `403` on an expired session) → error shown, panel stays so the input is not lost

## Interview Closing Statement

Destructive actions are confirmed by identity, not just intent: the user must reproduce the exact repository name before the delete is enabled, and the backend enforces ownership regardless of what the UI allows.

# Feature 05 – Repository Code Browser

# Q1. How does the frontend retrieve repository files?

## High-Level Explanation

The Code tab renders a `RepositoryCode` component that calls two API functions. On mount (and on every folder navigation) it calls `fetchRepositoryTree(id, path)` → `GET /api/repositories/:id/tree?path=<dir>` and stores the returned `entries`. When the user clicks a file it calls `fetchRepositoryFile(id, filePath)` → `GET /api/repositories/:id/file?path=<file>` and renders the returned `content` in a `<pre>` viewer.

## Detailed Flow

Step 1 – The component keeps the current directory in `currentPath` state (default `""` = repository root).

Step 2 – A `useEffect` keyed on `currentPath` fetches the tree and updates `entries`.

Step 3 – Folders are rendered as clickable rows; clicking one sets `currentPath` to `entry.path`, which refetches the tree for that directory.

Step 4 – Files are rendered as clickable rows; clicking one sets `selectedFile` and fetches the file content.

Step 5 – Breadcrumbs derive from `currentPath.split("/")`; clicking a crumb sets `currentPath` back to that prefix.

## Design Decisions

Axios attaches the JWT automatically via the request interceptor, so the component needs no auth code. Navigation is plain React state, not routing, because the URL does not need to change for a folder inside a repository.

## Interview Closing Statement

The frontend is a state-driven browser over two small API functions; every folder click is just a tree request with a deeper `path`, and every file click is a single file-content request.

---

# Q2. Why shouldn't repository files be stored directly in MongoDB?

## High-Level Explanation

MongoDB documents are capped at 16 MB, every write rewrites the whole document, and storing blobs forces the database to serve bytes while competing with queries for memory and bandwidth. Repository files are content blobs; the database should own metadata and relationships, not file bytes.

## Details

- A `files` array inside `Repository` would grow without bound and eventually hit the document size limit.
- Listing a directory would mean filtering an array embedded in a single document instead of a cheap directory read.
- Diffing, checking sizes, and streaming all become database operations rather than filesystem operations.
- The existing CLI already models files as a working tree on disk; mirroring every file in the database would create two sources of truth.

## Interview Closing Statement

Files live in a filesystem-backed store and MongoDB holds the repository metadata — the same split GitHub uses between metadata services and object storage.

---

# Q3. How does path traversal work?

## High-Level Explanation

Path traversal is an input-validation attack: a client sends a relative path containing `../` (or an absolute path) hoping the server joins it onto the repository root and reads outside. The browser never reads paths directly — it sends a string to the API, and the backend resolves it strictly.

## Attack surface

- `../../.env` tries to step up to a sibling directory and read secrets
- `/etc/passwd` uses an absolute path to bypass the relative base entirely
- `..\..\etc` uses backslashes to slip past checks that only look at `/`
- URL-encoded `%2e%2e%2f` tries to hide the dots from naive checks
- A symlink inside the repository points to a file outside it

## Defenses

1. Reject any segment equal to `..` (both separators).
2. Reject absolute paths and drive prefixes.
3. After joining, recompute `path.relative(root, resolved)` and require it not to start with `..`.
4. After `stat`, resolve both paths with `fs.realpathSync` and require containment again, which defeats symlink escapes.

## Interview Closing Statement

Traversal is prevented before the filesystem is touched (lexical checks) and verified again after (realpath containment), so even malformed or symlinked paths cannot reach outside the repository root.

---

# Q4. How did you prevent `../../` attacks?

## High-Level Explanation

`resolveRepoPath(root, requestedPath)` in `backend/utils/repoStorage.js` runs before any filesystem call. It rejects paths whose segments contain `..`, absolute paths, backslash traversal, drive prefixes, and NUL bytes, then confirms the joined result stays under the root with `path.relative`.

## Detailed Flow

Step 1 – Non-string inputs or empty-after-trim → repository root (empty string is the only way to request the root).

Step 2 – `../` segments rejected → `400 Invalid path`.

Step 3 – Absolute paths (`/...`, `\...`, `C:`) rejected.

Step 4 – `path.join(root, ...segments)` then `path.relative(root, resolved)` must not begin with `..` or be absolute.

Step 5 – Only the safe absolute path reaches `fs.promises.stat` / `readFile`.

## Edge Cases

- `../../.env` → `400`
- `/etc/passwd` → `400`
- `..\..\env` → `400`
- `%2e%2e%2f%2e%2e%2f.env` (URL-encoded, decoded by Express first) → `400`

## Interview Closing Statement

The frontend never supplies a filesystem path; it supplies a logical path, and the backend whitelists the only thing that can ever be requested: a relative path that resolves inside the repository root.

---

# Q5. Where is authorization enforced?

## High-Level Explanation

Authorization is enforced entirely on the backend, twice: once by the shared JWT middleware and once inside the controller. The frontend only controls what is rendered; it never grants access.

## Layers

1. `protect` (authmiddleware.js) rejects unauthenticated requests with `401` before the controller runs.
2. The controller validates the repository ID (`400`), loads the repository (`404`), then applies the visibility rule: public → any authenticated user; private → owner only (`403` otherwise).
3. The filesystem boundary is the third check: even an authorized user can only reach files inside their repository's root.

## Why not just check in the frontend

The UI hides tabs and buttons based on `isOwner`, but that is convenience, not security. A client can call the API directly, so every sensitive read is re-checked server-side.

## Interview Closing Statement

Authentication is the shared middleware, authorization is a per-request controller check on the repository document, and the filesystem containment check is the final boundary — three independent layers before any file byte is read.

---

# Q6. What happens if a file is too large?

## High-Level Explanation

Before reading, the controller stats the file and compares `stat.size` against `MAX_FILE_SIZE` (1 MB, centralized in `utils/repoStorage.js`). A file larger than the limit returns `413 File is too large to view` without being read, so memory and response size stay bounded.

## Design Decisions

A hard cap is the simplest correct behavior for this slice: no streaming, no range requests, and no accidentally slurping a 500 MB file into memory because a client asked for it. The `413` response is deliberate and tells the user the file exists but is not viewable yet.

## Future improvement

Replace the cap with streaming / range requests (`Accept-Ranges`, partial content) or render a client-side notice with a "view raw / download" path. The constant is centralized so the limit is easy to tune.

## Interview Closing Statement

Size is checked before the read, not after: a stat call decides whether the payload is bounded, so oversized files fail fast with `413` instead of exhausting memory.

---

# Q7. What is the source of truth for repository contents?

## High-Level Explanation

The repository's working tree on the backend filesystem — a directory at `repo-storage/<ownerId>/<repoId>/` — is the source of truth for contents. The MongoDB `Repository` document is the source of truth for metadata only (name, visibility, owner, stars, forks, branches).

## Why this split

- The existing CLI already models a repository as a directory plus a `.CommitHub` folder, so the browser reading that directory shares one representation with the CLI.
- The storage path is derived from `owner._id` and `repository._id`, so it is deterministic and survives renames with no schema change.
- The directory is created on repository creation and removed on deletion, so the document and the working tree share one lifecycle.

## Interview Closing Statement

Metadata in MongoDB, bytes on disk: the database says a repository exists and who owns it, and the working-tree directory says what is in it — the same representation the CLI works with.

---

# Q8. How would you scale this system to millions of files?

## High-Level Explanation

The current design scans the requested directory with `readdir` and stats every entry to report sizes — fine for teaching scale, not for millions of files. Production scale moves the index and the bytes apart.

## Evolution

- Keep per-directory listings bounded with pagination or lazy loading instead of returning every entry at once.
- Cache tree listings with invalidation on commit, so a directory scan is not repeated on every page view.
- Store blobs in object storage (S3) and keep an index (paths, sizes, object keys) in a queryable store; a directory listing becomes an indexed prefix query instead of a filesystem walk.
- Replace the per-entry `stat` with a persisted index that already carries size/type, or accept eventual consistency between the index and storage.
- Serve file content from a CDN with signed URLs so the web servers never stream bytes.

## Interview Closing Statement

The bottleneck is the naive readdir-and-stat listing; the scalable design keeps an index for listings and moves the bytes to object storage, leaving the API contract (`tree` + `file`) unchanged.

---

# Q9. How would S3 change the architecture?

## High-Level Explanation

S3 would replace the local filesystem as the byte store while keeping the API contract intact. Each repository becomes an S3 "prefix" (`<ownerId>/<repoId>/...`) and each file a key; the tree endpoint issues a `ListObjectsV2` with the directory prefix as the `Delimiter` to get folders and files, and the file endpoint issues a `GetObject`.

## What changes

- No local disk state; repositories are portable across servers and survive instance replacement.
- Lifecycle (create/delete directories) becomes `PutObject` on a marker key and recursive prefix deletion.
- Large-file handling can leverage S3's own capabilities (multipart upload, range GETs, signed URLs for the browser).
- The security boundary moves from realpath containment to key validation: the object key must stay under the repository prefix, and no local path joins exist to confuse.

## What stays

- Authorization, path validation, status codes, and the frontend are unchanged because the controllers keep the same inputs and outputs.

## Interview Closing Statement

S3 is a drop-in byte store behind the same controller API: directory listings become prefix queries, file reads become `GetObject`, and the main new security concern is validating object keys instead of local paths.

---

# Q10. How would Git commit snapshots eventually integrate with the browser?

## High-Level Explanation

Today the browser shows the live working tree. Once commits exist, the Code tab should be able to show the repository as of any commit or branch — the tree of a snapshot, not the mutable working directory.

## Integration path

1. Commits already snapshot files under `.CommitHub/commits/<hash>/` (the CLI copies staged files into a commit directory and writes `meta.json`).
2. The tree/file endpoints can accept an optional commit reference; when given, they resolve paths against the commit snapshot directory instead of the working tree, with the same safe-path checks applied to a different root.
3. The file list can surface latest-commit metadata per entry (message, author, date) by reading the branch's commit chain — the natural follow-on feature to this one.
4. Writes (add/commit) continue to target the working tree; the browser only reads snapshots.

## Design notes

The snapshot layout mirrors the working tree, so the exact same `resolveRepoPath`/realpath logic applies with a different root — the security work done here is reused unchanged.

## Interview Closing Statement

Commit snapshots integrate by pointing the existing tree/file endpoints at a commit's snapshot directory instead of the working tree, reusing the same path-validation layer and adding per-entry commit metadata to the response.

---

# Feature 06 – Commit System and Commit History

# Q11. What is a commit in your system?

## High-Level Explanation

A commit is an immutable record of the repository at one point in time. It is a directory at `.CommitHub/commits/<id>/` containing two things: a `snapshot/` folder — a byte-for-byte copy of the working tree at commit time, with relative paths preserved — and a `meta.json` file with `id`, `message`, `author`, `timestamp`, `parent`, and the `files` it changed (`A`/`M`/`D`).

## Where it is implemented

`createCommit` in `backend/utils/repoVersion.js` writes the snapshot and metadata and then advances the branch reference; `POST /api/repositories/:id/commits` in `backend/controllers/commitController.js` exposes it.

## Interview Closing Statement

A commit is the snapshot plus its metadata stored as an immutable directory under `.CommitHub/commits/<id>/` — the filesystem equivalent of Git's commit object, kept deliberately simple.

---

# Q12. How is a commit different from the working tree?

## High-Level Explanation

The working tree (`repo-storage/<ownerId>/<repoId>/`) is the mutable directory the user edits and that Feature 05's browser reads. A commit is a frozen copy of that tree at a specific moment, stored separately under `.CommitHub/commits/<id>/snapshot/`. Editing the working tree changes the files the next commit will see; it never changes commits that already exist.

## Interview Closing Statement

The working tree is the present and mutable state; a commit is a point-in-time, immutable copy of it — two physically separate directories that the change detector diffs against each other.

---

# Q13. How do you guarantee commit immutability?

## High-Level Explanation

Structurally. A commit is written once: the service creates `commits/<id>/snapshot/`, copies the working-tree files in, writes `meta.json`, and only then advances the branch ref. No endpoint ever rewrites an existing commit directory, and the commit directory lives inside `.CommitHub`, which is excluded from both change detection and the Feature 05 tree listing, so a commit can never become the input of a later commit. Immutability is enforced by layout and copy-on-commit, not by locking.

## Interview Closing Statement

Immutability falls out of the design — each commit is a separate, never-rewritten directory of file copies, and bookkeeping is excluded from future snapshots — verified by a test that edits the working tree and asserts the old snapshot is unchanged.

---

# Q14. How is a parent commit represented?

## High-Level Explanation

As a single `parent` field in `meta.json`. When a commit is created, the service reads the current head commit from `refs/heads/<branch>` and stores it as the new commit's `parent` (`null` for the first commit). This yields a linear history: C → B → A. Multi-parent (merge) commits are intentionally out of scope.

## Interview Closing Statement

Each commit carries its parent's ID in `meta.json`; the branch ref points at the newest commit, so a commit knows where it came from and the chain is walked backwards.

---

# Q15. How is commit history traversed?

## High-Level Explanation

`getCommitHistory` in `backend/utils/repoVersion.js` reads the current branch from `HEAD`, reads the head commit ID from `refs/heads/<branch>`, then loops: read `meta.json`, collect `{id, message, author, timestamp, parent}`, jump to `parent`, repeat. The natural chain order is newest first, which is what the UI shows. `limit` (default 50, max 100) and `offset` are applied while walking, and a missing or corrupt ancestor stops the walk at the readable prefix.

## Interview Closing Statement

History is the parent chain walked backwards from the branch reference, newest first, stopping cleanly on a missing or corrupt ancestor.

---

# Q16. Where are commit objects stored?

## High-Level Explanation

On the backend filesystem inside each repository's bookkeeping directory: `<repoRoot>/.CommitHub/commits/<id>/`, where `<repoRoot>` is `repo-storage/<ownerId>/<repoId>/`. `refs/heads/<branch>` and `HEAD` sit alongside it under `.CommitHub/`. MongoDB stores only the `Repository` metadata document and never sees commit bytes.

## Interview Closing Statement

Commit objects live in `.CommitHub/commits/<id>/` next to the tree they snapshot, sharing the storage architecture that Feature 05 established and the CLI already uses.

---

# Q17. Why didn't you store entire repository snapshots in MongoDB?

## High-Level Explanation

Three reasons. Capacity: MongoDB documents cap at 16 MB, and a snapshot is unbounded bytes. Separation of concerns: Feature 05 already decided MongoDB holds metadata while file bytes live on disk, and a commit snapshot is file bytes. Integrity and sharing: storing commits in `.CommitHub` keeps them beside the tree they represent, keeps the CLI and web on one source of truth, and makes immutability a filesystem property rather than a discipline the database must re-implement. The small metadata record (`meta.json`) is a plain JSON file next to its snapshot; it does not need an index, so a MongoDB `Commit` collection would duplicate a source of truth that already exists.

## Interview Closing Statement

Snapshots are unbounded bytes that belong on disk, and the existing architecture already puts repository bytes in `.CommitHub`; MongoDB would add a 16 MB ceiling and a second source of truth for no benefit at this scale.

---

# Q18. What happens if a commit is created but HEAD update fails?

## High-Level Explanation

`HEAD` never changes on commit — it still says which branch is checked out. What moves is `refs/heads/<branch>`. The ordering is: write snapshot → write `meta.json` → write the branch ref. If the snapshot or metadata writes fail, the partial commit directory is deleted and the ref never moves, so the repository stays at its previous commit. If the ref write itself fails, the now-unreferenced commit directory is removed best-effort and a 500 is returned; the branch still points at the old commit, the working tree still holds the edits, and the user can simply commit again. The invariant is that the ref only ever points at a fully-written commit.

## Interview Closing Statement

The ref moves last and only ever points at a fully-written commit; on any failure the partial or unreferenced commit directory is removed, leaving the repository at its previous consistent state.

---

# Q19. How do you detect modified files?

## High-Level Explanation

`getWorkingTreeChanges` in `repoVersion.js` walks the working tree (skipping `.CommitHub`) and the head snapshot, then for files present in both computes a SHA-1 of each and compares them. A hash mismatch means `M`. This is the same hash-based comparison the CLI's `status` uses; a file present in the working tree but missing from the snapshot is `A`, and one present in the snapshot but missing from the tree is `D`.

## Interview Closing Statement

A file is modified when its SHA-1 in the working tree differs from the one in the head commit's snapshot; hashing both sides avoids any comparison of the bytes by value.

---

# Q20. How do you detect deleted files?

## High-Level Explanation

After diffing, the service iterates the head snapshot's file list: any snapshot file that is absent from the working-tree set is recorded as `D`. The changed-file list is sorted by path for determinism, and deleted files are simply not copied into the new snapshot.

## Interview Closing Statement

Deletion is the inverse membership check — a snapshot file that is no longer in the working tree is a `D`, and it is omitted from the new snapshot.

---

# Q21. How do you prevent unauthorized users from committing?

## High-Level Explanation

Two layers. Authentication is the existing JWT `protect` middleware: no valid token, no controller runs. Authorization is the `authorizeRepository` helper in `commitController.js`: commit creation is a write operation, so it is owner-only for public and private repositories alike (`repository.owner.toString() === req.user._id.toString()`, else 403). This mirrors the platform's existing write rule (`updateRepository`, `deleteRepository`). Read endpoints use the visibility rules: public → any authenticated user, private → owner.

## Interview Closing Statement

The JWT middleware gates the route, and commit creation is an owner-only write — the same authorization rule the platform already applies to repository updates and deletes.

---

# Q22. How would you scale commit storage?

## High-Level Explanation

Today each commit copies the whole tree, so storage grows linearly with commits × tree size and duplicate blobs are stored repeatedly. The scaling path is to stop storing full copies and store content once, keyed by blob hash (see Q23), plus a compact tree/manifest per commit. Object storage (S3) replaces the local disk, each blob is a key under a repository prefix, and commit manifests reference blob keys; a commit is then a small JSON manifest instead of a directory of files. History queries that today walk small JSON files stay cheap if manifests are small and can be cached.

## Interview Closing Statement

Scale comes from deduplicating content (blobs stored once, referenced by hash) and moving the byte store to object storage, leaving the commit as a small manifest rather than a full tree copy.

---

# Q23. How would you implement content-addressable storage?

## High-Level Explanation

Replace "copy every file into the snapshot" with "store every file once, addressed by its SHA-1". A `blobs/` store holds each unique file content keyed by `sha1(content)`; a commit's snapshot becomes a manifest mapping relative paths to blob IDs plus the file's previous ID so a tree can be reconstructed by walking the manifest. Writing a commit: hash each changed file, `put` the blob if absent, record the mapping, and write a small manifest. Two commits that share unchanged files then share blobs, and storage drops to roughly the working tree's size plus a manifest per commit. Read-back must verify the blob's hash matches its key to preserve integrity.

## Interview Closing Statement

Content addressing makes the blob store self-verifying and deduplicating — identical content maps to one blob regardless of how many commits reference it — which is exactly the property Git's object database has.

---

# Q24. How does Git actually store objects?

## High-Level Explanation

Git stores content in `.git/objects/` as four object types: blobs (file content), trees (directory listings mapping names to blob/tree object IDs), commits (tree ID, parent IDs, author/committer, message), and tags. Each object is stored at `.git/objects/xx/yyyy...` where the path is the first two hex characters and the rest of the SHA-1 of the object's content, optionally zlib-compressed. A commit references a tree that references blobs, so content appears exactly once even if shared across commits. Our implementation is a teaching simplification: one snapshot directory per commit plus a `meta.json`, no tree objects and no deduplication.

## Interview Closing Statement

Git's object database is content-addressable — blobs, trees, and commits all stored by SHA-1 with trees providing the path mapping — while CommitHub's full-copy snapshot is the same idea without deduplication or tree indirection.

---

# Q25. What is the difference between Git's working tree, index, and repository?

## High-Level Explanation

In Git, the working tree is your editable files; the index (staging area) is a snapshot of the changes you have selected for the next commit; and the repository is the committed object database (`.git`) that records history. `git add` writes to the index, `git commit` snapshots the index into the repository. CommitHub maps these concepts onto its own layout: the working tree is the repository directory; the staging area is `.CommitHub/staging/` (the CLI's `add` copies files there); and the repository/history is `.CommitHub/commits/` plus `refs/heads/`. The one deliberate difference is that the web API currently commits the whole working tree directly — equivalent to `git commit -a` — because there is no web staging UI yet.

## Interview Closing Statement

Git separates editable working tree, selectable index, and committed repository; CommitHub keeps the same three ideas, with web commits currently skipping the index (commit-everything) until a staging UI is built.

---

# Q26. How would you implement branching on top of this system?

## High-Level Explanation

The layout is already branch-ready: `refs/heads/<branch>` is a file holding a commit ID, and `HEAD` says which branch is checked out. `git branch` becomes "create a new `refs/heads/<name>` file containing the current head commit ID" — the CLI's `branch` controller already does this. `git checkout` becomes "change `HEAD` to `ref: refs/heads/<name>` and copy that branch's head snapshot into the working tree" — the CLI's `checkout` controller sketches it. Creating a commit already writes to `refs/heads/<current-branch>` (derived from `HEAD`), so branching needs no commit changes.

## Interview Closing Statement

Branching is nearly free here because commits already hang off `refs/heads/<branch>` and `HEAD` already selects the branch; a branch is just a new ref file pointing at an existing commit.

---

# Q27. How would checkout work?

## High-Level Explanation

Read the target branch's head commit from `refs/heads/<target>`; if it differs from the current branch, update `HEAD` to point at the target ref, and materialize the target snapshot into the working tree — copy the snapshot's files to `<repoRoot>/`, removing any working-tree files that are in the current snapshot but not in the target's (to avoid stale files), and detect uncommitted changes first so the user does not lose edits. The CLI's `checkout` controller already does the naive copy-and-rewrite-HEAD version; the web version would add the dirty-tree guard and the deletion pass.

## Interview Closing Statement

Checkout swaps `HEAD` to the target ref and reconciles the working tree with the target snapshot, guarding against uncommitted changes before touching the files.

---

# Q28. How would merge work?

## High-Level Explanation

A three-way merge between two branches' head commits: find the merge base (the nearest common ancestor by walking parent chains — the first commit whose ID appears in both branches' histories), then compare base → ours and base → theirs. A file changed on only one side takes that side; changed on both sides with identical content is fine; changed on both sides with different content is a conflict the user resolves (storing base/ours/theirs for a merge tool). The result is a new commit with two parents — which is why the metadata model must allow a `parent` array, the one extension this feature explicitly deferred.

## Interview Closing Statement

Merge is a three-way reconcile against the common ancestor that produces a two-parent commit; the single-parent field in `meta.json` would become a parent list, the only schema change required.

---

# Q29. How would you implement diff between two commits?

## High-Level Explanation

The change detector already computes differences between a working tree and a snapshot. Diffing two commits is the same operation with both inputs being snapshots: walk both snapshots, and for every path produce `A` (in target only), `D` (in source only), or `M` (in both, different content). Line-level hunks are a follow-on: read both file contents and run a line diff (LCS-based) on the pairs flagged `M`, rendering `+`/`-` lines — the single-commit view already lists the per-file statuses, which is the coarse-grained diff.

## Interview Closing Statement

Diffing two commits reuses the existing snapshot-walking change detector, producing A/M/D per path, with line-level hunks added by running a line diff on the modified pairs.

---

# Q30. What consistency guarantees does your filesystem-based implementation provide?

## High-Level Explanation

The branch reference is the commit of truth and it only ever points at a fully-written commit: snapshot and `meta.json` are written before the ref, and any failure removes the partial or unreferenced commit directory, so a reader never sees a half-written commit. Commit directories are immutable once written, so reads are repeatable. History walks stop cleanly on a missing or corrupt ancestor rather than corrupting the whole view. The acknowledged gaps are concurrency (no per-repo lock, so simultaneous commits could orphan one commit directory) and the lack of an atomic "write commit + move ref" operation — the best-effort cleanup plus write-order invariant keeps the repository consistent, but a lock or a small transaction would close the race.

## Interview Closing Statement

The guarantee is: the ref only ever points at a complete, immutable commit, and failures clean up after themselves so the repository stays at its previous consistent state; the known gap is concurrent writers, which a per-repository lock would close.

---

# Feature 06 Interview Closing Statement

The commit system is a filesystem version-control service built on Feature 05's storage: the working tree is the mutable present, a commit is an immutable snapshot plus metadata under `.CommitHub/commits/`, the parent chain is the history, and `refs/heads/<branch>` is the moving pointer — all secured by the existing JWT middleware, owner-only writes, strict commit-ID validation, and a change detector that reuses the repository's own storage layout.
