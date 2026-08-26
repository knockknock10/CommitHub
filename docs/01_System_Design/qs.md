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

---

# Feature 07 – Pull Request System

# Q31. What is a pull request in your system?

## High-Level Explanation

A pull request is a per-repository record that proposes merging one branch into another: it stores `sourceBranch`, `targetBranch`, title, description, author, status (`open | closed | merged`), embedded reviews and comments, and merge metadata (`mergedBy`, `mergedAt`, `mergeSourceCommitId`, `mergeCommitId`). It does **not** store commit data or file contents — those are computed live from the repository's `.CommitHub` filesystem every time the PR is viewed, so the diff always reflects the current state of the branches.

## Where it is implemented

The `PullRequest` schema lives in `backend/models/pullRequestModel.js`; the handlers in `backend/controllers/pullRequestController.js`; the routes are mounted under `/api/repositories/:id/pull-requests` in `backend/routes/repositoryRoutes.js`.

## Interview Closing Statement

A pull request is a metadata document naming two branches plus the review/comment/merge history — the actual content (commits and diff) is derived from the filesystem at read time, so it can never go stale.

---

# Q32. How do you number pull requests?

## High-Level Explanation

Per-repository sequential numbering via a counter: the `Repository` document gained a `prCount` field (default 0), and creating a PR runs `Repository.findOneAndUpdate({ _id }, { $inc: { prCount: 1 } })` to atomically claim the next number. A unique index on `(repository, number)` makes duplicates impossible. The counter and index together mean concurrent creates get distinct numbers even without a lock.

## Interview Closing Statement

Numbers are allocated by an atomic `$inc` on a per-repository counter and enforced unique by a compound index — no two PRs in the same repository can share a number.

---

# Q33. Why are pull request comments embedded in the PullRequest document?

## High-Level Explanation

Because they are always read together with the PR itself and never queried independently yet. The existing issue `Comment` model references an `Issue` and has issue-specific semantics, so it was not reusable; a separate PR-comment collection would add indexes and joins for data that the detail view needs atomically with the PR. Embedding keeps ordering (oldest first), atomicity, and cleanup free — when a PR is deleted its comments go with it.

## Interview Closing Statement

Reviews and comments are embedded subdocuments because they are only ever read with their PR, and the issue comment model wasn't reusable — a separate collection would add joins without adding value at this scale.

---

# Q34. How is the diff between the source and target branches computed?

## High-Level Explanation

`getCommitDiff(baseCommitId, headCommitId)` in `backend/utils/repoVersion.js` walks both commits' snapshots (`commits/<id>/snapshot/`) and produces per-file `A`/`M`/`D`, sorted by path. Files flagged `M` are diffed at line level with an LCS-based algorithm into hunks of `+`/`-`/context lines plus a `@@ -old,old +new,new @@` header. Binary content is detected and flagged `binary: true` with no hunks; oversized files fall back to a bounded prefix/suffix approximation flagged `approximate: true` to cap the work and payload.

## Interview Closing Statement

The diff walks both snapshots for the A/M/D statuses and runs an LCS line diff on the modified pairs, with binary detection and size caps so the endpoint stays bounded.

---

# Q35. How does merge work in your system?

## High-Level Explanation

Fast-forward only. `mergePullRequest` requires owner authorization, an open PR, and both branches to exist on disk. It then calls `fastForwardMerge`: if source is an ancestor of target the target is already up to date (400); if the branches have diverged (`getMergeBase` isn't the target head) it returns `DIVERGED` (409) and the PR stays open; otherwise it advances `refs/heads/<target>` to the source head commit. When the target branch is the checked-out branch, the working tree must be clean (else `DIRTY_TREE`, 400) and the source snapshot is materialized into it. Only then is the DB updated (status `merged`, merge metadata); a DB failure triggers a best-effort ref rollback (`restoreBranchRef`), and a retry heals a partially-applied merge.

## Interview Closing Statement

Merge fast-forwards the target ref to the source head after validating the branches and working tree, materializes the tree when the target is checked out, and updates the database last so a failure can be rolled back or healed.

---

# Q36. What happens if the target ref is updated but the database save fails during a merge?

## High-Level Explanation

The controller saves the PR document *last*. If the save throws after the ref was advanced, it calls `restoreBranchRef` to put `refs/heads/<target>` back to `previousTargetCommitId` best-effort, so a merge cannot leave the repo pointing at the source head while the PR is still recorded as open. The working tree, if it was materialized, is restored on the next checkout. If the rollback itself fails, the retry path heals: on a later merge attempt, `targetCommitId === sourceCommitId` while the PR is still open, so the controller marks it merged with `alreadyUpToDate: true` instead of erroring.

## Interview Closing Statement

The DB write is the last step; on failure the target ref is rolled back best-effort, and if a partial state slips through, the next merge attempt heals it by recognizing the ref already matches the source head.

---

# Q37. Why does your system only support fast-forward merges?

## High-Level Explanation

Because Feature 06's `meta.json` models a single `parent`, and history is strictly linear. A fast-forward merge preserves that: the target ref simply moves to the source head, "merged" means exactly "the target now points at the source's commits", and no merge commit or conflict resolution is needed. Diverged branches are rejected with a clear 409 so the user knows a real merge is required. Adding three-way merge is a future step that would turn `parent` into a list and introduce conflict handling.

## Interview Closing Statement

Fast-forward keeps history linear and merge unambiguous, matching the single-parent commit model; diverged branches are cleanly rejected with a 409 rather than half-merged.

---

# Q38. What happens when you merge into the checked-out branch?

## High-Level Explanation

If the target branch is the one `HEAD` points at, the merge must also reconcile the working tree with the new target state, so the tree must be clean — uncommitted changes are rejected with `DIRTY_TREE` (400), exactly like checkout. When it is clean, `applySnapshotToWorkingTree` copies the source snapshot into the working tree (removing stale files first). If the target branch is *not* checked out, only the ref file moves and the working tree is untouched.

## Interview Closing Statement

Merging into the checked-out branch requires a clean tree and then materializes the source snapshot; merging into a non-checked-out branch only advances the ref file.

---

# Q39. How is merge authorization enforced?

## High-Level Explanation

The merge route calls `authorizeRepository(req, res, true)` — the owner-only variant. Merging is a write that permanently changes the target branch, so it is restricted to the repository owner even for public repositories. Reviewing, commenting, listing, and viewing use the read rules (public → any authenticated user, private → owner). Closing/reopening is a middle tier: the owner or the PR author.

## Interview Closing Statement

Merging is an owner-only write for both public and private repositories; read-side operations follow visibility rules, and close/reopen is allowed for the owner or the PR author.

---

# Q40. Why can't the PR author review their own pull request?

## High-Level Explanation

A review is meant to be independent judgment of the proposed change; self-review defeats that purpose. Enforcement is a `400` (`"You cannot review your own pull request"`) before the review is pushed. The author can still comment and the owner can still merge.

## Interview Closing Statement

Self-review is rejected with a 400 so reviews stay independent, while the author retains full commenting and the owner full merging.

---

# Q41. How do you prevent a user from spoofing a review or comment author?

## High-Level Explanation

The author of a review and a comment is always set from `req.user._id`, which is loaded by the JWT `protect` middleware; the request body only carries `state`, `comment`, and `content`. The schema marks those fields required, and the controller never reads an author field from the body. This is verified by a test that sends a body trying to set the author and asserts the token user is stored instead.

## Interview Closing Statement

Identity is derived exclusively from the verified JWT token; the body can only supply review state and text, so impersonation is structurally impossible.

---

# Q42. What happens if the source branch of a pull request is deleted?

## High-Level Explanation

The PR document only stores branch names, so it survives. The detail endpoint tries `getBranchCommitId` for each branch and reports `sourceBranchExists: false` / `targetBranchExists: false` plus a null commit list instead of erroring, so the PR stays viewable with its metadata, reviews, and comments. Merging a PR whose source or target branch is gone returns a 400 and leaves the PR open.

## Interview Closing Statement

A deleted branch is reported through existence flags in the detail view and a clean 400 on merge — the PR record itself remains intact and open.

---

# Q43. Why store pull requests in MongoDB while commits live on the filesystem?

## High-Level Explanation

Because the split is about *what* the data is. Commits are snapshots of file bytes plus a metadata record that belongs beside its snapshot in `.CommitHub` (Feature 06 rationale: 16 MB document limit, one source of truth shared with the CLI, filesystem-enforced immutability). A pull request, by contrast, is a small metadata document — branches, status, reviews, comments — that is exactly the kind of relational record MongoDB is for, and it needs queries (per-repository list by status, numbering with a unique index) that a directory of JSON files would not index well.

## Interview Closing Statement

PRs are small relational records that benefit from MongoDB's indexing and querying; commits are immutable byte snapshots that belong on the filesystem beside the tree — each store holds what it is best at.

---

# Q44. How do you compute the list of commits included in a pull request?

## High-Level Explanation

`getCommitsBetween(baseCommitId, headCommitId)` walks the parent chain from the source branch head back to the target branch head (exclusive), reading each `meta.json`. The result is the commits the target does not already contain — exactly the set a fast-forward merge would bring in, newest first. If the branches have diverged, the walk stops at the merge base and the diff/commits shown are still the source-side reachable history.

## Interview Closing Statement

The PR commit list is the source branch's history walked back to (but not including) the target branch's head — the commits a fast-forward would actually add.

---

# Q45. What happens when a PR is created against a branch that has no commits?

## High-Level Explanation

`createPullRequest` resolves both branches with `getBranchCommitId` and rejects with a 400 if either branch does not exist or has no commits. This happens before the number counter is incremented, so a failed create does not burn a PR number — the check order is validated branches → `$inc` → insert.

## Interview Closing Statement

Both branches must exist and have commits before a PR is created, and because validation precedes the counter increment, rejected creates don't consume numbers.

---

# Q46. Why is the `Repository` counter (`prCount`) better than counting existing PRs?

## High-Level Explanation

Counting documents (`PullRequest.countDocuments`) to derive the next number is not atomic: two concurrent creates both read N and both try to insert N, and the unique index then rejects one of them — and gaps and retries become user-visible. `$inc` on a single document is an atomic operation MongoDB guarantees, so claiming a number and inserting with it is race-free; the unique index remains as a backstop. The only wart is that a failure *between* the increment and the insert leaves a gap, which is documented and acceptable.

## Interview Closing Statement

An atomic `$inc` counter avoids the read-then-insert race of counting documents and is backstopped by a unique index, at the cost of possible (documented) gaps.

---

# Q47. How do you keep the working tree consistent when a merge materializes it?

## High-Level Explanation

`applySnapshotToWorkingTree` first walks the current working tree and removes every file that is not in the target snapshot, then copies the target snapshot's files in — so files from the old branch cannot linger. It runs only after the `DIRTY_TREE` check guarantees the tree is clean, meaning the removal pass can never delete uncommitted work. Empty directories are pruned as part of the removal pass.

## Interview Closing Statement

Materialization removes working-tree files absent from the new snapshot before copying the snapshot in, and it only ever runs against a clean tree so nothing user-made can be lost.

---

# Q48. Why does the diff need size caps and a binary flag?

## High-Level Explanation

The detail endpoint computes a line-level diff at request time. The LCS cell matrix is O(n×m) in line counts, so two very large files could burn unbounded CPU and memory, and a huge diff would bloat the response. Two caps bound the work — 40 000 LCS cells and 2 000 diff lines per file — beyond which the diff falls back to a bounded prefix/suffix approximation flagged `approximate: true`. Binary files are detected by content (NUL bytes and control-character ratios) and returned as `binary: true` with no hunks, so the endpoint can never be turned into a memory sink by a hostile file.

## Interview Closing Statement

Bounded LCS cells and per-file line caps, plus binary detection, keep the request-time diff cheap and the response small no matter what a file contains.

---

# Q49. How would you add approval-gated merges?

## High-Level Explanation

The data already exists: reviews carry `state` (`approved`, `changes_requested`, `commented`). An approval gate would, at merge time, inspect the PR's `reviews` and refuse to merge while an unresolved `changes_requested` exists (GitHub-style branch protection) or unless at least one `approved` review is present. This is purely a controller-level check before `fastForwardMerge` runs; no schema change is required. It could also be toggled per-repository as a `requireApproval` flag on the `Repository` document.

## Interview Closing Statement

The review states are already stored, so gating merge on them is a controller-side policy check — refuse to merge with unresolved `changes_requested` or without an approval — requiring no data-model change.

---

# Q50. How would you extend this to non-owner contributors?

## High-Level Explanation

Two changes. Authorization: today any authenticated user can *open* a PR on a public repo but only the owner can merge or close-by-others. That read-rules baseline is already a contribution flow; making it first-class means allowing non-owners to merge when the owner grants write access (e.g. a `collaborators` array on `Repository`, checked by `authorizeRepository`), and recording merge authorship in `mergedBy` (already modeled). Storage: per-user authors are already modeled everywhere, so nothing structural needs to change — this is an authorization rule extension plus a UI permission surface, not a schema change.

## Interview Closing Statement

The data model already records PR authorship, review authorship, and merge authorship, so contributions are an authorization extension — add collaborators to the Repository and let `authorizeRepository` grant write/merge rights — rather than a schema change.

---

# Feature 07 Interview Closing Statement

The pull request system is a metadata layer on top of Feature 06's filesystem version control: PRs record the two branches and the review/comment/merge history in MongoDB, while commits and diffs are computed live from `.CommitHub`; merge is a fast-forward that advances the target ref and materializes the tree with the database updated last and rollback/healing for partial failures — all under the existing JWT middleware, with author identities derived only from the token and merging restricted to the repository owner.


# Feature 08 – Repository File Management

# Q51. What are the file and directory endpoints in your repository file management?

## High-Level Explanation

Writes live on two routes under `/api/repositories/:id`. `/file` accepts `GET` (view, Feature 05), `POST` (create), `PUT` (edit), and `DELETE` (delete); `/directory` accepts `POST` (create) and `DELETE` (delete). Creates require the target to not exist, edits require it to already exist, file deletes refuse directories, and directory deletes refuse non-empty directories. Every mutation is owner-only and validates the path before touching the filesystem.

## Where it is implemented

Routes in `backend/routes/repositoryRoutes.js`; handlers in `backend/controllers/repoController.js`; the client functions in `commithub-frontend/src/api/repositoryApi.js`.

## Interview Closing Statement

Two routes — `/file` with GET/POST/PUT/DELETE and `/directory` with POST/DELETE — provide the full create/edit/delete surface with GitHub-style existence semantics, all owner-gated and path-validated.

---

# Q52. How do you make a file creation safe against path traversal?

## High-Level Explanation

Every write path goes through `resolveManagedPath`, which reuses the same `resolveRepoPath` guard as reads: it normalizes the input, rejects absolute paths, and resolves `..` segments. On top of that it rejects the repository root itself and anything inside `.CommitHub`. So `/etc/passwd`, `../.env`, `../../etc/passwd`, and `a/../../x` all return 400 before any filesystem write happens. Tests assert the host filesystem is never touched.

## Where it is implemented

`resolveManagedPath` in `backend/controllers/repoController.js`, layered on `resolveRepoPath` in `backend/utils/repoStorage.js`.

## Interview Closing Statement

`resolveManagedPath` rejects absolute paths, normalized `..` traversal, the repository root, and `.CommitHub`, so a write can only ever target a real, relative path inside the repository working tree.

---

# Q53. How do you prevent a symlink from redirecting a write outside the repository?

## High-Level Explanation

A path can look safe but a pre-existing directory in the chain may be a symlink pointing outside the repo. `assertAncestorsWithinRoot` walks from the target up to the first *existing* ancestor using `lstat` — so even a dangling symlink counts as existing — then runs `realpath` on it and requires the result to be inside the repository root. Delete/edit add an explicit `assertRealPathWithin` on the final target as well, so neither the ancestors nor the leaf can escape.

## Where it is implemented

`assertAncestorsWithinRoot` and the `assertRealPathWithin` calls in `backend/controllers/repoController.js`.

## Interview Closing Statement

`lstat`-based ancestor walking plus a `realpath` containment check guarantees that neither a live nor a dangling symlink can redirect a write outside the repository.

---

# Q54. How does create differ from edit in your API?

## High-Level Explanation

They are opposite sides of the same route, distinguished by verb and existence requirement. `POST /file` is "new file": the target must not exist (400 `"File already exists"` otherwise), and missing parent directories are auto-created. `PUT /file` is "replace": the target must already exist as a regular file (404 if missing, 400 if it is a directory). This makes the intent unambiguous — you cannot silently clobber an existing file by POSTing, and you cannot accidentally create a new file by PUTing.

## Interview Closing Statement

POST requires the target to be new and auto-creates parents; PUT requires it to already exist — the verb encodes the existence expectation, so clobbering and accidental creation are both impossible.

---

# Q55. How do you handle concurrent file edits?

## High-Level Explanation

With optimistic concurrency. `GET /file` returns the file's SHA-1 `hash`. `PUT /file` accepts an optional `expectedHash`; before overwriting, the controller hashes the current on-disk content and compares. A mismatch returns 409 `"File has been modified since it was loaded"`, and the client reloads the latest content (and its new hash) rather than blindly overwriting. When `expectedHash` is absent, the edit is an unconditional overwrite — the 409 is an opt-in guard for editors that loaded the file first.

## Interview Closing Statement

A SHA-1 content hash returned by GET is echoed back on PUT as `expectedHash`; any mismatch aborts with 409 and the UI reloads the newer content, giving last-write-wins without locks or server state.

---

# Q56. Why is directory deletion restricted to empty directories?

## High-Level Explanation

Recursive delete is irreversible and destructive — one bad path removes an entire subtree with no undo. `DELETE /directory` reads the directory and refuses with 400 `"Directory is not empty"` when it contains anything, mirroring GitHub's API semantics. Recursive deletion, if it is ever wanted, can be added later behind an explicit flag; keeping it out of the API entirely is the safe default.

## Interview Closing Statement

Directory deletion is empty-only — non-empty directories return 400 — so a single bad request can never wipe a subtree; recursive delete can be added behind an explicit flag later.

---

# Q57. Why do file creates auto-create parent directories but directory creates require the parent to exist?

## High-Level Explanation

The two operations have different trust levels. Creating a file at `docs/guide.md` calling `mkdir -p` on the parents matches GitHub's "add file" UX — you never hand-build scaffolding folders first. Directory creation, by contrast, uses plain `mkdir`: if you ask for `team/sre` but `team` is missing, the request fails loudly (400 `"Parent directory does not exist"`) instead of silently creating a chain of folders you may not have wanted. A file is a leaf that usually sits in an implied tree; a directory is explicitly structural.

## Interview Closing Statement

File creates `mkdir -p` their parents for GitHub-style convenience, while directory creates require the parent to exist so a typo fails loudly instead of silently building a whole folder chain.

---

# Q58. How does a file write interact with the checked-out branch?

## High-Level Explanation

File operations are pure filesystem writes into `<repoRoot>/` — the checked-out branch's working tree. The version-control metadata in `.CommitHub` is not involved until a commit or checkout. So a new file is immediately visible to `/changes` and the next commit captures it, and after a branch switch the file appears or disappears with the branch's snapshot. An integration test verifies this: create/commit on `main`, branch out, add a file, switch back — the file is gone on `main` and present on the branch.

## Interview Closing Statement

Writes land directly in the checked-out branch's working tree, so they show up in `/changes`, get captured by the next commit, and switch branches with the snapshot — no extra bookkeeping needed.

---

# Q59. Why is the 1 MB limit enforced in the controller rather than the body parser?

## High-Level Explanation

Express's JSON parser can enforce a limit itself, but when it rejects a payload it returns a raw 413 before the handler ever runs — a generic error that bypasses the API's JSON error shape. The controller enforces `MAX_FILE_SIZE` (1 MB) explicitly so it can return a clean JSON 413 `"File is too large"`. The parser's limit is raised to 4 MB purely as a transport-level backstop; 4 MB is still small enough to bound memory, and the controller's friendlier check always runs first.

## Interview Closing Statement

The controller checks the 1 MB file cap and returns a structured JSON 413, while the body parser's 4 MB limit is just a transport backstop — so the user gets the right error and the request size stays bounded.

---

# Q60. How do you distinguish binary files from text?

## High-Level Explanation

By content, not extension: a NUL byte (`\0`) in the decoded content marks it binary. On write, content containing NUL is rejected with 400 `"Binary file content is not supported"`. On read, `readTextFile` decodes as UTF-8, and if it finds a NUL byte it returns 400 `"Binary file cannot be viewed"` instead of rendering corrupt text. NUL-in-UTF-8 is a reliable binary marker for the text files this teaching-scale platform stores.

## Interview Closing Statement

Binary detection is content-based — a NUL byte in the decoded content — which rejects binary on write and refuses to render it as text on read, without relying on file extensions.

---

# Q61. Who is allowed to create, edit, and delete files, and why?

## High-Level Explanation

Every write handler calls `authorizeRepository(req, res, true)`, making all mutations owner-only for both public and private repositories; reads keep the Feature 05 rules (public → any authenticated user, private → owner). The working tree is the foundation every branch and PR workflow builds on, so letting arbitrary authenticated users mutate a public repo would be vandalism — there are no collaborators yet, so "can write" is exactly "is the owner".

## Interview Closing Statement

Reads follow visibility rules, but every file or directory mutation is owner-only via `authorizeRepository(..., true)` — a shared working tree must not be writable by arbitrary users until collaborator roles exist.

---

# Q62. How do you represent an empty directory in version control?

## High-Level Explanation

Empty directories are not tracked at all. The commit engine snapshots and diffs *files* (Feature 06), so an empty folder never appears in a commit's file list and cannot be restored from history. This matches Git itself, which cannot track empty directories without a placeholder file. Directory create/delete still work for organization, but they are presentational — the docs call this out explicitly so nobody expects folder history.

## Interview Closing Statement

Empty directories are a UI convenience, not version-controlled state — the commit model tracks files only (like Git), so empty folders can be created and deleted but never appear in history.

---

# Q63. How do you test the file management feature?

## High-Level Explanation

With an integration test suite (`backend/tests/repositoryFileManagement.test.js`, 48 cases) using `node:test`, a dedicated MongoDB (`commithub_files_test`), and a temp `REPO_STORAGE_ROOT`. Ten suites cover listing, retrieval, creation, editing, deletion, path security (traversal, absolute, `.CommitHub`, symlink escape), authorization (401/403/owner-only), directory management, limits (413/binary), and branch-aware working trees (create → commit → checkout → 404/200). The suite also asserts the host filesystem is never touched by traversal attempts.

## Interview Closing Statement

48 integration tests against an isolated test DB and temp storage root cover happy paths, every security boundary, authorization, limits, and branch-aware behavior — all part of the 268-test backend suite.

---

# Q64. What did the tree and file endpoints gain in this feature?

## High-Level Explanation

`GET /tree` entries now include `updatedAt` (the entry's mtime in ms), so the UI can show last-modified and the client can detect external changes. `GET /file` now returns `updatedAt` and the file's SHA-1 `hash` in addition to `content`, `path`, `name`, and `size`. The additions are purely additive — existing consumers of the Feature 05 responses are unaffected, and the `hash` is what powers the edit-time optimistic-concurrency check.

## Interview Closing Statement

Tree entries gained `updatedAt` and file views gained `updatedAt` plus a SHA-1 `hash`, additive changes that enable last-modified display and the 409-based concurrent-edit guard.

---

# Q65. How does the frontend reflect an uncommitted change after a file write?

## High-Level Explanation

`RepositoryCode` fetches `/changes` alongside the tree and shows a banner ("N uncommitted change(s)") whenever the list is non-empty, with a "View changes" link that switches to the Commits tab via an `onShowChanges` callback. After every successful create/edit/delete the component bumps a `reload` counter that refetches the tree, the branches, and the changes list together — so the banner, the branch badge, and the listing all stay consistent after a mutation.

## Interview Closing Statement

A `/changes`-driven banner links to the Commits tab, and every write bumps a reload that refetches tree, branches, and changes together — so the UI reflects the uncommitted state immediately.

---

# Q66. What happens if you edit a file while another tab has it open?

## High-Level Explanation

The editor holds the file's `hash` from when it loaded. On save it sends `expectedHash`; if another tab already saved, the on-disk content differs and the controller returns 409. The UI catches that specific status, shows "This file was modified elsewhere", reloads the latest content and hash, and leaves the user in a fresh editor instead of silently discarding their work or the other tab's work.

## Interview Closing Statement

The 409 from a stale `expectedHash` triggers a reload of the latest content instead of a silent overwrite, so two open editors cannot clobber each other unnoticed.

---

# Q67. How do you handle empty and oversized content?

## High-Level Explanation

Empty content is a valid file: create/update accept `""` and write a zero-byte file. Oversized content is rejected before any write: `validateWriteContent` measures bytes with `Buffer.byteLength(content, "utf8")` and returns 413 `"File is too large"` above `MAX_FILE_SIZE` (1 MB) — on both create and edit. Reads of files that grew past the cap also return 413, and the frontend surfaces the controller's message.

## Interview Closing Statement

Empty content writes a zero-byte file normally; content larger than 1 MB is rejected with 413 on both create and edit, measured in UTF-8 bytes before any filesystem write.

---

# Q68. How do you keep `.CommitHub` and the repository root out of reach for writes?

## High-Level Explanation

`resolveManagedPath` has three guards beyond the shared path resolver: it rejects the repository root itself (so you cannot write over the working tree base), it rejects `.CommitHub` and anything beneath it (so version-control internals like `HEAD`, `refs/`, and `commits/` can never be edited or deleted through the API), and it reuses the absolute/traversal rejection. Reads already hid `.CommitHub`; writes now refuse it outright with 400.

## Interview Closing Statement

The managed-path resolver rejects the repository root and every `.CommitHub` path on top of the standard traversal/absolute checks, so version-control internals are untouchable through the write API.

---

# Q69. How would you add rename or move support?

## High-Level Explanation

A `POST /file/rename` (or `PATCH /file`) would take `{ path, newPath }`, resolve both through `resolveManagedPath`, verify the source exists as a regular file and the destination is free, run `assertRealPathWithin`/`assertAncestorsWithinRoot` on both, then call the filesystem's atomic `rename` — which fails naturally if the destination already exists. Because renames are one filesystem call on the same volume, they are atomic and cost O(1), and the resulting change shows up in `/changes` as a delete+add pair, matching the commit model's file diff.

## Interview Closing Statement

Rename/move is a validated two-path `rename` call: both paths pass the managed-path and realpath checks, the destination must be free, and the atomic filesystem op produces a delete+add change visible to `/changes`.

---

# Q70. How would you add file upload support?

## High-Level Explanation

Binary upload needs a deliberate channel. I would keep the text API as-is and add `POST /file/upload` accepting raw or multipart binary with a size cap and the same path validation, storing under the working tree with a filename-sanitized basename (extensions allowed, no `..`/separators, `.CommitHub` names rejected). The binary branch would be viewable only as a download link — `GET /file` stays text-only (NUL-free) and returns a "binary" flag so the UI offers Download instead of rendering. The 1 MB cap could be raised per-repo for uploads while keeping the text view at the existing limit.

## Interview Closing Statement

Uploads would use a dedicated multipart/raw route with sanitized filenames and a size cap, stored in the working tree; text viewing stays NUL-free and binary files are surfaced as download links rather than rendered.

---

# Feature 08 Interview Closing Statement

Repository file management is a guarded filesystem layer on the checked-out branch's working tree: POST/PUT/DELETE on `/file` and POST/DELETE on `/directory` implement create/edit/delete with GitHub-style semantics, protected by layered path validation (traversal, absolute, root, `.CommitHub`, and `lstat`+`realpath` symlink-escape checks), owner-only authorization, a SHA-1 `expectedHash` optimistic-concurrency guard on edit, content-based binary rejection, and a 1 MB file cap — with the frontend Code tab providing new-file/new-folder forms, a save/cancel editor with 409 reload, inline delete confirmation, a real current-branch badge, and an uncommitted-changes banner that links to the Commits tab.

---

# Q71. What is a tag in CommitHub and how does it relate to a commit?

## High-Level Explanation

A tag is an immutable, named reference to a real commit. Under the hood it is a filesystem ref file — `.CommitHub/refs/tags/<name>` storing a commit ID, exactly mirroring how branch refs work in `refs/heads` — mirrored by a MongoDB `Tag` document `{ repository, name, commitId, creator, createdAt }` with a unique `{ repository, name }` index. A tag never creates or mutates history: it only points at a commit that must already exist in the repository's commit store. Deleting a tag removes the pointer and the metadata, never the commit.

## Interview Closing Statement

A tag is an immutable named pointer to an existing commit, stored as a filesystem ref plus a MongoDB document for fast listing, and deleting it never touches the underlying commit.

---

# Q72. How do you guarantee a tag always points at a real commit?

## High-Level Explanation

Every tag create resolves the target before any write. If the client supplies a `commitId`, it must match the commit ID format and then be resolved with `getCommit` against the filesystem — a missing commit returns 404 "Commit not found", an invalid ID returns 400. If no `commitId` is supplied, the server resolves the current branch HEAD itself via `getHeadCommitId`; the client cannot pass a branch assumption. Only after the commit is verified to exist is the ref written and the document inserted. Releases go one step further: creating a release re-verifies that the tag's commit still exists.

## Interview Closing Statement

Tag creation always resolves the commit server-side and verifies it exists before writing the ref and document, so a tag can never point at a nonexistent commit — and release creation re-verifies the tag's commit too.

---

# Q73. Why are tags immutable, and how do you enforce that?

## High-Level Explanation

A tag is a promise that a commit was, at some moment, the release point. Silently repointing it would rewrite the meaning of every release that referenced it. Enforcement is by construction: there is no update or force-move endpoint at all. Creating an existing name returns 400, and the filesystem ref is written with `flag: "wx"`, so an overwrite is impossible even from a race. To "move" a tag you delete it and recreate it — and because a tag referenced by a release cannot be deleted, published history stays pinned.

## Interview Closing Statement

Tags are immutable by construction — there is no update or force-move path, duplicate creation is rejected with 400, and an exclusive `wx` file write makes concurrent overwrite impossible.

---

# Q74. Why are tags stored in both the filesystem and MongoDB?

## High-Level Explanation

Each store answers a different question. The filesystem ref is the authentic pointer and gives a race-free create via the exclusive `wx` write; MongoDB provides fast paginated listing, creator metadata, and a database-level unique constraint — things the filesystem cannot answer efficiently. The create path keeps them consistent: ref first (wins the race), then document; if the insert fails the ref is best-effort rolled back. Deletes mirror this: document first, then ref. This mirrors the existing branch model, which also has both a ref and a `branches` array.

## Interview Closing Statement

The filesystem ref is the authentic pointer with a race-free `wx` create; MongoDB adds fast pagination, creator metadata, and uniqueness — with a rollback path so the two stores cannot disagree.

---

# Q75. How do you prevent two users creating the same tag at once?

## High-Level Explanation

With an exclusive filesystem write instead of a lock. `createTagRef` uses `fs.promises.writeFile(refPath, commitId, { flag: "wx" })` — "write exclusive" fails with `EEXIST` if the file already exists. Two concurrent requests for the same tag name race on the same file: only one wins, the loser gets `EEXIST` and the controller returns 400 "Tag already exists". The MongoDB unique index on `{ repository, name }` is the second line of defense, and if the document insert races into a duplicate, the ref is rolled back so no orphan ref survives.

## Interview Closing Statement

The exclusive `wx` filesystem write guarantees a single winner for any tag name even under concurrency, and the MongoDB unique index backs it up with a ref rollback on failure.

---

# Q76. Why are tag names flat — no slashes?

## High-Level Explanation

Git allows arbitrary slash paths like `v1.0/stable`, but that would force the `GET/DELETE /tags/:tagName` routes to be a splat with manual slash encoding — every slash-encoded tag becomes URL gymnastics. By constraining names to `/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/` (also rejecting `..`, trailing `.`, and `.lock`), every tag is a single clean URL segment. It is a documented, deliberate divergence from Git; the data model does not preclude a hierarchy later.

## Interview Closing Statement

Flat tag names keep every tag a single URL segment, avoiding splat routes and slash encoding — a documented practical trade-off against Git's arbitrary slash paths.

---

# Q77. What happens when you delete a tag that a release references?

## High-Level Explanation

The delete is blocked. Before removing the tag document, the controller counts releases in the same repository whose `tagName` matches; if any exist, it returns 400 "Tag ... is referenced by a release" and nothing is removed. This is a conservative data-integrity guard: a published release's notes and "changes since previous tag" are computed from the live commit chain, so allowing the tag to disappear would make the release dangle. Delete a tag only when no release references it.

## Interview Closing Statement

Deleting a release-referenced tag returns 400 and changes nothing, so a release can never point at a missing tag — removal requires un-referencing first.

---

# Q78. How is a release different from a tag?

## High-Level Explanation

A tag is a low-level pointer — a name for a commit, no human-facing narrative. A release is human-facing product metadata on top of a tag: `{ tagName, title, description, author, status: draft|published, publishedAt }`. The release answers "what was announced, when, and what changed"; the tag answers "which commit". A repository can have many tags and many releases; a release always references exactly one tag, and a tag can be referenced by at most one release at a time only in the sense that no rule prevents it — in practice each release names one tag.

## Interview Closing Statement

Tags name a commit; releases add the human-facing layer — title, notes, author, and a draft/published lifecycle — while still resolving their history through the tag.

---

# Q79. Why does a release store the tag name instead of a commit snapshot?

## High-Level Explanation

A snapshot duplicates the commit ID and can drift from the tags list over time; storing `tagName` keeps the release's history derived from the single source of truth — the tag, which resolves to the commit. The detail endpoint reads the tag's commit live and shows message, author, and date, plus the "changes since previous tag" computed from the real graph. The only failure mode is a dangling tag, and the delete guard prevents that, so the chain Release → Tag → Commit stays consistent by construction.

## Interview Closing Statement

The release stores only the tag name and resolves the commit live through the tag, so release history can never drift from the tags — with the delete guard keeping the chain intact.

---

# Q80. What is the draft/published lifecycle and how is it enforced?

## High-Level Explanation

A release is created as a draft and can be edited freely — title, notes, and even its tag can change. Publishing is a status transition on the same PATCH endpoint: `{ status: "published" }` flips the status and stamps `publishedAt` once (re-publishing is idempotent and never overwrites the original stamp). After publishing there is no revert to draft, and the tag becomes frozen (changing it returns 400), though title and notes remain editable for corrections. All rules live in the single `updateRelease` handler, so there is one reviewable place that enforces the whole lifecycle.

## Interview Closing Statement

Releases go draft → published via a PATCH status transition; `publishedAt` is stamped once, reverting is rejected, and a published release's tag is frozen while its title and notes stay editable.

---

# Q81. How do you compute "changes since the previous release"?

## High-Level Explanation

Deterministically, from the real commit graph — no AI. The detail endpoint collects every other tag's commit ID, walks this tag's commit's parent chain (bounded to 5000 steps) until it reaches a commit referenced by another tag — the nearest other tagged commit — then calls `getCommitsBetween(previous, current)` to list the commits in between, newest first, capped at 100. The response carries `previousTagName` and `changesSincePreviousTag`. Because it is a graph traversal, the same history always yields the same answer, and a first release reports an empty change list.

## Interview Closing Statement

Changes-since-previous-tag is a parent-chain walk to the nearest other tagged commit followed by `getCommitsBetween` — reproducible, testable, and AI-free.

---

# Q82. Why are release notes plain text rather than Markdown or HTML?

## High-Level Explanation

Notes must be stored and shown, not executed. Plain text with `white-space: pre-wrap` preserves author line breaks, has no XSS surface (no `dangerouslySetInnerHTML`, no Markdown-to-HTML pipeline), and avoids adding a rendering dependency for what is mostly changelog prose. When richer formatting is genuinely needed, a sanitized renderer can be introduced behind the same stored-text `description` field without a schema change.

## Interview Closing Statement

Release notes are plain stored text rendered with preserved whitespace — safe, dependency-free, and upgradeable to a sanitized renderer later without schema changes.

---

# Q83. Why is there no dedicated publish endpoint?

## High-Level Explanation

A separate `POST /releases/:id/publish` would duplicate the authorization and repository-scoping logic and create two code paths that could drift. The single `PATCH /releases/:releaseId` handler owns the whole lifecycle: editing drafts, the publish transition, and post-publish title/notes edits. One switch statement enforces every rule — stamp once, freeze the tag on publish, no unpublish — which makes the lifecycle audit-able in a single reviewable place.

## Interview Closing Statement

The publish transition lives on the existing PATCH handler alongside edits, so authorization, the publishedAt stamp, tag freezing, and the no-revert rule are enforced in one place.

---

# Q84. How do you prevent a release from referencing a tag in another repository?

## High-Level Explanation

By scoping every lookup to the repository in the URL. Both create and edit do `Tag.findOne({ repository: result.repository._id, name: tagName })` — the repository ID comes from `authorizeRepository`, never from the body. A tag that exists in another repository but not this one fails that query and returns 400 "Tag ... does not exist in this repository". The same scoping applies to release reads (`Release.findOne({ repository, _id })`), so a release ID from another repository returns 404.

## Interview Closing Statement

Tag and release lookups are always scoped to the repository in the URL, so a foreign tag fails with 400 and a foreign release with 404.

---

# Q85. How is authorization handled for tags and releases?

## High-Level Explanation

Identically to every other repository feature, via the shared `authorizeRepository(req, res, writeOperation)` prelude. Reads pass `false` and follow the existing policy — public repositories are readable by any authenticated user, private repositories by the owner. Every mutation passes `true`, making tag/release writes owner-only regardless of visibility. Identity always comes from the JWT (`req.user` via `protect`); the body never supplies ownership. The backend enforces all of this; the frontend only hides buttons it knows will fail.

## Interview Closing Statement

Tags and releases reuse the shared authorization prelude: reads follow public/private policy, all writes are owner-only, and identity comes exclusively from the JWT.

---

# Q86. How would you add release assets?

## High-Level Explanation

Only honestly, behind real infrastructure. The codebase currently has no object storage — no S3 bucket, no upload pipeline — so I would not fake assets. First, provision a storage layer (an S3 bucket with presigned PUT URLs, or a managed uploads directory), then add an asset model (`{ release, filename, size, contentType, key, uploadedBy }`), upload/download endpoints with size and type limits, and a UI list with download links. Delete policies and storage quotas would come with it. It is listed as a future improvement until that storage exists.

## Interview Closing Statement

Release assets need real object storage first — bucket or managed uploads — then an asset model, upload/download endpoints with limits, and a UI; shipping them without storage would mean faking it.

---

# Q87. How do you test tag/release behavior?

## High-Level Explanation

With an integration suite, `backend/tests/releaseTagSystem.test.js`, that runs the real HTTP stack: an `express` app with the real routes listening on an ephemeral port, `fetch` requests, a temp storage root so every repository and `.CommitHub` ref is isolated, a dedicated `commithub_release_test` database, and JWT tokens for an owner and another user. 28 cases cover creation (specific commit, HEAD resolution, invalid names, duplicates, nonexistent commits), listing/pagination, deletion (commit preserved, referenced tag blocked), releases (draft creation, missing title/tag, foreign tags, listing without description, detail with commit metadata, changes-since-previous-tag, edits, publish idempotency, tag freezing, authorization, isolation).

## Interview Closing Statement

A 28-case integration suite drives the real routes over HTTP with an isolated DB and temp storage, covering creation, listing, immutability, the release lifecycle, changes-since-previous-tag, authorization, and isolation.

---

# Q88. How do tags and releases compose with the existing branch/commit model?

## High-Level Explanation

They sit entirely on top of it and add no new commit machinery. Tags reuse the same `refs` directory convention as branches — `refs/tags/<name>` vs `refs/heads/<branch>` — so `ensureVersionControl` creates both. Tag/release reads reuse `getCommit`, `getCommitsBetween`, and the commit graph unchanged. Branches move as commits are made; tags freeze a point in time. A tag never participates in checkout or merging — it is a read-only pointer — and deleting a tag cannot disturb branch refs or commit history.

## Interview Closing Statement

Tags extend the existing refs convention beside branch refs and reuse the commit-graph utilities unchanged; they are read-only pointers that never participate in checkout or merging.

---

# Q89. What is the release → tag → commit chain and why does it matter?

## High-Level Explanation

A release stores a `tagName`; the tag stores a `commitId`; the commit lives in the filesystem. The chain guarantees a release's history is never fabricated or duplicated: the detail view resolves the commit live, so the displayed message, author, and date are always exactly what the tag points at, and "changes since previous tag" is derived from the same real graph. It matters because it keeps release history truthful by construction — a release cannot claim a commit it does not reference, and it cannot drift from the tags list.

## Interview Closing Statement

Release → Tag → Commit keeps release history derived from a single source of truth, so a release always reflects the exact commit its tag references and can never drift or fabricate history.

---

# Q90. How would you implement moving a tag to a newer commit?

## High-Level Explanation

Tags are immutable, so there is no move endpoint — the honest workflow is delete + recreate, and the delete endpoint already guards the dangerous case: a tag referenced by a release cannot be deleted (400), so you cannot silently repoint released history. To support a deliberate retarget, I would add an explicit action, not an edit: e.g., `POST /tags/:name/retarget` with a new `commitId`, applied only while no release references the tag, and logged. Draft releases can already retarget simply by changing the release's `tagName`.

## Interview Closing Statement

Tags are moved by delete + recreate, with release-referenced tags protected from deletion; a deliberate retarget action with logging would be the way to formalize it, while drafts can already retarget via `tagName`.

---

# Feature 09 Interview Closing Statement

Releases & Tags add a truthful versioning layer on top of the commit engine: tags are immutable, flat-named references written as exclusive `wx` filesystem refs under `.CommitHub/refs/tags` and mirrored by a unique-indexed MongoDB document, so a tag always points at a verified, existing commit and can never be overwritten or silently moved. Releases are draft/published metadata that reference a tag (never a commit snapshot), resolve their commit and their AI-free "changes since previous tag" live from the commit graph, render notes as safe preserved-whitespace plain text, and enforce the whole lifecycle in a single PATCH handler — stamp `publishedAt` once, freeze the tag on publish, never unpublish, and block deleting any release-referenced tag. Everything is owner-gated for writes and public/private-gated for reads, verified by a 28-case integration suite against an isolated database and temp storage, with the Releases tab (list, filter, paginate, create with choose-or-create tag, detail, edit, publish) wired into the repository UI and the whole backend suite green at 296/296.


# Q91. What is an activity feed and how does it differ from notifications?

## High-Level Explanation

An activity feed is a durable, immutable history of events scoped to a repository — commits, branches, issues, comments, pull requests, reviews, merges, tags, releases, and stars. Notifications (Feature 10) are recipient-specific, ephemeral, read-stateful messages ("someone mentioned you"); activity is not addressed to anyone in particular — it records what happened, and who did it. Both are produced from the same triggering event (a star produces both a notification to the repo owner and an activity record), but they are stored separately and neither depends on the other. Activity also outlives the user it "belongs to" for the actor field: it is a fact about the repository.

## Interview Closing Statement

Activity is a durable repository-scoped event history produced as a side effect of the same writes that generate notifications, but stored and read independently from any recipient model.

---

# Q92. What activity types exist and how are they recorded?

## High-Level Explanation

Twelve types form the `ACTIVITY_TYPES` enum in the Activity model: REPOSITORY_CREATED, REPOSITORY_STARRED, BRANCH_CREATED, COMMIT_CREATED, ISSUE_CREATED, ISSUE_COMMENTED, PR_CREATED, PR_COMMENTED, PR_REVIEWED, PR_MERGED, TAG_CREATED, and RELEASE_PUBLISHED. Each existing controller records exactly the events it produces: repoController logs creation and starring, commitController logs commits, issueController and commentController log issues and issue comments, pullRequestController logs PR open/comment/review/merge, branchController logs branches, tagController logs tags, and releaseController logs the publish transition. Recording is one best-effort `createActivity(...)` call placed immediately after the primary operation succeeds, so the record is always in sync with the event.

## Interview Closing Statement

The enum of twelve event types is recorded by one call in each producing controller immediately after the operation succeeds, so the feed always reflects what the platform actually did.

---

# Q93. Why does activity creation never throw?

## High-Level Explanation

`createActivity` validates minimal invariants (actor and repository present, type in the enum) and returns `null` on any problem instead of throwing. All database errors are caught, logged, and swallowed. The contract is explicit: activity is a fire-and-forget side effect, so a commit that succeeds is a success even if the feed write fails. This keeps feed health decoupled from feature health — a database hiccup in the activity collection cannot turn a 201 commit into a 500, and the controller response is never delayed waiting for the feed.

## Interview Closing Statement

Activity writes are best-effort by contract — they validate, catch, and swallow errors and never throw — so feed health can never break or slow down the primary operation.

---

# Q94. What repositories appear in a user's global feed?

## High-Level Explanation

Exactly the repositories the user is authorized to read: repositories they own plus public repositories (the same owner-or-public rule as the rest of the platform). The feed resolves this set on every request — owned repos from `Repository.find({ owner: userId })` plus `Repository.find({ visibility: "public" })` — and constrains the activity query with `repository: { $in: visibleIds }`. Because visibility is recomputed per request, a repository that becomes private immediately disappears from every non-owner's feed.

## Interview Closing Statement

A user's feed contains activity only from repositories they own or that are public, recomputed on every request, so it can never expose more than the read API does.

---

# Q95. Why are starred repositories NOT included in the feed?

## High-Level Explanation

In CommitHub, starring is a bookmark — it grants no access. If starred repos were feed criteria, a repository that was starred while public and then made private would leak its activity to the star's feed, which the user no longer has any right to see. The same argument rules out "participated" (issues/PRs authored) and followed repos. The visibility floor is explicit in the controller: the feed must never reveal anything the read API would not. A dedicated opt-in "following" feed is possible later, but never by defaulting feed scope to non-access relationships.

## Interview Closing Statement

Starring and participation are not access grants, so using them as feed criteria would leak activity from repositories that became private — the feed is scoped strictly to owned-or-public.

---

# Q96. How do you prevent a private repository's activity from leaking?

## High-Level Explanation

Two layers. First, the repository feed endpoint calls `authorizeRepository(req, res, false)` before touching any activity, so a non-owner requesting a private repo gets 403 with no query executed. Second, the global feed never queries per-repo at all — it pre-computes the visible set from current repository visibility and restricts the whole query with `repository: { $in: [...] }`. There is no path by which a user can request activity for a repo they cannot read, and even activity that predates a visibility change is hidden because the scope is recomputed per request.

## Interview Closing Statement

Private activity is protected by authorizing the repository before the repo feed runs and by scoping the global feed to a per-request computed owned-or-public set.

---

# Q97. How is the actor of an event determined, and can it be spoofed?

## High-Level Explanation

The actor is always `req.user._id` read from the authenticated request in the controller that triggered the event; it is never taken from the request body or from client-supplied data. The `createActivity` signature takes `actor` as a parameter, and every controller passes `req.user._id`. Because the JWT is verified by the `protect` middleware before any controller runs, a client can claim to be someone else only by holding that user's token — there is no way to write an activity record claiming a different actor. A direct test asserts that a forged actor value is ignored/rejected.

## Interview Closing Statement

The actor is always derived server-side from the authenticated request, so activity authorship cannot be spoofed through the API.

---

# Q98. How do you prevent duplicate activity for the same logical event?

## High-Level Explanation

Duplicate prevention happens at the controller level for the operations that can legally be re-issued. A star uses a raw `$addToSet` on the user's star list and only logs when `modifiedCount === 1`, so repeated star requests do not re-log. A merge transitions the pull request to `merged` once and the merge guard rejects a second merge, so `PR_MERGED` is single-shot. A release only logs `RELEASE_PUBLISHED` when `wasPublishedBefore` is false — the draft→published transition — so editing an already-published release is silent. There is no global idempotency key: two genuinely separate commits should produce two activity records.

## Interview Closing Statement

Repeatable operations are guarded at the controller (first-star only, merge-once, publish-once), and a genuinely repeated event legitimately produces a second record.

---

# Q99. How does type filtering work, and why comma-separated lists?

## High-Level Explanation

The `type` query parameter accepts either one enum value (`type=PR_MERGED`) or a comma-separated list (`type=ISSUE_CREATED,ISSUE_COMMENTED`), which is split, trimmed, and compiled into `{ type: { $in: [...] } }`. Every value is validated against the enum; an unknown value or an empty list returns 400 "Invalid activity type" rather than being silently ignored. The design lets the frontend render grouped filter chips (All, Commits, Issues, Pull Requests, Releases, Branches) as a single request — each group is one comma-joined list — instead of firing multiple queries.

## Interview Closing Statement

Type filtering validates every value against the enum and uses comma-separated lists compiled to an `$in`, letting the UI express grouped filters in one request.

---

# Q100. How is pagination handled, and why offset rather than cursor?

## High-Level Explanation

Both endpoints use page/limit offset pagination with a parallel `countDocuments`, returning `{ activities, total, page, limit, pages }`. `limit` defaults to 20 and is clamped at 100; `page` is 1-based. Offset pagination is used because it is the established pattern across the platform (issues, PRs, tags, releases, notifications), keeping the API consistent. Its instability under concurrent inserts is mitigated by the `createdAt desc, _id desc` tiebreaker, which keeps page boundaries stable even for same-millisecond events. Cursor pagination is a documented future improvement for deep pages.

## Interview Closing Statement

Activity uses the platform's consistent offset page/limit envelope with a stable sort tiebreaker; cursor pagination is deferred as a documented future improvement.

---

# Q101. How is ordering made stable for pagination?

## High-Level Explanation

Sorting is `.sort({ createdAt: -1, _id: -1 })`. `createdAt` gives the newest-first ordering, and `_id` (a monotonically increasing ObjectId) breaks ties when two events land in the same millisecond. Without the tiebreaker, two same-timestamp events could flip order between requests, causing pages to skip or duplicate entries. The compound sort guarantees every page boundary is deterministic, so paginating through the feed with concurrent writes stays consistent.

## Interview Closing Statement

The `createdAt desc, _id desc` sort makes newest-first ordering deterministic even for same-millisecond events, keeping pagination exact.

---

# Q102. How do you handle deleted referenced entities (an issue or PR that is gone)?

## High-Level Explanation

Activity records store both a direct reference to the entity (issue, pullRequest, tag, release) and free-form `metadata` (titles, numbers, names). At read time the controller populates the references; if an entity has been deleted, the populate resolves to `null` and the activity document still renders. The frontend prefers the populated entity but falls back to the `metadata` fields (e.g. `issueTitle`, `pullRequestNumber`), so "commented on issue #3" still reads correctly long after the issue is deleted. The event is history, not a live reference.

## Interview Closing Statement

Activity survives entity deletion because it stores display metadata alongside references and falls back to it when populate resolves to null.

---

# Q103. What indexes support the feed, and why these three?

## High-Level Explanation

The model declares `{ repository: 1, createdAt: -1 }`, `{ actor: 1, createdAt: -1 }`, and `{ createdAt: -1 }`. The first serves per-repository feeds (the repo endpoint's `repository` filter plus the newest-first sort) and the per-repo portion of the global `$in`. The second serves any future per-actor feed. The third keeps the global newest-first sort from degrading as the collection grows. Each index matches a real query pattern, so no index is decorative.

## Interview Closing Statement

Three indexes — repository+createdAt, actor+createdAt, and createdAt — each map to an actual feed query pattern.

---

# Q104. How is authorization enforced on the repository activity endpoint?

## High-Level Explanation

`GET /api/repositories/:id/activity` calls `authorizeRepository(req, res, false)` before parsing pagination or running any query. The helper resolves the repository and applies the platform rule: owner or public for reads, owner-only for writes. On success it returns the repository; on failure it writes the 403 (private repo, non-owner) or 404 (missing repo) response itself, and the handler returns early. Authorization is thus enforced before any activity document is touched, so a private repository's history is never even queried by an unauthorized user.

## Interview Closing Statement

The repository activity endpoint authorizes the repository before running any query, so unauthorized or missing-repo requests never touch activity data.

---

# Q105. What happens if the activity write fails during a commit?

## High-Level Explanation

Nothing. `createActivity` catches and logs the database error and returns null; `createCommit` ignores the return value and proceeds to respond 201 with the commit. This is the explicit best-effort contract. The trade-off is that a missed activity record is never retried and could in theory be lost — acceptable at this scale, with a durable outbox listed as the future fix. The alternative (joining the activity write to the operation's transaction) would let a feed failure break core features, which is worse.

## Interview Closing Statement

A failed activity write is logged and swallowed, so a commit always succeeds even if the feed write fails; the gap is closed later with an outbox.

---

# Q106. How does the frontend consume the activity API?

## High-Level Explanation

`src/api/activityApi.js` wraps the two endpoints through the existing axios instance, which attaches the JWT via its interceptor. `src/utils/activityUtils.js` centralizes the rendering logic: `ACTIVITY_GROUPS` maps filter chips to comma-joined type strings, `buildActivityText` turns a record into a sentence, `activityTarget` computes navigation (issues to `/issues/:id`, everything else to `/repo/:id` with a `location.state.tab` deep link), and `formatRelativeTime` produces the relative timestamps already used elsewhere. A single `ActivityItem` component renders both the timeline variant (Activity page, repo tab) and the compact panel variant (dashboard), so the three surfaces share one code path.

## Interview Closing Statement

A thin API client, shared rendering/navigation utilities, and a two-variant ActivityItem component let the Activity page, dashboard panel, and repository tab all consume the same feed consistently.

---

# Q107. How does an activity entry navigate to the right repository tab?

## High-Level Explanation

Issues deep-link to `/issues/:id` since issues have their own page. Everything else targets `/repo/:id` and passes React Router `location.state.tab` (e.g. `pull-requests`, `releases`, `commits`, `branches`). `RepositoryPage` initializes its `activeTab` from `location.state?.tab` with a fallback to "code", so a click on "merged pull request #4" lands directly on the Pull Requests tab rather than the code view. This avoids building deep routes for PR/tag/release/commit/branch detail pages that do not exist yet.

## Interview Closing Statement

Activity entries carry a location-state tab hint that RepositoryPage consumes to initialize the active tab, deep-linking to the right surface without new routes.

---

# Q108. How are the dashboard and the Activity page different in rendering?

## High-Level Explanation

Both read the same global feed but use different variants of ActivityItem. The dashboard calls `fetchActivity({ limit: 5 })` and renders panel items — a dot, the sentence, and a relative time — inside the "Recent activity" sidebar, replacing previously hardcoded sample data. The Activity page (and the repository tab) render the full timeline variant — colored dot per type, actor + action + repo name, relative time, and filter chips for All/Commits/Issues/Pull Requests/Releases/Branches plus Previous/Next pagination. Same data, same helpers, two presentation densities.

## Interview Closing Statement

The dashboard shows the five most recent items as compact panel cards while the Activity page renders the full filterable, paginated timeline — sharing helpers and components.

---

# Q109. How would you add a new activity type in the future?

## High-Level Explanation

Three coordinated edits: add the value to the `ACTIVITY_TYPES` enum in the Activity model (which auto-validates all writes and reads), call `createActivity` in the controller that produces the event, and extend the frontend's `buildActivityText`, `activityTarget`, and `activityDotClass` mapping. Filtering, pagination, and authorization need no changes because they are driven by the enum and generic query logic. This is a small surface because the enum is the single source of truth.

## Interview Closing Statement

A new type is one enum value plus one createActivity call plus the frontend text/navigation mapping — everything else is generic.

---

# Q110. How would you scale the global activity feed?

## High-Level Explanation

At scale the bottleneck is the `repository: { $in: visibleIds }` scan and the unbounded collection. The path is: shard or partition the Activity collection (e.g. by repository or by time bucket); move the global feed to cursor pagination on a `createdAt + _id` composite cursor; add a per-user feed collection that is written to (or projected into) on event creation so reads are a single indexed lookup instead of a broad `$in`; and add retention/archival to bound growth. The visibility rule stays — the per-user projection is still limited to owned-or-public repos at write time.

## Interview Closing Statement

The feed scales by sharding and time-bucketing the collection, cursor-based deep pagination, and a denormalized per-user projection that preserves the owned-or-public visibility rule.

---

# Q111. Why store metadata alongside the entity references?

## High-Level Explanation

A feed must read correctly even when the entity it describes is gone. The references (issue, pullRequest, tag, release) are ideal for populating live names, but once deleted they resolve to null. `metadata` carries the display details — `issueTitle`, `pullRequestNumber`, `reviewState`, `tagName`, `releaseTitle`, `commitMessage`, `branchName` — captured at event time, so the UI can render a full sentence from metadata alone. This makes activity a self-sufficient historical record rather than a view that depends on live data.

## Interview Closing Statement

Metadata snapshots the display details at event time so the feed stays readable after referenced entities are deleted.

---

# Q112. How is the activity feed tested?

## High-Level Explanation

A 36-case integration suite (`backend/tests/activitySystem.test.js`) runs against an isolated test database and a temp storage root, hitting the running Express server over HTTP with real JWT auth. It covers every recorded event type, actor-spoof rejection, createActivity validation, repo-feed authz (401/403/404/400), global feed ordering/pagination/filtering, the comma-separated filter, and the privacy guarantee — a repo made private after being starred must not leak to a non-owner's feed. The full backend suite is green at 366/366.

## Interview Closing Statement

A 36-case HTTP integration suite verifies every event type, authorization, ordering, pagination, filtering, and the private-repo privacy guarantee, with the full backend suite green at 366/366.

---

# Q113. What are the current limitations of the feed?

## High-Level Explanation

Activity writes are not queued or retried, so a failed write is dropped. There is no end-to-end idempotency key (repeatable controllers guard their own operations, but a genuinely repeated write legitimately creates a second record). Pagination is offset-based, which is stable only with the `_id` tiebreaker under concurrent inserts. The collection is append-only with no retention policy. And a user with an enormous visible repo set forces a broad `$in`. All are acceptable at current scale and each has a documented future path.

## Interview Closing Statement

The feed's limits are dropped-on-failure writes, no global idempotency key, offset pagination, unbounded growth, and a broad $in for large visible sets — all acceptable now and all addressed in the future work list.

---

# Q114. How does activity compose with the platform's authorization model?

## High-Level Explanation

Activity reuses the exact rule already proven elsewhere: `authorizeRepository` for the per-repo feed (owner-or-public reads) and the same owner-or-public predicate to build the global feed's scope. Because the scope is computed from current visibility on every request, activity inherits every access-revocation decision the rest of the platform already enforces — making a repo private immediately hides its history everywhere. No new authorization concept was introduced; the feed is a read surface on the existing model.

## Interview Closing Statement

Activity adds no new authorization — it composes the existing owner-or-public read rule, recomputed per request, so revoking access hides history everywhere at once.

---

# Q115. How would you build a "Following" or per-user-only feed?

## High-Level Explanation

The current feed is repository-scoped. A per-user feed would be an explicit opt-in surface: a follow relationship (stored like the existing star list) whose visibility is an access grant, unlike stars. The scope computation would become owned ∪ public ∪ explicitly-followed-with-access, and a `scope=mine` filter (or a `followedBy` query on actor) would isolate events. The key guard is that follow grants access explicitly and visibly, so the leakage argument that excludes stars does not apply. The data model already has the actor index to support this.

## Interview Closing Statement

A following feed adds an explicit, access-granting follow relationship to the owned-or-public scope and filters by actor, reusing the existing actor index.

---

# Q116. How does the activity feed handle being read during heavy concurrent writes?

## High-Level Explanation

Writes and reads are independent. Activity records are insert-only (never updated after creation), so concurrent reads see a consistent newest-first snapshot via the compound sort; the `_id` tiebreaker keeps pagination stable under inserts landing mid-page. The parallel count+page query keeps response time bounded by the slower of the two. The only tension is offset-pagination drift under inserts, mitigated but not eliminated, and the write path is intentionally decoupled so feed reads never block or are blocked by the operations that create events.

## Interview Closing Statement

Insert-only records, a stable compound sort, and a decoupled best-effort write path keep concurrent reads consistent and never let feed health affect the writes that produce events.

---

# Feature 11 Interview Closing Statement

Activity Feed turns the platform's own writes into a durable, queryable history: one best-effort `createActivity` call in each producing controller (stars, branches, commits, issues, comments, PR open/comment/review/merge, tags, releases) writes an immutable, index-backed record that is served newest-first by two endpoints — the user feed scoped to owned-or-public repositories recomputed per request, and a per-repository feed authorized via `authorizeRepository` before any query — with page/limit pagination, enum-validated comma-separated type filters, and `_id`-stable ordering. Privacy is the load-bearing decision: starring and participation are not access grants, so they never widen the feed, and a repo made private immediately vanishes from every non-owner's feed. The frontend replaces its hardcoded lists with a shared API client, text/navigation utilities, and a two-variant ActivityItem used by the Activity page, the dashboard's Recent activity panel, and a new repository Activity tab that deep-links to the right tab via location state. Verified by a 36-case HTTP integration suite (every event type, authz 401/403/404/400, ordering, pagination, filters, and the private-repo leak test) with the full backend suite green at 366/366 and a clean frontend build.

---

# Q117. What is a pull request?

## High-Level Explanation

A pull request is a repository-scoped proposal to merge the commits on one branch (the source) into another (the target). In CommitHub it is a `PullRequest` document — number, author, source/target branches, title, description, status, embedded reviews and comments — whose commit list and diff are recomputed live from the branch refs at read time. It is a reviewable unit of work: reviewers leave decisions on it, and only the repository owner can merge it. The PR is a *proposal*, not a copy: it stores branch names, and its content always reflects the current state of those branches.

## Interview Closing Statement

A PR is a proposal to merge one branch into another, stored as metadata that always re-derives its commits and diff from the live branch refs.

---

# Q118. Why use a pull request instead of committing directly to main?

## High-Level Explanation

Committing directly to `main` gives no review checkpoint and no audit trail of who reviewed what before a change landed. A PR moves the review decision upstream: the work lives on its own branch, reviewers can approve or request changes, the owner decides when it merges, and the merged PR records who merged it, when, and which commit it produced. The cost is process overhead — an extra branch and a merge step — but the benefit is that unreviewed changes never reach the default branch by accident, and the platform gets durable activity/notification events for every step.

## Interview Closing Statement

PRs gate changes behind a review checkpoint and produce a durable decision/merge record, at the cost of an extra branch and merge step.

---

# Q119. What are branches?

## High-Level Explanation

A branch is a named pointer to one commit in the repository's graph — in CommitHub, a single ref file `.CommitHub/refs/heads/<name>` containing a commit id. Creating a branch is cheap because it is just another pointer; the graph stays shared until the branches actually diverge by adding different commits. Branches are the unit of PR source/target, so a PR is fundamentally "merge the pointer X into pointer Y" with all the graph machinery underneath.

## Interview Closing Statement

Branches are named commit pointers; because they are just refs, branching is cheap and a PR is a pointer-to-pointer merge proposal.

---

# Q120. What is the purpose of a PR review?

## High-Level Explanation

A review is a dated, attributed decision on a PR — approved, changes requested, or commented — recorded in the embedded `reviews` array. Its purpose is to serialize human judgment about a change before it merges: the author sees a named decision with an optional comment, and a derived review state (changes_requested wins over approvals) tells everyone the PR's status at a glance. The state is derived from the actual reviews on read, never stored as a hand-editable flag, so the badge can never lie about the history. Reviews are advisory in CommitHub: the owner may still merge a PR with requested changes.

## Interview Closing Statement

Reviews attach dated, attributed decisions to a PR, and the visible review state is always derived from those decisions rather than stored separately.

---

# Q121. What does it mean to merge a pull request?

## High-Level Explanation

Merging integrates the source branch into the target branch. CommitHub performs a real fast-forward: because the merge engine is filesystem-based, it validates that the target is an ancestor of the source (otherwise the branches have diverged), then rewrites the target ref file to the source tip and updates the working tree if the target is checked out. The PR is marked `merged` with `mergedBy`, `mergedAt`, `mergeSourceCommitId`, and `mergeCommitId`. It is a real pointer movement over real commits — the diff the PR showed is now on the target branch.

## Interview Closing Statement

Merging fast-forwards the target ref onto the source tip and records who merged, when, and the resulting commit id.

---

# Q122. How does a PR's state transition between open, closed, merged, and reopened?

## High-Level Explanation

A PR is created `open` — the only creatable state. From open it can be closed (author or owner) or merged (owner only). A closed PR can be reopened (author or owner), which returns it to `open`; a merged PR is terminal and cannot be closed or reopened. Every transition is server-side guarded: closing a closed/merged PR, reopening an open/merged PR, or merging anything but an open PR returns a specific `400`. Closing/merging releases the branch pair so the same branches can be proposed again in a new PR.

## Interview Closing Statement

open → close → reopen is reversible by author/owner, merge is terminal and owner-only, and every illegal transition is rejected server-side.

---

# Q123. Can a closed pull request be reopened?

## High-Level Explanation

Yes — the `reopenPullRequest` endpoint flips a `closed` PR back to `open`, and only an author or the repository owner may do it. Reopening re-arms the duplicate-PR guard on that branch pair, re-enables reviews and comments in the UI, and emits `PR_REOPENED` activity plus a notification to the author. It is a first-class transition with its own events, not a silent status flip, so feeds and notifications stay truthful.

## Interview Closing Statement

Yes — closed PRs reopen via author/owner, re-arming the duplicate guard and emitting their own activity and notification.

---

# Q124. What happens if the source branch is deleted before the PR is merged?

## High-Level Explanation

The PR document survives: it stores branch *names*, and detail reads wrap `getBranchCommitId` in try/catch, returning `sourceBranchExists: false` and a null `sourceCommitId` so the view still renders. Because there is no source tip, the commit list and diff come back empty and any merge attempt fails with `400 "Source branch … no longer exists"`. This is deliberate — deleting a branch is destructive, and the PR must degrade gracefully rather than crash or fabricate content.

## Interview Closing Statement

The PR still renders with a missing-source flag, but it cannot be merged because there is no source tip to integrate.

---

# Q125. What are the main schema fields of a pull request, and why are reviews and comments embedded?

## High-Level Explanation

The main fields are `number`, `repository`, `author`, `sourceBranch`, `targetBranch`, `title`, `description`, `status`, plus the merge record (`mergedAt`, `mergedBy`, `mergeSourceCommitId`, `mergeCommitId`) and embedded `reviews`/`comments` arrays. Reviews/comments are embedded — not a separate collection like issue comments — so the PR detail endpoint loads the entire conversation in one query and the document is self-contained. The trade-off is document growth on unusually long-lived PRs, with a documented escape hatch of moving to a collection if that ever bites.

## Interview Closing Statement

The schema captures who proposed, what, from which branch, its state, its merge record, and its embedded reviews and comments — all loadable in one query.

---

# Q126. Who can create a pull request in CommitHub?

## High-Level Explanation

Any authenticated user with *read* access to the repository — the owner always, and any user on a public repository. The controller calls `authorizeRepository(req, res, false)`, so a non-owner on a private repo gets `403` before any PR is created, and a non-owner on a public repo can legitimately open a PR. This matches GitHub semantics (contributors propose, maintainers merge): create is read-authorized, merge is write/owner-authorized. The frontend now shows the "New pull request" button to all viewers and lets the backend enforce the real rule.

## Interview Closing Statement

Anyone with read access to the repo can open a PR (owner, or any user on a public repo); private repos are blocked by authorizeRepository.

---

# Q127. Why is the author always taken from the token and never from the request body?

## High-Level Explanation

Trusting a client-supplied author field would let anyone create PRs "as" someone else, corrupting review attribution, notifications, and the activity feed. The controller reads `req.user._id` from the JWT-verified user and writes it to the document; the body is used only for title/description/branches. The same principle applies to reviewers and `mergedBy`. Server-side identity is the platform-wide rule — the frontend is treated as untrusted for identity and authorization.

## Interview Closing Statement

Identity is always derived from the verified JWT so attribution, notifications, and authorization can never be forged by the client.

---

# Q128. How do you prevent duplicate pull requests for the same branch pair?

## High-Level Explanation

Two layers. First, a friendly pre-check before allocation: if an `open` PR already exists for the same `(repository, sourceBranch, targetBranch)`, return `400` mentioning the existing `#N`. Second — because a pre-check alone has a read-then-write race — a partial unique index on `{repository, sourceBranch, targetBranch}` filtered to `status: "open"`. The database rejects the second concurrent insert (`E11000`), which the controller maps to the same duplicate message. The partial filter means the pair is reusable once the PR is closed or merged.

## Interview Closing Statement

A pre-check gives a clear error message and a partial unique index on open PRs makes the rule atomic; closed/merged PRs release the pair.

---

# Q129. Why is the PR number generated server-side with an atomic $inc?

## High-Level Explanation

Numbering must be monotonic and unique per repository, and it must not race. `Repository.findOneAndUpdate({ _id }, { $inc: { prCount: 1 } }, { returnDocument: "after" })` atomically claims the next value — two concurrent creates cannot read the same counter. A naive `find({ repository }).count() + 1` would hand the same number to concurrent requests and could reuse numbers after a delete. Because validation happens before the `$inc`, a rejected create never burns a number, and the `{repository, number}` unique index is the final guarantee.

## Interview Closing Statement

A single atomic $inc on the repository counter claims each number exactly once, so concurrent creates never collide and rejections never burn a number.

---

# Q130. Under concurrent PR creation, how is each PR guaranteed a unique number?

## High-Level Explanation

The `$inc` in `findOneAndUpdate` is atomic at the document level — Mongo serializes the increment, so two concurrent creates read different returned values and get different `number`s. The `{repository, number}` unique index then guarantees the invariant even if something else slipped through. The "allocates distinct numbers under concurrent creation" test proves it: two parallel creates return numbers `[1, 2]`. The same guarantee covers concurrent same-pair creates for duplicates — the partial unique index admits exactly one `201` and forces the other to `400`.

## Interview Closing Statement

The atomic counter plus the unique compound index guarantee distinct numbers under concurrency, verified by a parallel-create test.

---

# Q131. Can a PR number ever be reused?

## High-Level Explanation

No — numbers are append-only. The `$inc` never decrements and the `{repository, number}` unique index means a number, once allocated, can never appear on a different PR in the same repository. Even when a PR is closed or merged, its number stays taken; a new PR on the same branch pair gets the next number. This makes numbers stable identifiers that appear in URLs, notifications, and the activity feed forever.

## Interview Closing Statement

Numbers are never reused: the counter only increments and the unique index keeps every number bound to one PR.

---

# Q132. How does authorization work for pull requests?

## High-Level Explanation

Every PR route passes through `protect` (JWT → `req.user`) and `authorizeRepository`. Read-level operations (list, detail, create, review, comment) require read access — owner, or any user on a public repo. Update, close, and reopen additionally require being the author or the owner. Merge requires owner (write) authorization. This is enforced purely server-side; the UI only hides controls it knows will fail, and private repositories are fully gated so a non-owner never sees PR data.

## Interview Closing Statement

Read actions need owner-or-public read access, manage actions need author-or-owner, and merge needs owner — all enforced server-side.

---

# Q133. Why can't a non-owner merge a pull request?

## High-Level Explanation

Merge is the one PR action with write-level consequences — it moves a branch ref and rewrites the working tree, which is equivalent to pushing to the target branch. Granting it to any viewer would let a contributor mutate the repo's main branch without the owner's consent. So `mergePullRequest` calls `authorizeRepository(req, res, true)`, which is owner-only even on public repos, matching how the rest of the platform reserves destructive writes. The frontend explains this to non-owners ("Only the repository owner can merge…") rather than silently hiding it.

## Interview Closing Statement

Merging is a write that rewrites the target ref, so it is reserved for the owner — a non-owner gets 403 even on public repos.

---

# Q134. What is a fast-forward merge?

## High-Level Explanation

A fast-forward merge is the simplest legal merge: it applies only when the target branch is an ancestor of the source branch, meaning the target can simply "catch up" to the source tip with no new commit. `fastForwardMerge` verifies the graph (`isAncestorCommit`, `getMergeBase`), guards against a dirty working tree when the target is checked out, then rewrites the target ref to the source commit and applies the source snapshot to the tree. It produces no merge commit — history stays linear and every commit in the PR is exactly preserved.

## Interview Closing Statement

A fast-forward merges only when the target is an ancestor of the source, re-pointing the ref with no synthetic commit and preserving a linear history.

---

# Q135. What happens when branches diverge, and why return 409 instead of faking a merge?

## High-Level Explanation

Diverged means the target has commits the source lacks — the merge base is not the target — so a fast-forward is impossible. The merge returns `409` with `reason: "DIVERGED"` and leaves the PR open, telling the author the branches must be reconciled before merging. Returning `409` rather than inventing a result is the honest choice: fabricating a "merged" outcome without a real three-way merge would lie about the commit graph and the working tree, exactly the kind of fake Git behavior this project explicitly avoids.

## Interview Closing Statement

Diverged branches return 409 and stay open because fabricating a merge without a real three-way engine would corrupt the commit graph.

---

# Q136. Why is there no fake conflict detection in this system?

## High-Level Explanation

Real conflict detection requires a content-level three-way merge — comparing blob contents across the merge base and both tips and producing conflict markers. CommitHub's engine is fast-forward-only, so it never has two divergent snapshots to reconcile, and building a mock "conflict checker" that guessed at line conflicts would produce wrong answers with no safety net. The platform's standard is to do real Git operations or not claim them; since there is no three-way engine, diverged branches are simply rejected rather than half-detected.

## Interview Closing Statement

Without a real three-way engine, any conflict detection would be a guess, so the system truthfully rejects diverged branches instead.

---

# Q137. What would a real merge engine do that our fast-forward doesn't?

## High-Level Explanation

A real three-way merge computes the merge base, diffs base→source and base→target at the blob level, and where both sides changed the same region, produces a conflict the human resolves — then writes a merge commit with two parents. That engine could squash-merge or merge-commit divergent histories, render conflicts in the UI, and support rebase. The cost is a large amount of precise diff/merge machinery, which is exactly what this project's scope deliberately leaves out today, documented as the top future improvement.

## Interview Closing Statement

A real engine three-way merges divergent snapshots, produces true conflicts, and writes two-parent merge commits — the documented next step.

---

# Q138. What does the commit graph look like and how do parent pointers work?

## High-Level Explanation

Each commit is a file `.CommitHub/commits/<id>/meta.json` with `{ id, message, author, timestamp, parent, files }` plus a full snapshot. `parent` links every commit to its predecessor (null for the root), so the graph is a tree/DAG of hashed commits. `getCommitHistory` walks parents for a branch's history, `isAncestorCommit` and `getMergeBase` navigate the same graph to decide fast-forwardability, and content-derived ids make graph comparison cheap and deterministic.

## Interview Closing Statement

Commits form a parent-linked DAG with content-derived ids, and the same graph powers history, ancestry checks, and merge-base discovery.

---

# Q139. What is HEAD?

## High-Level Explanation

HEAD is a symbolic ref — `.CommitHub/HEAD` contains `ref: refs/heads/main` — identifying the currently checked-out branch. `getCurrentBranch` resolves it and `checkoutBranch` rewrites it when you switch. It matters to merging because a fast-forward into the checked-out branch must also update the working tree (and must refuse on a dirty tree), while merging into a non-checked-out branch touches only the ref file.

## Interview Closing Statement

HEAD is a symbolic ref to the active branch; the merge engine uses it to decide whether the working tree must be updated.

---

# Q140. What is a branch pointer?

## High-Level Explanation

A branch pointer is the commit id stored in `refs/heads/<name>`. The whole PR/merge model reduces to moving these pointers: a branch is its tip commit, two branches compare by walking from their tips, and a fast-forward is rewriting one ref to another commit id. Deleted branches are simply missing refs, which is why a PR can outlive its source branch but not merge against a missing tip.

## Interview Closing Statement

A branch is just a ref holding a tip commit id; merges are pointer movements, and the PR reads its content by following those pointers.

---

# Q141. How do you compare two branches to produce a PR's commit list and diff?

## High-Level Explanation

The detail endpoint reads both branch tips, then calls `getCommitsBetween(repoRoot, targetCommitId, sourceCommitId)` for the commits on the source not on the target, and `getCommitDiff(repoRoot, targetCommitId, sourceCommitId)` which walks the two full snapshots and reports added/deleted/modified files with hunks and line types. Both are computed on every detail read, so the PR always reflects the branches' *current* state — new commits pushed to the source appear immediately. The response carries `sourceCommitId`/`targetCommitId` plus `sourceBranchExists`/`targetBranchExists` for the deleted-branch case.

## Interview Closing Statement

The endpoint recomputes commits-between and a snapshot diff from the live branch tips on every read, so PR content is always current.

---

# Q142. Why does the PR list endpoint need pagination?

## High-Level Explanation

A repository can accumulate many PRs over time, and the default view shows only one status at a time. Returning every PR would grow the payload and the sort cost without bound, so the list uses `page`/`limit` (capped at 100) with a `total`/`pages` envelope, sorted by number descending so the newest proposal is first. Pagination also lets the status filter (`open`/`closed`/`merged`) remain cheap, since each page is bounded. Offset pagination is the documented trade-off: it can drift under inserts, but it is simple and matches the platform's existing list conventions.

## Interview Closing Statement

Pagination keeps list reads bounded and cheap, sorted newest-first, with the offset-drift trade-off accepted and documented.

---

# Q143. Why does the PR list need the {repository, status, number} compound index?

## High-Level Explanation

The list query filters by `repository` (always) plus an optional `status`, and sorts by `number` descending. A compound index with those exact fields in that order lets Mongo satisfy both the filter and the sort from one index, avoiding an in-memory sort and a collection scan. The existing `{repository, number}` unique index only covers the filter half and is kept for uniqueness — the new compound index targets the actual query shape. No index is added for a query that doesn't exist, like per-author listing.

## Interview Closing Statement

The compound index serves the list's filter-then-sort shape directly; indexes are only added for queries that actually exist.

---

# Q144. What happens if a user requests PR #N of a repository they don't own?

## High-Level Explanation

If the repository is private, `authorizeRepository` returns `403` before any PR lookup. If it is public, they may read the PR — that's the intended model (contributors review public proposals). Either way, the number is always scoped by repository: `findPullRequest` queries `{ repository: <id>, number }`, so asking for `…/repositories/B/pull-requests/5` can never surface repository A's PR #5. This closes the IDOR-style cross-repository access even if the client changes the number or repo id.

## Interview Closing Statement

Private repos return 403 up front, and every lookup is scoped to the URL's repository, so a number can never leak across repos.

---

# Q145. What if an attacker submits a review claiming to be someone else?

## High-Level Explanation

It can't be forged: `submitReview` stores `reviewer: req.user._id` from the verified JWT and ignores any reviewer/author in the body, same as comment authors and `mergedBy`. The stored decision is therefore attributable by construction, and the derived review state is computed from those attributed records. An attacker could at most review as themselves (or attempt to self-review, which is rejected), never as another user — that's the point of token-derived identity.

## Interview Closing Statement

Reviewers always come from the verified token, so review attribution and the derived review state cannot be forged.

---

# Q146. Why both a pre-check and a unique index for duplicate prevention?

## High-Level Explanation

They solve different problems. The pre-check produces the *good UX* — a clear "already exists (#N)" message pointing at the existing PR — and the unique index is the *correctness guarantee* under concurrency, because a pre-check can't stop two requests that both pass it before either writes. Together: fast, friendly rejections in the common case and an atomic backstop against races (the concurrent test asserts exactly one 201 and one 400). Defense in depth for a rule that's easy to state and hard to hold under load.

## Interview Closing Statement

The pre-check gives a clear message and the partial unique index makes the rule atomic, covering the read-then-write race.

---

# Q147. Why does a merge produce both an activity and a notification?

## High-Level Explanation

They serve different consumers. Activity (Feature 11) is the durable, repository-scoped event log anyone with access can read — "who merged #N" lives in the feed for the team's history. Notifications (Feature 10) are recipient-specific and ephemeral — the PR author needs to know their work merged, without it being visible to everyone. One event produces both because the platform treats the write result and the human-outreach as separate concerns; either side effect can fail without the merge being rolled back.

## Interview Closing Statement

Activity is durable history for anyone, notifications are targeted outreach to the author — one event produces both, independently.

---

# Q148. If the merge succeeds but the notification fails, is the merge rolled back?

## High-Level Explanation

No. The merge is the authoritative write — ref moved, PR marked merged — and notifications are best-effort by design (the same rule that protects stars, comments, and releases). The failure window only exists if the PR save itself fails after the ref moved, and *that* case has real rollback: `restoreBranchRef` puts the target ref (and tree, if updated) back. But a failed notification is never allowed to undo a successful merge; the author simply misses one alert, and the activity feed still records the truth.

## Interview Closing Statement

No — notifications are best-effort and can never roll back a successful merge; only the ref/PR save itself has rollback protection.

---

# Q149. When would you use a MongoDB transaction for a PR operation?

## High-Level Explanation

The PR's authoritative state is split across two stores: the commit engine lives on the filesystem (refs, snapshots) and the PR document lives in Mongo. A Mongo transaction can't cover the filesystem writes, so today the merge uses a ref write + PR update + best-effort `restoreBranchRef` rollback instead. A transaction would become valuable for a Mongo-only side effect — e.g., atomically marking a PR merged *and* updating a repository counter or a review aggregation in the same commit, where a torn write across two collections would corrupt both. In the current design, cross-store atomicity isn't achievable with Mongo alone.

## Interview Closing Statement

Mongo transactions can't span the filesystem merge engine, so rollback is best-effort; they'd help only if both PR state and counters lived purely in Mongo.

---

# Q150. How would you make PR updates appear in real time?

## High-Level Explanation

The naive approach is polling the list/detail on an interval, which wastes requests and lags. Better: Server-Sent Events (SSE) — one long-lived HTTP connection per open PR page over which the server pushes `pr.updated` events after reviews/comments/merge — simple, one-directional, and enough for a review board. Full duplex (live cursors, multi-user editing) would use WebSockets, at the cost of connection management and reconnection/ordering logic. Either way the DB write remains the source of truth and the push is a cache-invalidator, not a new write path.

## Interview Closing Statement

SSE per PR page covers the use case cheaply, with WebSockets as the heavier option if bidirectional live editing is ever required.

---

# Q151. How would you scale the PR system to millions of PRs?

## High-Level Explanation

The current design already keeps the hot paths narrow: list/detail are single indexed queries, review/comment bodies are embedded (bounded by PR size), and the diff is recomputed from refs rather than stored. Scaling up means (1) sharding PRs by `repository` — the natural affinity key, since every query starts with it; (2) moving review/comment history out of the embedded arrays into a collection when any PR grows unbounded; (3) caching diffs/commit lists per branch-pair with a TTL so repeated detail reads skip snapshot walks; (4) dedicated read replicas for feed/detail since writes are point updates; and (5) paginating with cursor-based keyset on `{repository, number}` instead of offset. The numbering `$inc` on the repository document becomes the shard-local bottleneck and would move to an id-service or range-allocator per shard.

## Interview Closing Statement

Shard by repository, hoist unbounded arrays into a collection, cache diffs, use read replicas and keyset pagination — and move number allocation to a per-shard range service.

---

# Feature 12 Interview Closing Statement

Pull Requests is a complete lifecycle on top of the real commit engine: any read-authorized user opens a PR between two branches (validated, duplicate-guarded by a pre-check *and* a partial unique index, numbered via an atomic `$inc`), reviewers append attributed decisions, a review state is derived from the actual reviews at read time, the owner fast-forwards the target ref in a genuine merge with rollback, and author/owner close or reopen — every transition emitting its own activity and notification. The Feature 12 work hardened the Feature 7 core: duplicate prevention (including the concurrent race and the reopen-collision `400`), a PATCH update endpoint, derived review state surfaced in a still-lean list, PR_CREATED/PR_CLOSED/PR_REOPENED/PR_REVIEWED/PR_MERGED activity + notifications, a justified compound index, and a frontend with review-state badges, an edit form, create for readers, and an honest "owner can merge" explanation. It is verified by a 93-case PR suite (22 new) with the full backend green at 388/388 and a clean build/lint on all touched frontend files.

---

# Q152. Why does the code browser read from commit snapshots instead of the working tree?

## High-Level Explanation

The working tree is mutable and unversioned. Once commits exist, the working tree may contain uncommitted changes that don't represent any consistent state — a user could be mid-edit, or an earlier commit could have partially updated files. Reading from snapshots gives a consistent, versioned view that matches exactly what the commit system stored. Every snapshot is a frozen copy of the entire repository at a point in time, so browsing any commit or branch always returns a coherent file tree. The working tree endpoints (`GET /tree`, `GET /file`) still exist for backward compatibility but the frontend exclusively uses the branch-aware endpoints.

## Interview Closing Statement

Snapshots provide a consistent, versioned view; the working tree may contain uncommitted or partially-applied changes that don't represent any single coherent state.

---

# Q153. How does the branch-to-file resolution chain work?

## High-Level Explanation

The chain is: branch name → `refs/heads/<branch>` file → commit ID → `commits/<commitId>/snapshot/` directory → file/folder. Specifically: `getBranchCommitId` reads the branch ref file to get the HEAD commit ID; `getSnapshot` or `getTreeAtSnapshot` reads the snapshot directory under that commit; and the file or listing is extracted from that snapshot. If the branch has no commits yet, the ref file is empty and the handler returns an empty tree (for listings) or `404` (for file reads). Default branch is `main` when none is specified.

## Interview Closing Statement

Branch name → ref file → commit ID → snapshot directory → file content. Each step is a simple filesystem read with no indirection or caching layer.

---

# Q154. What happens when two users try to edit the same file concurrently?

## High-Level Explanation

Each write endpoint accepts an optional `expectedHead` parameter containing the commit ID the client last saw on the branch. Before writing, the server reads the current branch HEAD. If `expectedHead` is provided and doesn't match the current HEAD, the server returns `409 Conflict` immediately — the branch moved since the client started editing. This is optimistic concurrency control: no locks, no persistent state, and the client can re-fetch the file and retry. If `expectedHead` is omitted, the write proceeds regardless (last-write-wins), which is acceptable for quick edits but loses the conflict detection.

## Interview Closing Statement

Optimistic concurrency via `expectedHead`: the server compares it to the current branch HEAD and rejects with `409` if the branch moved, letting the client re-fetch and retry.

---

# Q155. Why is path validation placed before the no-commits check?

## High-Level Explanation

A malicious path like `../../etc/passwd` should be rejected immediately, regardless of whether the branch has any commits. If path validation happened after the no-commits check, a branch with no commits would return an empty tree (or `404` for blob) *after* the path had already been validated — but more importantly, the order matters for the read endpoints where the no-commits return is `200` with empty entries. By validating the path first, the security boundary is hit before any branch-state logic runs, ensuring malicious input is never processed in any code path.

## Interview Closing Statement

Security checks should be the first thing evaluated in any request handler, before branch-state or commit-state logic, to ensure malicious input is rejected in every code path.

---

# Q156. How does create/edit/delete go through the commit system?

## High-Level Explanation

All three write operations follow the same pattern: (1) validate the path and content, (2) write the file to the working tree (create: write new file; edit: overwrite existing; delete: remove file), (3) call `createCommit(repoRoot, { message, author })` which snapshots the entire working tree and advances the branch ref, (4) create a `COMMIT_CREATED` activity event. On commit failure (e.g., the snapshot write fails), the controller reverses the working-tree change: create rolls back by deleting the file, edit rolls back by restoring `previousContent`, delete rolls back by re-creating the file. This ensures the working tree and the commit history stay consistent.

## Interview Closing Statement

Write to working tree → commit (snapshot + advance ref) → activity. On commit failure, reverse the working-tree change. The commit is the atomic boundary.

---

# Q157. Why is `resolveManagedPath` used for writes instead of `resolveRepoPath`?

## High-Level Explanation

Write operations need stricter validation than reads. `resolveManagedPath` wraps `resolveRepoPath` and adds two additional checks: (1) the repository root itself is not a valid write target (you can't "create" the root), and (2) anything inside `.CommitHub` is rejected (users shouldn't be able to create or modify version-control metadata through the file API). `resolveRepoPath` is sufficient for reads because browsing the root directory and seeing `.CommitHub` metadata (if it existed in the listing) is harmless — but writing there would corrupt the commit engine.

## Interview Closing Statement

Writes need stricter validation: the root itself and `.CommitHub` internals must be blocked, which `resolveManagedPath` enforces on top of `resolveRepoPath`.

---

# Q158. How does the file-history endpoint work?

## High-Level Explanation

`getFileHistoryForPath(repoRoot, path, { limit })` walks the commit history starting from the current branch HEAD. For each commit, it reads the snapshot and checks whether the specified file path exists in that snapshot's file list. Commits where the file is present are included in the results. The `changeType` (added/modified/deleted) is inferred from the `files` array stored in each commit's `meta.json`, which records what `getWorkingTreeChanges` detected at commit time. The endpoint supports a `limit` parameter (1–100, default 50) to bound the walk.

## Interview Closing Statement

Walk the commit history, check each snapshot for the file path, and return matching commits with their change metadata. Bounded by a configurable limit.

---

# Q159. What are the `tooLarge` and `binary` flags in the blob response?

## High-Level Explanation

`getFileAtSnapshot` in `repoVersion.js` first stats the file. If the size exceeds `MAX_FILE_SIZE` (1 MB), it returns `{ tooLarge: true, size }` without reading the content. If the file is under the size limit, it reads the content as UTF-8. If the content contains NUL bytes (`\0`), it returns `{ binary: true, size }` instead of the content. Both flags tell the frontend to display an appropriate message (file too large to display, or binary file with a download link) instead of attempting to render content. This prevents both memory exhaustion from large files and garbled output from binary files.

## Interview Closing Statement

`tooLarge` (>1 MB) prevents memory exhaustion; `binary` (NUL bytes detected) prevents garbled output. Both omit content and let the frontend render an appropriate fallback.

---

# Q160. How does the raw file endpoint differ from the blob endpoint?

## High-Level Explanation

The blob endpoint (`branch-blob`) returns a JSON response with content, metadata, and commit info — designed for the code viewer UI. The raw endpoint returns the file bytes directly as a binary stream with `Content-Type` (auto-detected MIME type), `Content-Disposition: attachment`, and `Content-Length` — designed for downloads and binary file serving. Both share the same path validation and authorization, but the raw endpoint never attempts to parse the content as text, so it works correctly for images, PDFs, and any other binary format.

## Interview Closing Statement

Blob returns JSON with text content and metadata for the UI; raw returns binary bytes with content-type headers for downloads. Same security, different response shape.

---

# Q161. Why does the frontend use `expectedHead` for write operations?

## High-Level Explanation

`expectedHead` provides optimistic concurrency control without locks. The frontend captures the current branch HEAD commit ID when it loads a file. When the user saves, it sends this as `expectedHead`. The server compares it to the current branch HEAD — if they match, no one else committed to the branch in the meantime, and the write proceeds. If they don't match, the server returns `409`, telling the user the branch moved and they need to re-fetch. This prevents lost updates in a collaborative editing scenario without the complexity of distributed locks or WebSocket-based coordination.

## Interview Closing Statement

Optimistic concurrency: capture the HEAD before editing, send it back on save, and let the server reject with `409` if someone else committed in the meantime.

---

# Q162. How is `getSnapshot` different from `getTreeAtSnapshot`?

## High-Level Explanation

`getSnapshot(vcRoot, commitId)` returns the full snapshot metadata: `{ root, files }` where `root` is the absolute path to the snapshot directory and `files` is a complete recursive listing of every file. `getTreeAtSnapshot(vcRoot, commitId, path)` is a filtered view: it reads only the entries within a specific directory `path` in the snapshot, returning `{ name, type, path, size }` for each entry. The blob endpoint uses `getFileAtSnapshot` (which calls `getSnapshot` internally) for individual file reads; the tree endpoint uses `getTreeAtSnapshot` for directory listings. Using `getTreeAtSnapshot` for listings avoids loading the entire file list into memory for large repositories.

## Interview Closing Statement

`getSnapshot` returns the full file list; `getTreeAtSnapshot` returns only entries within a specific directory path, avoiding full-repo enumeration for directory listings.

---

# Q163. What happens if the snapshot write fails during a commit?

## High-Level Explanation

In `createCommit` (repoVersion.js), the snapshot directory is created and files are copied inside a `try` block. If any file copy fails, the `catch` block runs `fs.promises.rm(commitDir, { recursive: true, force: true })` to delete the partially-created commit directory, then re-throws the error. The caller (the write endpoint's controller) catches this and reverses the working-tree change: create deletes the file, edit restores the previous content, delete re-creates the file. The branch ref is never updated if the snapshot write fails, because the ref write happens after the snapshot completes. This ensures the system is always in a consistent state — either the commit exists fully or not at all.

## Interview Closing Statement

The commit directory is rolled back on failure, the branch ref is never updated, and the controller reverses the working-tree change. The commit is an all-or-nothing operation.

---

# Q164. Why does the code browser need seven endpoints instead of fewer?

## High-Level Explanation

Each endpoint has a distinct request shape, response shape, and authorization level. Tree returns a list of entries; blob returns JSON content with metadata; raw returns binary bytes; file-history returns a commit list; create/edit/delete are write operations with different HTTP methods, body schemas, and validation rules (create checks existence, edit checks existence and reads previous content, delete checks existence and reads previous content for rollback). Merging any two would require the frontend to guess which response shape it got, and would complicate authorization (read vs write). The seven endpoints follow the existing REST convention of single-purpose routes with clear contracts.

## Interview Closing Statement

Distinct request/response shapes, authorization levels, and validation rules make separate endpoints clearer and safer than a single polymorphic endpoint.

---

# Q165. How does the frontend determine if a file is binary?

## High-Level Explanation

The frontend doesn't detect binary files itself. The `branch-blob` endpoint reads the file as UTF-8 and checks for NUL bytes. If found, it returns `{ binary: true }` without the content field. The frontend checks for this flag and renders a "Binary file" message with a download link instead of trying to display content. This is more reliable than extension-based detection because it actually inspects the bytes. The `raw` endpoint serves binary files directly with correct MIME types for downloads.

## Interview Closing Statement

The backend detects binary content by NUL-byte inspection and returns a `binary` flag; the frontend renders a download link instead of attempting to display content.

---

# Q166. How does nested file creation work (creating `src/utils/helper.js` when `src/` doesn't exist)?

## High-Level Explanation

The `createBranchFile` controller calls `fs.promises.mkdir(path.dirname(safePath), { recursive: true })` before writing the file. The `recursive: true` flag creates all intermediate directories. Then `fs.promises.writeFile(safePath, content)` writes the file. The subsequent `createCommit` call snapshots the entire working tree, including the newly created directories. This means users can create files at any depth without manually creating parent directories first — the filesystem handles it.

## Interview Closing Statement

`mkdir` with `recursive: true` creates all parent directories before writing the file; the commit then snapshots the entire working tree including the new structure.

---

# Q167. What is the `MAX_FILE_SIZE` constant and why is it defined in two places?

## High-Level Explanation

`MAX_FILE_SIZE` is 1 MB (1024 * 1024 bytes). It's defined in both `repoStorage.js` (for the old working-tree file endpoints) and `repoVersion.js` (for the snapshot-based blob endpoint). The `repoStorage.js` definition is used by `readTextFile` in the controller for the Feature 05 endpoints. The `repoVersion.js` definition is used by `getFileAtSnapshot` for the Feature 14 blob endpoint. They are the same value but can't share a single definition without creating a circular dependency between the two utility modules. The constants are intentionally duplicated to keep the modules independent.

## Interview Closing Statement

Both modules need the limit but can't share it without a circular dependency; the 1 MB constant is duplicated to keep the utility modules independent.

---

# Q168. Why does the branch listing need to be loaded before the code tree?

## High-Level Explanation

The code browser defaults to displaying the `main` branch. To do this, it first fetches the branch list from `GET /branches` to discover which branches exist and which is the default. Once the branch is selected, it fetches the tree from `GET /branch-tree?branch=<name>`. This two-step process ensures the branch selector dropdown is populated and the correct default is selected before any tree data is loaded. If the tree loaded first, the component wouldn't know which branch to display and might show the wrong branch's contents.

## Interview Closing Statement

The branch list determines which branch to display; the tree endpoint needs the branch name as a parameter, so branches must load first.

---

# Q169. How does the edit endpoint handle rollback on commit failure?

## High-Level Explanation

Before editing, the controller reads `previousContent` from the file. It then writes the new content to disk. If `createCommit` fails (e.g., snapshot write error), the `catch` block calls `fs.promises.writeFile(safePath, previousContent)` to restore the original content. This means a failed edit leaves the file exactly as it was before the edit attempt. The branch ref is never updated if the commit fails, so the file system and the commit history stay consistent. The same pattern applies to create (rollback by deleting the file) and delete (rollback by re-creating the file from `previousContent`).

## Interview Closing Statement

Read original content before editing; on commit failure, restore the original. The working tree is always consistent with the latest successful commit.

---

# Q170. Why does the raw endpoint detect MIME type from the file extension?

## High-Level Explanation

The `getMimeType` helper maps common file extensions to MIME types (`.js` → `application/javascript`, `.md` → `text/markdown`, `.png` → `image/png`, etc.) with a default of `application/octet-stream`. This is used to set the `Content-Type` header on the raw response. Extension-based detection is simple, predictable, and sufficient for a teaching project. Content-sniffing (inspecting file bytes) would be more accurate but also more complex and slower. The raw endpoint sets `Content-Disposition: attachment` to force a download regardless of the MIME type, so the Content-Type is primarily informational.

## Interview Closing Statement

Extension-to-MIME mapping is simple and predictable; `Content-Disposition: attachment` forces download regardless, so Content-Type is informational rather than security-critical.

---

# Q171. How does the cross-repository isolation test work?

## High-Level Explanation

The test creates two repositories (repo1 with a committed file, repo2 with no files), then attempts to read repo1's file through repo2's blob endpoint. This verifies that path tricks (like using `../` to escape repo2's directory and reach repo1's files) are blocked. The test works because: (1) each repo has its own storage root (`REPO_STORAGE_ROOT/<ownerId>/<repoId>/`), (2) `resolveRepoPath` validates that the resolved path stays within the repository root, and (3) the blob endpoint resolves the path against the specific repository's root. Even if someone crafted a path with `..` segments, the validation rejects it before any filesystem read occurs.

## Interview Closing Statement

Each repo has its own storage root; path validation enforces containment within that root, so cross-repo traversal via `..` is rejected before any filesystem access.

---

# Q172. What are the trade-offs of the full-snapshot-per-commit model?

## High-Level Explanation

**Advantages**: (1) Reads are simple and fast — any commit's file tree is a single directory listing, no patching or merging needed. (2) Each snapshot is self-contained and can be read independently. (3) Implementation is straightforward — no delta encoding, no patch application, no merge conflict resolution at read time.

**Disadvantages**: (1) Disk usage is O(commits × files) — every commit stores a full copy of every file. For a repository with many files and many commits, this grows quickly. (2) Creating a commit requires copying every file, even unchanged ones. (3) Cleanup of old commits requires deleting their snapshot directories.

For a teaching project, the simplicity advantage outweighs the storage cost. In production, delta encoding (like Git's packfiles) or content-addressable storage would reduce disk usage at the cost of read-time reconstruction.

## Interview Closing Statement

Full snapshots trade disk space for read simplicity; each commit is self-contained with no patch/merge logic. This is appropriate for a teaching project but would need delta encoding at production scale.

---

# Feature 14 Interview Closing Statement

The code browser is the primary interface for repository contents, now reading from versioned commit snapshots instead of the mutable working tree. Every file operation resolves through a strict chain — branch → ref → commit → snapshot → file — with path validation at every layer. Write operations (create/edit/delete) go through the commit system, producing versioned commits with optimistic concurrency control. The implementation adds seven endpoints and 62 security tests without breaking any existing functionality, demonstrating that versioned file browsing can be layered cleanly on top of an existing commit engine without modifying its core.

---

# Q173. How does the branch comparison endpoint determine whether two branches have diverged?

## High-Level Explanation

The comparison endpoint resolves both branch names to their tip commit IDs, then finds the common ancestor (merge base) using BFS traversal of the commit DAG. It then checks whether the base tip is a direct ancestor of the head tip. If the base is an ancestor, the head is simply "ahead". If the base is NOT an ancestor, it counts commits on each side that are not reachable from the ancestor. If both sides have unique commits (ahead > 0 AND behind > 0), the branches have diverged. The common ancestor is the deepest commit reachable from both tips.

## Interview Closing Statement

Find the common ancestor via DAG traversal; if both branch tips have commits not reachable from the ancestor, the branches have diverged.

---

# Q174. Why does the comparison engine use BFS instead of DFS for finding the common ancestor?

## High-Level Explanation

BFS (breadth-first search) is used because it naturally finds the SHALLOWEST common ancestor first, which is the most relevant merge base. DFS could find a deeper ancestor if one branch has a merge commit with multiple parents, leading to incorrect results. BFS also handles the case of merge commits (multiple parents) correctly — it explores all parent edges at each level, ensuring no reachable commit is missed. The visited set prevents infinite loops in case of any cyclical references (which shouldn't exist in a well-formed DAG but are defended against).

## Interview Closing Statement

BFS finds the shallowest common ancestor first, which is the correct merge base; it also handles merge commits with multiple parents correctly.

---

# Q175. What does the `parents` array field in commit metadata enable?

## High-Level Explanation

The `parents` array extends the single-parent commit model to support merge commits (commits with two or more parents). For regular commits, `parents` is `[parentCommitId]` and `parent` remains as `parents[0]` for backward compatibility. For merge commits, `parents` contains two or more commit IDs representing the branches being merged. All existing code that reads `metadata.parent` continues working because the scalar `parent` field is always set to `parents[0]`. New code that needs full DAG traversal (like `isAncestorCommit`, `getMergeBase`) reads the `parents` array and follows all parent edges.

## Interview Closing Statement

The `parents` array supports merge commits with multiple parents while keeping the existing `parent` scalar for backward compatibility.

---

# Q176. How does the comparison engine handle repositories with no common ancestor between branches?

## High-Level Explanation

If the BFS traversal finds no common ancestor (the ancestor sets don't intersect), `getMergeBase` returns null. In this case, `findCommonAncestor` returns `{ ancestorId: null, isDirectAncestor: false }`. The comparison still computes ahead/behind counts by treating the ancestor as null — effectively counting ALL commits on each side as unique. The status will be "diverged" since neither side is an ancestor of the other. The common ancestor field in the response will be null, signaling to any downstream merge system that a three-way merge base is unavailable.

## Interview Closing Statement

When no common ancestor exists, all commits on each side are counted as unique; the common ancestor is null and status is "diverged".

---

# Q177. Why is the `getCommitDiff` function called with `targetCommitId` as the base and `sourceCommitId` as the head?

## High-Level Explanation

The diff direction matters: `getCommitDiff(repoRoot, baseCommitId, headCommitId)` shows what changed going FROM base TO head. When comparing `base=main` and `head=feature`, we want to see what the feature branch added/modified/deleted relative to main. So we call `getCommitDiff(repoRoot, targetCommitId, sourceCommitId)` where targetCommitId is main's tip and sourceCommitId is feature's tip. This gives a diff that shows feature's changes — additions show as "A", deletions show as "D", modifications show as "M" — which is the natural perspective for reviewing a pull request.

## Interview Closing Statement

The diff shows what changed from base to head; calling `getCommitDiff(main, feature)` shows feature's additions and modifications relative to main.

---

# Q178. What happens when both base and head query parameters are the same branch name?

## High-Level Explanation

The controller resolves both branch names to commit IDs. If both resolve to the same commit ID, it returns `status: "identical"` with ahead=0, behind=0, and an empty diff. The endpoint does NOT reject same-name branches with 400 — this is a valid comparison that shows the user the branches are at the same point. The response still includes the diff object (which will have no changes) and commit metadata for consistency.

## Interview Closing Statement

Same branch comparison returns `status: "identical"` with zero ahead/behind and an empty diff — it's a valid state, not an error.

---

# Q179. How does the comparison engine interact with the existing `isAncestorCommit` function?

## High-Level Explanation

`isAncestorCommit(vcRoot, ancestorId, commitId)` checks whether `ancestorId` is reachable from `commitId` by walking parent edges. The comparison engine uses this to determine the direction of the relationship: if base is an ancestor of head, the head is simply "ahead" (fast-forward possible). This function was updated in Feature 15 to follow the `parents` array (BFS) instead of just the single `parent` field, so it correctly handles merge commits with multiple parents. Without this update, a merge commit's second parent would be invisible to ancestor detection.

## Interview Closing Statement

`isAncestorCommit` determines if one branch can fast-forward to the other; it was updated to follow all parents in the DAG for merge commit support.

---

# Q180. Why does the comparison endpoint return both `commitsAhead` arrays and a `diff` object?

## High-Level Explanation

They serve different purposes. `commitsAhead` and `commitsBehind` are commit-level summaries (id, message, author, timestamp) that show the history of changes unique to each branch — useful for the PR detail view's "Commits" tab. The `diff` object contains file-level details with line-by-line hunks — useful for the "Files changed" tab. Both are computed from the same base/head commit IDs but at different granularities. The commit list is computed via `getCommitsBetween` (BFS walk), while the diff is computed via `getCommitDiff` (snapshot comparison with LCS line diffing).

## Interview Closing Statement

Commits show the history; the diff shows the file-level changes. Both are computed from the same branch tips at different granularities for different UI purposes.

---

# Feature 15 Interview Closing Statement

The branch comparison engine is the analytical foundation for the pull request and merge system. It resolves branch names to commits, finds the common ancestor via DAG traversal, counts commits ahead and behind, and computes file-level diffs — all without modifying any repository state. The commit model extension (parents array) ensures merge commits with multiple parents are handled correctly by all graph traversal algorithms. The endpoint returns a structured JSON response with enough information for a future merge system to determine fast-forward eligibility, conflict status, and merge commit parameters. The implementation adds one utility module, one controller function, one route, and 16 focused tests without breaking any existing functionality.

---

# Q181. How does the PR merge endpoint handle concurrent merge requests?

## High-Level Explanation

The controller uses MongoDB's atomic `findOneAndUpdate` as an optimistic lock: it attempts to transition the PR from `status: "open"` to `status: "merged"` in a single atomic operation. If the update matches (the PR was still open), the caller wins and proceeds with the merge. If it returns null (another request already changed the status), the caller gets a 409 "Pull request is being merged by another request." This avoids race conditions without external distributed locks. If the merge fails after the lock (conflicts, branch deleted), the status is reverted to `open` so the PR isn't stuck.

## Interview Closing Statement

An atomic `findOneAndUpdate` on the PR status field acts as a compare-and-swap lock — first caller wins, duplicates get 409, and failed merges revert the status.

---

# Q182. What does the GET /merge-status endpoint return for a closed PR?

## High-Level Explanation

The merge-status endpoint is read-only and returns `status: "CLOSED"` with `mergeable: false`. It checks the PR's `status` field before resolving any branches or calling any merge-analysis functions. This lets the frontend immediately disable the merge button without any filesystem access. The same pattern applies for `status: "merged"` — it returns `ALREADY_MERGED` with the stored `mergeCommitId`.

## Interview Closing Statement

Merge-status returns `CLOSED` for closed PRs and `ALREADY_MERGED` for merged PRs — both with `mergeable: false`, allowing the frontend to disable the merge button immediately.

---

# Q183. Why does the PR controller check isAncestorCommit before calling computeMergeStatus?

## High-Level Explanation

`computeMergeStatus` calls `getCommonAncestor` which finds the deepest common ancestor of two commits. When the source branch is an ancestor of the target (source is behind), the common ancestor is the source commit itself. `computeMergeStatus` then compares file snapshots between source and source — which shows no differences and marks it as `alreadyUpToDate`. However, `computeMergeStatus` does not explicitly detect this case as "source is ancestor of target" in its status output. The PR controller pre-checks with `isAncestorCommit` and returns `ALREADY_UP_TO_DATE` directly, avoiding an unnecessary call to `computeMergeStatus` and making the behavior explicit.

## Interview Closing Statement

`isAncestorCommit` detects the source-behind-target case that `computeMergeStatus` doesn't explicitly label, allowing the controller to return `ALREADY_UP_TO_DATE` directly without unnecessary filesystem work.

---

# Q184. How is the merge commit ID determined for fast-forward merges vs merge commits?

## High-Level Explanation

For fast-forward merges, `performMerge` rewrites the target branch ref to point at the source commit. The merge commit ID is `mergeResult.targetCommitId` (which is the source commit ID). For diverged merges, `performMerge` creates a new merge commit via `createMergeCommit`. The merge commit ID is `mergeResult.mergeCommitId` (the new commit's ID). For same-commit and ancestor-behind cases, the merge commit ID is set to `sourceCommitId` — no filesystem changes are made. The controller stores whichever ID applies in `pullRequest.mergeCommitId`.

## Interview Closing Statement

Fast-forward uses the source commit ID as the merge commit ID; diverged merges use the newly created merge commit's ID; same-commit and ancestor-behind use the source commit ID with no filesystem changes.

---

# Q185. What happens if performMerge throws CONFLICTS_DETECTED after the PR status was atomically set to merged?

## High-Level Explanation

The controller reverts the PR status back to `open`:

```js
locked.status = "open";
await locked.save();
```

This ensures the PR isn't stuck in `merged` state when the merge actually failed. The 409 response includes the conflict list so the frontend can display which files conflict. Without rollback, the PR would be permanently locked in `merged` with no actual merge applied — an unrecoverable state.

## Interview Closing Statement

The controller reverts `locked.status` to `open` and saves before returning 409, preventing an unrecoverable merged-but-not-actually-merged state.

---

# Q186. Why does the merge-status endpoint use read access while the merge endpoint uses write access?

## High-Level Explanation

`getMergeStatus` uses `authorizeRepository(req, res, false)` (read access = owner or public), because checking merge readiness doesn't modify any state. Any authenticated user viewing a public PR should see whether it's mergeable. `mergePullRequest` uses `authorizeRepository(req, res, true)` (write access = owner only), because merging modifies branch refs — only the repository owner should be able to merge PRs into their repository.

## Interview Closing Statement

Merge-status is a read operation (any authenticated user on public repos), while merge is a write operation (owner only) — both follow the established authorization pattern via `authorizeRepository`.

---

# Q187. How does the merge-status endpoint detect that source is behind target?

## High-Level Explanation

The controller calls `isAncestorCommit(vcRoot, sourceCommitId, targetCommitId)`. If source is an ancestor of target, source is behind — target has commits that source doesn't. The endpoint returns `ALREADY_UP_TO_DATE` with `mergeable: true`. This check happens before `computeMergeStatus` to avoid unnecessary filesystem work. The `computeMergeStatus` function's `getCommonAncestor` would also detect this, but the explicit pre-check is faster and makes the code's intent clearer.

## Interview Closing Statement

`isAncestorCommit(vcRoot, sourceCommitId, targetCommitId)` returns true when source is behind — the endpoint returns `ALREADY_UP_TO_DATE` without calling `computeMergeStatus`.

---

# Q188. Why is the source branch not deleted after a successful PR merge?

## High-Level Explanation

Branch deletion is a destructive, irreversible operation. In a real Git hosting platform, source branch deletion is typically an opt-in user preference, not an automatic behavior. Keeping the branch allows: (1) the PR author to reference it in future PRs, (2) rollback if the merge introduced a regression, (3) other collaborators who may have local checkouts of that branch. Deletion can be added later as an explicit user action with proper confirmation.

## Interview Closing Statement

Branch deletion is deferred because it's destructive and irreversible — it should be an explicit user action, not an automatic side effect of merging.

---

# Feature 4 Interview Closing Statement

The PR merge integration is the convergence point of the comparison engine (Feature 15), merge analysis (Feature 16), and merge execution (Feature 17). The controller orchestrates these services while adding PR-specific concerns: atomic lock to prevent concurrent merges, status transitions with rollback on failure, merge metadata storage, activity events, and notifications. The merge-status endpoint provides a read-only preview of merge readiness, enabling the frontend to conditionally render the merge button. The implementation modifies two existing files (controller + routes) and adds 39 integration tests across merge status, execution, state transitions, conflict handling, and edge cases — all without breaking the 93 existing PR tests.
# Q189. Why should the frontend not determine whether a PR is mergeable?

## High-Level Explanation

Mergeability is a property of the commit graph at a point in time, and the frontend never has that graph — it only has cached JSON from an earlier request. Between the moment a page loads and the moment a user clicks merge, commits can land on the target branch, the source branch can be force-updated, or a branch can be deleted. A frontend that computed "mergeable" from stale data would show a green button for a PR that now conflicts, or hide a button for a PR that became mergeable. The direct answer: the frontend lacks the data and the authority; it would be guessing. CommitHub's UI renders `mergeable` verbatim from `GET /merge-status` and re-fetches after every action.

## Interview Closing Statement

Mergeability depends on live commit-graph state the frontend doesn't have; deriving it client-side means acting on stale guesses, so the UI renders the backend's verdict instead of computing its own.

---

# Q190. Why must the backend remain authoritative?

## High-Level Explanation

Because any browser-controlled check is bypassable — hiding a merge button is cosmetic, not security. The backend re-validates everything on the actual write path: JWT identity via `protect`, ownership via `authorizeRepository(req, res, true)` (403 for non-owners), PR state (409 already merged, 400 closed), branch existence, and conflict detection at merge time inside the atomic lock. Even if a user crafted the POST directly with curl, the worst outcome is a well-formed error response, never a corrupt merge. The trade-off is extra latency (a status fetch before every merge decision), which is cheap compared to silent corruption.

## Interview Closing Statement

Client-side gating shapes UX; server-side enforcement guarantees integrity — CommitHub treats the disabled button as a courtesy and the atomic owner-only merge endpoint as the real gate.

---

# Q191. How does React communicate with the merge API?

## High-Level Explanation

Through the shared API-module pattern: components import plain async functions from `repositoryApi.js`, which call the single axios instance configured in `axios.js`. That instance's request interceptor reads the stored session and attaches the Bearer token, so no component ever touches tokens. The component keeps results in state: `fetchPullRequestMergeStatus` fills `mergeStatus`, `mergePullRequest` resolves or throws, and handlers wrap calls in try/catch/finally to drive `merging`/`submitting` flags. Trade-off versus React Query/SWR: manual cache invalidation (explicit refresh calls), but zero new dependencies and full control over when refetches happen.

## Interview Closing Statement

Components call small per-endpoint functions on one shared axios instance with interceptor-based auth, store responses in state, and let try/catch/finally drive loading flags — no second HTTP layer, no duplicated token logic.

---

# Q192. How do you prevent duplicate merge requests?

## High-Level Explanation

Two layers. UI layer: a `merging` boolean set synchronously before the POST; the handler's first line is `if (merging) return;` and the button is `disabled={merging}` showing "Merging...", so double clicks cannot fire twice. Server layer: the merge endpoint performs `findOneAndUpdate({_id, status: "open"}, {status: "merged"})` as an atomic compare-and-swap — if two requests do arrive (two tabs, replayed request), exactly one wins and the other gets 409 "being merged by another request". The frontend maps that 409 to a clear message and refreshes. The UI guard prevents accidents; the DB guard prevents races.

## Interview Closing Statement

Disable-and-flag in React stops accidental double clicks, while the backend's atomic open→merged transition makes concurrent duplicates structurally impossible — defense in depth where only the second layer is load-bearing.

---

# Q193. What happens when the backend returns HTTP 409?

## High-Level Explanation

409 means the requested transition conflicts with current state, and the body disambiguates which conflict: `{status: "CONFLICTS", conflicts: [...]}` when the merge engine found overlapping changes mid-merge, or a message like "Pull request is already merged" / "being merged by another request" for state races. The frontend inspects `error.response.data.status`: CONFLICTS gets "This pull request has conflicts and cannot be merged." plus the file list; otherwise the backend's own message is shown. Crucially, after any 409 the component silently re-fetches PR detail and merge status, so the card flips to whatever the backend now reports — the error message and the visible state always agree.

## Interview Closing Statement

A 409 isn't just an error to display — it's a signal that local state is stale, so CommitHub maps the body to a specific message and immediately re-syncs against the backend.

---

# Q194. How should stale merge state be handled?

## High-Level Explanation

By treating displayed status as a snapshot with an explicit refresh path, never as a promise. Concretely: the status card always offers "Refresh status"; a `behind > 0` count triggers an out-of-date notice prompting that refresh; every merge attempt (success or failure) auto-refreshes both PR detail and status; and errors fall back to re-sync rather than trusting the old verdict. What you should not do is cache `mergeable` across navigations or optimistically flip state locally after clicking merge — wait for the 200 and read the new truth. The cost is an extra GET per action; the benefit is the UI can never disagree with the repository.

## Interview Closing Statement

Stale state is handled by re-fetching at every decision point — explicit refresh control, behind-count warnings, and post-action reloads — so the button a user clicks always sits next to the verdict it was based on.

---

# Q195. Why shouldn't the frontend implement the merge algorithm?

## High-Level Explanation

Merging requires reading arbitrary file snapshots from storage, computing common ancestors by walking the commit graph, doing three-way content comparison, writing new commits, and moving refs atomically — filesystem operations a browser cannot perform and should not simulate. A JavaScript reimplementation would also fork the truth: two merge algorithms that can disagree means one is wrong, and the wrong one would be the one without write access to the repo. Finally, conflicts must be detected again at merge time under the lock; a client-side pre-check could never close that race. The frontend's job is rendering `conflicts[]`, not producing it.

## Interview Closing Statement

The merge algorithm lives where the data lives — server-side, atomic, single-sourced — because a client-side copy couldn't touch the repository and would only create a second opinion that can drift from the first.

---

# Q196. How would you optimize a PR with thousands of changed files?

## High-Level Explanation

Layered laziness. Transport: paginate the changed-file list (`?page=&limit=` like the existing commits/tags endpoints) so the first paint carries 50 files, not 5,000. Payload: keep list entries lean (path, status, additions, deletions) and fetch hunks per-file on expand — the current expand/collapse UI already isolates the expensive part. Rendering: virtualize the list (react-window-style windowing) so DOM nodes stay bounded regardless of count. Aggregates like total additions/deletions should come from the backend summary rather than summing client-side over everything. Trade-off: more round trips and backend pagination code, in exchange for flat memory and constant first-load time.

## Interview Closing Statement

Paginate the metadata, lazy-load each diff, virtualize the DOM, and compute totals server-side — the page then costs the same whether a PR touches 10 files or 10,000.

---

# Q197. How would you render large diffs efficiently?

## High-Level Explanation

The dominant costs are DOM size and string work. Windowed rendering (virtualization) mounts only the hunk lines currently scrolled into view, capping nodes at viewport size. Beyond that: render diff lines as plain text nodes (no per-line syntax highlighting, or highlight only visible lines); memoize expanded file components so toggling one file doesn't re-render others; collapse large files behind "Load diff" thresholds; and use `white-space: pre` with horizontal scroll rather than wrapping measurement. Removed lines stay in the payload — hiding them breaks review integrity — but they can live outside the mounted window. CodeHub's current hunk-per-expand design is the right shape; virtualization is the next increment.

## Interview Closing Statement

Virtualize lines, memoize files, defer highlighting, and keep deleted lines present-but-unmounted — large diffs become a scrolling problem, not a rendering wall.

---

# Q198. Why should merge status be refreshed before merging?

## High-Level Explanation

Because the merge click is the one irreversible action in the flow, and the last rendered verdict may be minutes old. Refreshing immediately before enabling the merge (or as part of the click handler) shrinks the TOCTOU window between "we believe it merges cleanly" and "the server attempts it". It also catches the common cases users create themselves: they just pushed a conflicting fix to the target branch, or resolved conflicts in another tab. CommitHub compromises on ergonomics — the button acts on the displayed verdict, but any failure triggers automatic re-sync, and the backend re-validates under lock regardless, so staleness degrades into a clean 409, never a bad merge.

## Interview Closing Statement

Refreshing before merge minimizes the check-then-act gap on the riskiest operation; combined with server-side re-validation under the lock, residual staleness costs one 409 instead of one corrupted branch.

---

# Feature 18 Interview Closing Statement

The PR merge frontend is deliberately thin: two GETs and one POST wrapped in state machines for loading, merging, and error mapping. Every displayed fact — mergeability, ahead/behind, conflicts, files, additions, merged metadata — is read from a backend response, and every action ends by re-reading them. The interesting engineering is in what was *not* built: no client-side mergeability heuristics, no optimistic merged state, no diff algorithm, no test framework bolt-on. The result is a UI that can be stale for seconds but never wrong for longer than one refresh, because the backend remains the single authority on what merging means.

---

# Q199. What actually causes a merge conflict, and when should the system detect it?

## High-Level Explanation

A conflict occurs when two branches changed the same file differently since their common ancestor and the changes touch overlapping lines (or both added/deleted the file). Detection belongs at merge-analysis time, not at write time: CommitHub computes it on demand in `computeThreeWayMerge` by comparing ancestor, target, and source snapshots file by file — `both_modified`, `both_added`, `delete_modify`, `modify_delete`. Nothing is stored; every status check recomputes from current branch heads, so the answer can never go stale in a database.

## Interview Closing Statement

Conflicts are derived state: detect them at analysis time from three snapshots, classify per file, and never persist a verdict that branch pushes can invalidate.

---

# Q200. How do you compute which line regions of a file are in conflict?

## High-Level Explanation

Split each version into lines and diff both sides against the common ancestor with an LCS op list (`collectRangeOps`). From each side's ops, collect the ancestor ranges it actually changed — deletions plus insertion anchors, skipping unchanged context lines (`collectChangedRanges`). Unify ranges from both sides wherever they overlap; each unified range is one conflict region. Finally map each region onto the real line spans of the source and target files so the UI can highlight exactly what each side contributed. Spans are approximate at LCS tie boundaries, which is acceptable because resolution content never comes from client-side region arithmetic.

## Interview Closing Statement

Diff both sides against the base, keep only genuinely changed ranges, unify overlaps — regions are a presentation of the same evidence the conflict classifier used, not a second source of truth.

---

# Q201. Why must a conflict resolution be committed as a merge commit rather than a normal commit?

## High-Level Explanation

If you commit "keep source" content to the source branch as an ordinary single-parent commit, the source branch's content relative to its history hasn't meaningfully changed — re-running the three-way comparison still sees both sides diverged from the old ancestor, so the conflict persists. Recording the target head as a second parent changes the graph: the target becomes an ancestor of the source, the effective merge base becomes the target head itself, and every remaining difference is source-only. The PR flips to READY and merges via plain fast-forward. This is precisely what `git merge` + resolve + commit does.

## Interview Closing Statement

The conflict lives in the graph, not just the bytes: only a commit that folds the target in as a parent can retire it, which is why resolutions are two-parent commits.

---

# Q202. Why must all conflicted files be resolved in one submission instead of one commit per file?

## High-Level Explanation

The first merge commit that folds the target in implicitly resolves *every* remaining conflict: after it, the target is the ancestor, so any file the resolver didn't touch silently takes the source version — and the target's changes to that file are lost at merge time. Git avoids this by refusing to commit a merge with unmerged paths. The API mirrors that rule: a submission covering only some conflicts gets 422 INCOMPLETE_RESOLUTIONS listing the missing files. Users still work file-by-file in the UI; they just submit once, atomically.

## Interview Closing Statement

Partial merge commits don't defer decisions — they make them for you, wrongly. Require complete coverage and turn silent data loss into an explicit 422.

---

# Q203. How does the resolution commit preserve non-conflicting changes from both branches?

## High-Level Explanation

The snapshot isn't built by copying the source branch and patching one file. It starts from `mergedContent`, the map `computeThreeWayMerge` already produces: for every file in the union of the three snapshots it picks the changed side, keeps identical content, or combines non-overlapping edits. Only conflicted paths are overridden with user choices. So a docs rewrite made only on the feature branch and a README fix made only on main both survive into the resolution commit — verified end-to-end where the feature branch's `docs.md` change outlived resolving an unrelated `app.js`.

## Interview Closing Statement

Reuse the engine's merged tree as the base and override only the contested paths; anything else risks reverting one branch's unrelated work.

---

# Q204. How do you prevent stale resolutions from corrupting a branch?

## High-Level Explanation

Optimistic concurrency at the boundary plus authoritative validation inside. The client must echo `expectedSourceHead` and `expectedTargetHead` — the commit ids it saw when it loaded the conflicts. The server re-reads the actual heads before doing anything and rejects mismatches with 409 STALE_SOURCE_BRANCH / STALE_TARGET_BRANCH, including the current ids so the client can reload. Because conflicts are recomputed fresh anyway, staleness also degrades gracefully: an already-resolved PR returns NO_CONFLICTS, deleted branches return INVALID. Nothing trusted from the client ever reaches the filesystem unverified.

## Interview Closing Statement

Make clients prove which world they resolved against, then re-verify server-side — stale submissions become clean 409s instead of lost commits.

---

# Q205. Why is conflict state not persisted in the database?

## High-Level Explanation

Conflicts are a pure function of three commit ids: ancestor, source head, target head. Persisting them would create rows that any push invalidates, requiring lifecycle management, migration of stale rows, and cache-invalidation logic — all to avoid recomputation that costs a few snapshot reads. Derived-on-read means there is nothing to invalidate: the worst case is a wasted computation, and staleness reduces to comparing two commit ids. Persistent state is reserved for things that cannot be recomputed, like PR reviews and comments.

## Interview Closing Statement

If state can be recomputed cheaply from immutable inputs, storing it buys latency at the price of correctness bookkeeping — derive it instead.

---

# Q206. What validation applies to custom resolution content?

## High-Level Explanation

Four checks before content is accepted: it must be a string (type safety), within the 1 MB file cap (abuse and memory bounds), free of NUL bytes (binary smuggling), and free of conflict markers — `<<<<<<<` and `>>>>>>>` anywhere reject the submission, since leftover markers mean the user pasted raw conflict text back. Bare `=======` is deliberately allowed because seven equals is also setext-heading syntax; the angle-bracket markers are unambiguous residue. Server-side path validation additionally rejects absolute paths, traversal, and `.CommitHub` internals.

## Interview Closing Statement

Validate type, size, encoding, and residue — and only reject markers that are unambiguous, or legitimate content pays for your paranoia.

---

# Q207. Who may resolve conflicts, and how does that follow from existing authorization?

## High-Level Explanation

Reading conflict detail requires read access to the repository (owner or public) because base/source/target contents are repository file contents, already readable through the file endpoints. Applying a resolution requires write access — owner only — matching every other mutation in the system: branch file edits, commits, and merges are all owner-gated through `authorizeRepository(req, res, true)`. A non-owner PR author cannot push commits to any branch either, so giving them resolution rights would create a new privilege without new capability elsewhere. Consistency beats cleverness.

## Interview Closing Statement

Map new operations onto the existing read/write matrix instead of inventing roles; if the action writes, it rides the same owner-only gate as every other write.

---

# Q208. How do you commit to a branch without checking it out?

## High-Level Explanation

Branches in this system are ref files pointing at commit directories that contain full snapshots. A checkout merely copies a snapshot into the working tree and repoints HEAD. So a commit to an arbitrary branch needs only: build a snapshot directory from content, write meta.json with the right parents, move the branch ref. That's exactly what `createMergeCommit` and `fastForwardMerge` already did; `createResolutionCommit` follows the same pattern with a caller-supplied content map. One guard remains: if the target branch happens to be checked out, refuse on a dirty working tree first, then sync the working tree after the ref moves — otherwise HEAD and disk would disagree.

## Interview Closing Statement

Commits are ref moves over snapshots; checkout is just a convenience — respect the dirty-tree invariant when the branch is live and you never need to switch branches to write one.

---

# Q209. Walk through the resolver UX: what does the user see and what happens on apply?

## High-Level Explanation

The resolver appears under the merge-status card only for owners of open, conflicted PRs. A file list shows every conflicted path with Resolved/Unresolved/Needs-manual-commits badges. Selecting a file loads BASE/SOURCE/TARGET panes — line-numbered, conflicting lines highlighted, headers naming the branches. Strategy buttons choose keep-source, keep-target, or custom; custom opens a textarea prefilled from the source version with live marker detection. Apply stays disabled until every resolvable file has a valid choice, showing progress n/total. On success the parent refreshes PR and merge status: the card flips to READY and the ordinary merge button appears. Errors map to specific copy — stale errors instruct a reload, 422 lists the missing files.

## Interview Closing Statement

Per-file freedom, atomic application, backend-truth refresh: the UI guides the decision but never pretends to know more than the server about mergeability.

---

# Q210. What happens when the source branch moves while a user is mid-resolution?

## High-Level Explanation

Nothing corrupts. If the source head moved, the echoed expectedSourceHead no longer matches and the submission gets 409 STALE_SOURCE_BRANCH with the new id; the drafts live in component state, so the user reloads details and reapplies strategies. If the target moved, same story with STALE_TARGET_BRANCH. If someone else resolved the conflicts meanwhile, the fresh recomputation finds none and returns NO_CONFLICTS. If the source branch is checked out with uncommitted work, DIRTY_TREE refuses before anything is written. Every failure mode ends in a typed error and an intact repository.

## Interview Closing Statement

Concurrent pushes aren't an edge case, they're Tuesday: design so every interleaving produces either the intended commit or a precise, recoverable error.

---

# Q211. Why does the resolver refuse delete/modify conflicts instead of handling them?

## High-Level Explanation

Delete/modify has no content-level answer: one side removed the file while the other edited it. Supporting it means teaching the snapshot builder deletion semantics, extending the strategy enum with "delete", handling absent-file reads in every pane, and defining what keep-target means when target lacks the file — a doubling of surface for a rare case where the wrong default destroys work. Instead those files are flagged `resolvable: false`, shown as "needs manual commits," and any submission touching them gets 422 NOT_RESOLVABLE. Explicit refusal beats a plausible wrong behavior.

## Interview Closing Statement

Scope limits are features when they're visible: mark what the tool won't decide, route it to manual workflow, and keep the automated path boringly correct.

---

# Q212. How was this feature tested?

## High-Level Explanation

Three layers. Integration tests (22) spawn the real Express app against a disposable Mongo database and drive the full HTTP flow with JWT auth: detail responses including exact contents and regions, every 400/403/404/409/422 branch, and end-to-end resolution → READY → merge → final file bytes for keep-source, keep-target, custom, multi-file, and both-added scenarios, plus dirty-tree refusal and activity recording. A live smoke script repeated the whole journey against a running server with local Docker Mongo, byte-comparing the untouched target working tree and the surviving cross-branch change. Frontend lint and build gate the UI code. The suite stayed at its pre-existing baseline: 566/567, the one failure being an older, unrelated analysis-classification test.

## Interview Closing Statement

Test the contract at the HTTP boundary where correctness actually lives, verify the bytes on disk once end-to-end, and never let a new feature move an old red test.

---

# Q213. How would this design scale to many conflicts or large repositories?

## High-Level Explanation

The hot path is O(files × lines) diffing per request, bounded by existing guards (5,000-line analysis cap, 1 MB content cap, 50-files-per-submission). Scaling levers, in order: memoize conflict computations per (ancestor, source, target) triple — immutable commit ids make the cache key perfect; move region computation behind the detail endpoint only (already done — merge-status carries paths, not contents); paginate the conflict list for hundred-file conflicts; and virtualize the panes' line rendering like any large diff. The write path is a handful of file copies and one ref move — effectively O(resolved files), independent of repo size.

## Interview Closing Statement

Immutable inputs make caching trivial, the read-heavy parts are already split from the status endpoint, and the write cost scales with the fix, not the repo — the shape is right even before optimizing.

---

# Feature 19 Interview Closing Statement

Conflict resolution here is a thin, honest layer over the version-control primitives that already existed: the engine's own merged-content map becomes the resolution snapshot, the target head becomes a parent, and the existing merge flow takes over unchanged. Everything hard — detection, classification, combination — was already solved; the feature adds only the decision points (which version wins, per file) and the guarantees around them (complete coverage, stale rejection, owner-only writes, target untouched). Conflicts stay derived, failures stay typed, and the repository's invariant — commits are snapshots, branches are refs — is never bent to make the UI convenient.

---

# Feature 20 – Pull Request Reviews and Branch Protection

# Q214. What is code review?

## High-Level Explanation

Code review is the systematic inspection of proposed changes by someone other than the author before they merge. The direct answer: it is a quality gate that catches what automation cannot — wrong intent, missing authorization, designs that work but shouldn't. Deeper: it serves four functions at once — defect detection (logic and edge cases tests miss), consistency enforcement (architecture and style conventions), knowledge diffusion (no subsystem has a single point of failure), and accountability (authors sharpen work knowing peers will read it). Example: every test passes because the test author also wrote the endpoint without an owner-check; a reviewer catches the gap in ninety seconds. Trade-offs: reviews cost wall-clock time and rot into rubber-stamping under deadline pressure — the mechanism is cheap, engaged reviewers are expensive. At scale, organizations tier depth by blast radius: one pass for internal tooling, senior-plus-automated gates for money paths, because human attention is the scarcest engineering resource.

## Interview Closing Statement

Tests prove code does what it says; review proves what it says is worth doing.

---

# Q215. What is a Pull Request review?

## High-Level Explanation

A PR review is a structured verdict attached to a proposed merge: reviewer identity, a state of approved, changes_requested, or commented, and optional written feedback. Direct answer: it converts "looks good to me" from prose into machine-checkable data that merge rules can enforce. In CommitHub each review is an embedded subdocument on the pull request storing `reviewer`, `state`, `comment`, and — the critical addition — `reviewedCommit`, the exact source commit id the reviewer judged. Example: alice approves commit `a8e532b`; that record is not an opinion about the branch, it is testimony about specific bytes. Trade-offs: structured states add workflow friction versus freeform comments, but they are what makes automated merge gating possible at all. Scalability: embedding works because reviewers per PR are few and bounded — GitHub models reviews as separate documents only because it needs line-scoped threads and fork-wide queries CommitHub deliberately doesn't.

## Interview Closing Statement

A review turns judgment into data — and data is something a merge gate can enforce.

---

# Q216. Why should approvals be associated with a commit?

## High-Level Explanation

An approval claims "this code is safe"; without binding it to the exact source head at review time (`reviewedCommit`), the claim detaches from its evidence the moment the branch moves. Direct answer: commit association makes every approval verifiable — the system can always ask whether the approval still describes code that exists. Deeper: branches advance constantly; if alice approved commit A and three more landed, her un-bound approval silently becomes false testimony about code she never saw, and no amount of timestamp bookkeeping recovers the truth. Storing the commit id costs nothing — ids are immutable strings, so no commit data is duplicated — yet staleness becomes a single strict-equality check instead of an invalidation protocol. Example: `review.reviewedCommit !== currentSourceHead` → stale, instantly, for every path that moved the branch including out-of-band ref writes. Trade-offs: strict binding creates churn on active branches (approvals expire often), which is exactly the correctness-versus-convenience dial `dismissStaleReviews` exposes. Scalability-wise the comparison is O(1) per review and memoizes perfectly on immutable inputs.

## Interview Closing Statement

Tie approvals to commits and staleness stops being bookkeeping — it becomes arithmetic.

---

# Q217. Why should approvals become stale after new commits?

## High-Level Explanation

Because approval durability is a claim about future code nobody has read yet. Direct answer: when the reviewed commit stops being the source head, prior approvals must stop counting (unless explicitly configured otherwise) or protection degrades to theater. Deeper: the dangerous scenario is silent — reviewer approves, developer pushes a rewrite that removes the authorization check, PR auto-unlocks, merge proceeds on stale trust; nothing errored, everything rotted. CommitHub computes staleness on read (`reviewedCommit !== head` while `dismissStaleReviews` is on) rather than writing dismissal records: correct for every branch-advance path with zero hooks, and reversible — disabling dismissal restores old approvals' validity, matching GitHub's opt-out. Example: two approvals exist, one commit lands, merge-status immediately reports `STALE_REVIEWS` plus `REVIEW_REQUIRED`. Trade-offs: computed staleness costs a branch-head read per evaluation (negligible locally; memoize per head in a hosted deployment) and re-review friction is real on fast-moving branches — but the alternative, trusting yesterday's judgment about today's bytes, is not a trade-off anyone should accept.

## Interview Closing Statement

Fresh code deserves fresh eyes; stale approval is just nostalgia with permissions.

---

# Q218. How would you model reviews in MongoDB?

## High-Level Explanation

Two viable shapes: embedded array on the pull request versus a separate collection keyed by `pullRequestId`. Direct answer: CommitHub embeds reviews as subdocuments of the PR — reads always need reviews with the PR, writes always flow through PR state transitions, and cardinality is small (bounded by realistic human reviewer counts), so embedding wins on locality and atomicity: adding a review and evaluating eligibility touch one document with no join and no multi-collection transaction. Each subdocument stores `reviewer` (ObjectId→User), lowercase `state`, bounded `comment`, `reviewedCommit`, and timestamps; the aggregate state is never stored, only derived. Trade-offs: unbounded growth argues for a separate collection (line-level comment threads, thousands per PR, would flip this decision); embedded arrays complicate cross-PR queries like "all reviews by user X" which would need the aggregation pipeline or a denormalized index. Scalability path: keep embedding until a PR realistically carries hundreds of reviews, then split cold reviews into an archive collection keyed identically — the derivation logic never notices where rows live.

## Interview Closing Statement

Embed what you always read together and can bound; extract what you query across or cannot.

---

# Q219. How do you calculate current review state?

## High-Level Explanation

Derive it, never store it. Direct answer: current state = f(reviews × configuration): filter reviews against the live source head (staleness), then apply precedence — any active `changes_requested` wins, else any `approved`, else `commented`, else `pending`. Deeper: storing `reviewStatus: "approved"` bakes a moment-in-time verdict into the document, and every mutation that could invalidate it (new commit, protection toggle, dismissal change) must remember to rewrite it — a classic invalidation-bug farm. Deriving centralizes truth in one pure function (`evaluateReviewRequirements`) shared by merge-status, the merge endpoint, and review listing, so three surfaces cannot disagree. Counting is per distinct reviewer — Set of reviewer ids among active approvals — so ten approvals from one person satisfy `requiredApprovals: 2` once, not ten times. Trade-offs: recomputation costs a little CPU per read (trivial here) and the aggregate semantics are stricter than GitHub's (a same-reviewer approve does not erase their earlier change-request — resolution happens by updating that review), chosen deliberately because append-only history plus explicit updates is easier to audit than latest-wins shadowing. Scalability: the function is pure over immutable-ish inputs, trivially cacheable keyed by (pr revision, source head, protection revision).

## Interview Closing Statement

Stored status tells you what happened once; derived status tells you what is true now — merge gates need the second kind.

---

# Q220. How do required approvals work?

## High-Level Explanation

A `BranchProtection` document per repo+branch stores `requiredApprovals` (1–10) alongside `enabled`; merge eligibility requires the count of distinct reviewers with active approvals to meet it, with zero active change requests. Direct answer: required approvals turn review from advisory to gating — the merge engine physically won't run until N independent humans have signed off on the exact current code. Deeper: counting distinct reviewers prevents self-amplification (one account spamming ten approvals); requiring the count against the live head ties the arithmetic to present-tense code via staleness filtering; blocking on any active change-request means numbers alone don't unlock a contested PR. The shortfall is reported precisely — `"2 approvals required; 1 approval received."` — because actionable block reasons convert frustration into next steps. Trade-offs: high thresholds stall solo-team repositories (protection stays opt-in for exactly this reason), and strict distinct-count rules break down in organizations with contractor churn where identity ≠ accountability — enterprises layer CODEOWNERS for that. Scalability: the check is one comparison after one filtered scan of an embedded array; even a thousand-review PR evaluates in microseconds.

## Interview Closing Statement

Required approvals are how a team encodes "two humans agreed" into something a server will actually refuse to bypass.

---

# Q221. How do you enforce branch protection?

## High-Level Explanation

Enforcement lives at the write boundary, not the UI: before the merge engine executes, the controller reloads protection from the database, re-reads both branch heads from disk, re-evaluates reviews against them, and refuses — releasing its open→merged lock — with `403 {reason: "BRANCH_PROTECTION", blockReasons}` if anything is unsatisfied. Direct answer: protection = a server-side predicate evaluated immediately before the destructive operation, sharing the same evaluation module the read-only status endpoint uses. Deeper: the subtle requirement is recency — eligibility checked seconds earlier is advice, not enforcement; between check and merge a push can land, so the gate must sit inside the same request that mutates, after the atomic lock acquisition so concurrent merges serialize behind real state. The engine (`performMerge`) itself stays ignorant of protection: it remains a pure branch-combiner, keeping concerns separated — protection decides permission, the engine executes mechanics. Trade-offs: double evaluation (status endpoint + merge call) duplicates work for the happy path but buys independence; caching evaluations would speed reads at the cost of exactly the freshness guarantees protection exists to provide. Scalability: the gate is O(reviews + one FS ref-read) per merge attempt — negligible even at GitHub-scale merge rates.

## Interview Closing Statement

Protection is enforced wherever destruction happens — one function, evaluated late, trusted completely.

---

# Q222. Why is frontend-only branch protection insecure?

## High-Level Explanation

Because the frontend is a suggestion, the API is a contract. Direct answer: hiding the merge button in JavaScript controls what honest users see, not what the server accepts — anyone with curl, a modified client, or devtools can POST `/merge` directly, and a disabled button is not a security boundary. Deeper: client-side checks run on attacker-controlled hardware with attacker-readable source; the only decision that matters is the one made inside the process holding database credentials and filesystem access. That's why CommitHub enforces twice independently: merge-status computes `mergeable: false` purely for UX guidance, while the merge endpoint recalculates from disk and DB and returns 403 with structured reasons regardless of what the client believes. The frontend's job is rendering requirements ("2 approvals required"), never deciding them. Example: deleting the button from the DOM changes nothing — the backend still refuses until reviews satisfy protection. Trade-offs: none, honestly — server-side checking costs milliseconds; the only argument for client-side is perceived snappiness, and optimistic UI achieves that without moving authority.

## Interview Closing Statement

Anything the browser can decide, the browser can be told to decide differently — authority belongs where the data lives.

---

# Q223. How do you prevent self-approval?

## High-Level Explanation

By deriving the actor from the authenticated request and comparing identities before accepting a decision: `req.user._id === pullRequest.author._id` → reject with 400, and never trust a client-supplied reviewer field. Direct answer: self-approval is prevented server-side by refusing approve/change-request decisions from the PR author, whose identity comes from the JWT, not the payload. Deeper: the threat isn't accidental self-review, it's the author forging `reviewerId` of a colleague — so the schema has no client-writable reviewer path at all; `submitReview` writes `reviewer: req.user._id` unconditionally. Design rationale documented in-code: authors may comment freely (discussion is not a trust decision) but recording approved/changes_requested on their own work defeats the independence that makes the gate meaningful — a solo developer who needs to move simply leaves protection off rather than normalizing rubber-stamps. Trade-offs: strict prohibition blocks legitimate patterns like tiny self-fix follow-ups under protection (re-review by one other person is the cost of the guarantee); teams wanting author-merge flows disable protection instead of carving exceptions. Edge case handled: owner reviewing their own open PR hits the same wall — ownership confers power over merges, not exemption from review.

## Interview Closing Statement

If the author can mint their own approval, protection is a decoration — identity must come from the token, never the body.

---

# Q224. How would you handle two reviewers approving simultaneously?

## High-Level Explanation

Concurrent approvals are safe because each is an independent append and the gate re-derives state per request. Direct answer: both reviews persist (embedded `$push` on separate requests — MongoDB serializes document writes atomically), and whichever merge request arrives first re-evaluates under the lock; the second sees `status: "merged"` and fails cleanly. Deeper: the race that matters isn't duplicate approvals, it's duplicate merges — solved by the conditional update `findOneAndUpdate({_id, status: "open"}, {status: "merged"})`: exactly one caller wins the transition, losers get 409, and the loser's eligibility recheck (which runs after winning the lock) operates on fresh heads so a mid-flight push cannot slip through. Approvals themselves need no dedup: two approvals from two people are semantically distinct events, both counted once via the distinct-reviewer Set. Example: alice and bob approve within the same second → reviews array holds both in submission order → threshold notification fires exactly once on the crossing transition, verified by test. Trade-offs: last-write-wins on the PR document could theoretically drop a concurrent review append — bounded risk given tiny documents; a production hardening would switch appends to atomic `$push`-by-query rather than load-modify-save.

## Interview Closing Statement

Make each write atomic, make each gate recompute late, and simultaneity stops being a bug class.

---

# Q225. How would you handle a reviewer changing APPROVED to CHANGES_REQUESTED?

## High-Level Explanation

Directly, via review update: PATCH the existing review to `changes_requested`, which rewrites state, refreshes `reviewedCommit` to the current head, and immediately re-blocks merging — no new event needed to make protection bite, since eligibility derives from current reviews on every evaluation. Direct answer: the update path flips trust synchronously; the very next merge attempt fails with `CHANGES_REQUESTED`. Deeper: permissions matter here — only the original reviewer (or repository owner acting as maintainer/dismissal authority) may revise a decision; arbitrary users rewriting others' verdicts would let one person manufacture consensus, hence the 403 path verified by test. The reverse transition (changes_requested → approved) is the documented resolution flow for contested PRs. Trade-offs: mutating review history vs appending superseding reviews — GitHub appends and shadows (latest-per-reviewer wins), CommitHub updates in place and keeps one authoritative row per decision, trading audit richness for simpler derivation and no shadowing ambiguity; full history survives in activity events either way. Notifications fire on the typed transition so the author learns their approval was revoked the moment it happens.

## Interview Closing Statement

Trust that can be granted through the API must be revocable through the same API — synchronously and by the right person.

---

# Q226. How would you design branch protection at scale?

## High-Level Explanation

Start from the access pattern: protection is read on every merge-status poll and merge attempt for hot branches, written rarely by owners. Direct answer: one document per repo+branch (unique compound index) holding a small rule set, loaded by key, evaluated by a pure function — CommitHub's shape scales linearly to millions of repos. Deeper scaling levers, in order: (1) cache protection docs aggressively — rules change rarely and cache invalidation on PUT is trivial (delete-by-key); (2) shard naturally by repository id, since every lookup is repo-scoped; (3) precompute eligibility per (PR, head) pair when pushes land if read volume explodes — event-driven invalidation beats polling; (4) keep rule evaluation pure and side-effect-free so it runs anywhere (edge, worker queue). Feature growth (status checks, CODEOWNERS, conversation resolution) extends the same document with additive fields and composable predicates rather than new subsystems. Trade-offs: per-branch documents multiply for repos with hundreds of branches — fine, they're sparse and indexed; wildcard patterns (`release/*`) would demand glob-matching at eval time, deliberately deferred. Failure mode matters too: if protection storage is unreachable, fail closed — refusing merges is recoverable, permitting them wrongly is not.

## Interview Closing Statement

Scale protection by keeping it a small, cacheable, purely-evaluated fact about a branch — never by making merges smarter.

---

# Q227. How would you support required CI checks later?

## High-Level Explanation

The architecture anticipates it: `BranchProtection` gains `requiredStatusChecks: [String]`, a `StatusCheck` collection records `(repository, sha, context, state)`, and `evaluateReviewRequirements` grows one more conjunct — every required context present-and-passing for the current source head. Direct answer: CI slots into the existing gate as another boolean input to merge eligibility; nothing about the merge engine or endpoints changes. Deeper: the crucial detail is keying checks by commit id, exactly like `reviewedCommit` — a passing build on yesterday's head is worthless, so the evaluation filters checks to `sha === currentSourceHead` and staleness falls out for free; a new push resets effective CI to "pending" with zero orchestration. The block-reason vocabulary extends with `REQUIRED_CHECKS_FAILING` / `CHECKS_PENDING`; the frontend renders whatever codes arrive. What's genuinely hard isn't the gate, it's the runner: receiving webhooks/API calls from external CI, authenticating them, and lifecycle (retriggering, cancellation) — which is why CommitHub defers it wholesale rather than half-building. Trade-offs: waiting on external systems makes eligibility time-varying and eventually-consistent, so merge-status gains a "pending" presentation distinct from "blocked". Scalability: check results are write-once per (sha, context) and TTL-prunable — trivially sharded.

## Interview Closing Statement

CI is just one more witness whose testimony must reference the current commit — the courtroom already exists.

---

# Q228. How would you design CODEOWNERS-like functionality?

## High-Level Explanation

CODEOWNERS maps path patterns to required approvers; the natural implementation layers onto this feature: compile the file into ordered pattern rules (last match wins), resolve the PR's changed files against it into a set of required owner-parties (users or teams), then extend eligibility to require each party to have an active approval from a member. Direct answer: ownership turns "N arbitrary approvals" into "specific parties must approve" — a refinement of the same distinct-reviewer counting, not a new gate. Deeper: the pieces needed all exist in miniature — pattern matching (glob over changed paths), party membership (a Team collection CommitHub doesn't have yet, which is the real prerequisite), and per-party satisfied checks mirroring the distinct-reviewer Set. Block reasons extend naturally: `MISSING_REQUIRED_REVIEW: docs/ needs review from @docs-team`. Trade-offs: CODEOWNERS adds political friction (ownership disputes, bottleneck owners) and computational cost is real at scale — matching hundreds of patterns across thousands of changed files wants compiled-prefix caching per commit; GitHub resolves this with precomputed ownership indexes refreshed on CODEOWNERS commits. Without a team/group entity first, user-list CODEOWNERS is buildable but brittle — org structure is the actual dependency.

## Interview Closing Statement

CODEOWNERS is just required-approvals with a routing table — the hard part is modeling who owns what, not counting who approved.

---

# Q229. How would you prevent stale approval bypasses?

## High-Level Explanation

A bypass means: an approval counted for code it didn't judge. Defense in depth, all server-side: (1) bind every review to `reviewedCommit` at creation — the claim names its evidence; (2) filter by strict equality against the head re-read from disk during the same request that merges, so no cached eligibility can vouch for drifted code; (3) compute staleness, never store it — out-of-band ref moves (manual `.CommitHub` writes, conflict-resolution commits) invalidate approvals without needing to notify anything; (4) place the gate after the atomic open→merged lock so a push racing between check and engine execution forces the merge attempt to fail or re-evaluate on real state; (5) treat null `reviewedCommit` as stale, defaulting legacy rows to safe. Direct answer: bypass prevention = identity binding + late recomputation + computed (not stored) invalidation + lock-ordered gating. Trade-offs: the residual hole is `dismissStaleReviews: false` — a deliberate product escape hatch that trades safety for convenience, which is acceptable only because it's explicit per branch. What would NOT work: trusting merge-status responses (client-side), timestamps (clock skew, reordered pushes), or webhook-driven invalidation (missed events = permanent false validity).

## Interview Closing Statement

Every bypass is a cached answer to a question the code stopped answering — so never cache the verdict, only the evidence.

---

# Q230. Why should merge eligibility be calculated server-side?

## High-Level Explanation

Three reasons: authority, freshness, and consistency. Authority: only the server can enforce — clients advise; a `mergeable: false` that the API doesn't honor is decoration attackers delete with one curl. Freshness: eligibility is a function of moving parts (source head, reviews, protection config, conflicts) that change between render and click; the merge request must evaluate the predicate at execution time against disk and database state, or it acts on stale advice — which is why the endpoint recomputes everything even when merge-status said READY moments earlier. Consistency: one shared evaluation module powers listing, status, and merging, so the UI showing "blocked", the status JSON saying `mergeable: false`, and the endpoint refusing 403 can never disagree about why — block reasons are generated once and rendered verbatim. Direct answer: server-side calculation makes eligibility a property of the repository, not of a page load. Trade-offs: recomputation on every merge attempt costs a few filesystem reads and a document scan — microseconds against the integrity purchased; aggressive caching would trade exactly that integrity for latency nobody needs. The frontend keeps one job: display requirements and hide the button — never to be the reason something is impossible.

## Interview Closing Statement

Eligibility decided anywhere but the server is a suggestion; decided on the server, it's a law.

---

# Feature 20 Interview Closing Statement

Reviews and branch protection close the loop the merge engine opened: the engine answers "can these branches combine?" while protection answers "is this combination authorized yet?" — and the whole feature is disciplined about never confusing the two. Approvals are bound to commits so trust tracks bytes, staleness is computed so it can't be forgotten, eligibility is derived so three surfaces can't disagree, and the merge endpoint re-checks everything late because a gate checked early is just a suggestion. Every hard primitive — commit identity, atomic locks, structured errors, best-effort side-effect services — already existed; the feature wired them into a governance layer that stays honest precisely because it stays thin.

---

# Feature 08 – CI Status Check System

# Q231. What is a CI status check?

## High-Level Explanation

A CI status check is a named record that associates an automated validation result with a specific commit. Direct answer: it is the status-recording half of a CI system — what external tools (linters, test suites, security scanners) report back after analyzing code. Deeper: each check has a lifecycle (`PENDING → RUNNING → COMPLETED`) and a conclusion (`SUCCESS`, `FAILURE`, `ERROR`, or `CANCELLED`), and the system aggregates multiple checks into an overall verdict. CommitHub's implementation is deliberately a status system only — no code execution, no workflow runner. Repository owners create and update checks via API, and future CI integrations will call these endpoints to push results. The separation is intentional: CommitHub records what CI systems report, and the merge gate evaluates those reports. Trade-offs: this limits what CommitHub can do autonomously (no built-in CI), but it eliminates an entire class of security risks (arbitrary code execution) and keeps the architecture composable — any CI system can integrate via the API.

## Interview Closing Statement

A status check is a commit-scoped record of what an external CI system reported — CommitHub stores the verdict, not the computation.

---

# Q232. Why associate checks with commits instead of branches?

## High-Level Explanation

Because branches move and commits don't. Direct answer: a check validates specific code, and different code requires re-validation. Deeper: when a new commit lands on a branch, the previous commit's checks become irrelevant for that branch's merge eligibility — the code changed, so the old verdict no longer applies. If checks were associated with branches, a check that passed on commit A would incorrectly satisfy merge requirements for commit B, even though B's code was never tested. Commit-based association makes staleness fall out naturally: the merge-status endpoint resolves the source branch's current HEAD and queries checks for that exact commit. If no checks exist for that commit, the required checks are unsatisfied. This is the same model GitHub uses (`check_run.head_sha`), and the same reason `reviewedCommit` matters for review staleness — trust must reference the specific code it validated.

## Interview Closing Statement

Branches move; commits don't. Tie the check to the commit, and staleness becomes a simple equality check against the current HEAD.

---

# Q233. Why don't checks for an old commit apply to a new commit?

## High-Level Explanation

Because the check validated different code. Direct answer: a check's conclusion is a statement about a specific snapshot — applying it to a different snapshot would be a logical error. Deeper: when commit B is pushed to a branch, the merge-status endpoint resolves B as the HEAD and queries checks keyed by B's SHA. Checks keyed by commit A simply don't appear in the results. The system treats absent checks as unsatisfied (`REQUIRED_CHECK_MISSING`), which is the conservative and correct behavior — if you haven't tested the current code, you haven't validated it. This is not a special rule; it falls directly out of commit-based keying. The alternative (branch-based checks with timestamp invalidation) would require detecting when a branch moved and explicitly invalidating old checks — more complex, more error-prone, and exactly the kind of bookkeeping the commit-based model avoids.

## Interview Closing Statement

Commit-based keying means old checks simply aren't found for the new HEAD — absence is the invariant, invalidation is unnecessary.

---

# Q234. How do you aggregate multiple checks?

## High-Level Explanation

With a precedence-based aggregation function (`aggregateCheckStatus`). Direct answer: the worst status wins. Deeper: precedence is FAILURE/ERROR > RUNNING > PENDING > SUCCESS. If any check has failed or errored, the overall status is failed. If any check is running, overall is running. If any check is pending (or no checks exist), overall is pending. Only when every check has conclusion SUCCESS is the overall status success. Empty checks → PENDING (conservative: no checks means not yet validated). The aggregation is deterministic, side-effect-free, and computed on every evaluation — never cached, always fresh. This matters because checks can transition independently (one CI job finishes while another starts), and the aggregate must reflect the exact moment of evaluation.

## Interview Closing Statement

Worst-status-wins precedence — FAILURE beats RUNNING beats PENDING beats SUCCESS — computed fresh on every evaluation with no caching.

---

# Q235. What happens if one required check fails?

## High-Level Explanation

Merge is blocked. Direct answer: any required check with conclusion FAILURE, ERROR, or CANCELLED produces a `REQUIRED_CHECK_FAILED` block reason and prevents merging. Deeper: the merge-status endpoint evaluates required checks against the source branch's current HEAD. If a required check name matches a check but that check's conclusion is not SUCCESS, the check evaluation reports the check as failed. The merge endpoint then refuses with 403 and the block reason, and the frontend displays which check(s) failed. The PR stays open — the author pushes a fix, CI runs again, and the next evaluation reflects the new result. This is the core value of the feature: automated validation that actually blocks bad merges.

## Interview Closing Statement

A failed required check produces a block reason — the merge gate refuses until CI reports success for the current HEAD.

---

# Q236. What happens if a required check is missing?

## High-Level Explanation

Merge is blocked with `REQUIRED_CHECK_MISSING`. Direct answer: a missing required check is treated as unsatisfied — the system does not guess or assume success. Deeper: this is the critical security property. If a required check name has no matching check on the current HEAD commit, merge is blocked. This prevents a scenario where a CI integration fails to report, crashes, or is misconfigured — the code simply hasn't been validated, so merging would defeat the purpose of the requirement. The block message names the missing check so the owner knows what to configure or re-run. The alternative (treating missing as success) would mean a CI integration failure silently bypasses protection, which is unacceptable.

## Interview Closing Statement

Missing means unsatisfied — a CI failure to report is treated as a CI failure, not a silent bypass.

---

# Q237. What happens if a check is still running?

## High-Level Explanation

Merge is blocked with `REQUIRED_CHECK_PENDING`. Direct answer: a check that is PENDING or RUNNING has not produced a conclusion, so the requirement is not satisfied. Deeper: this is the "wait for CI" gate. The merge-status endpoint reports the check as pending/running, the block reason names it, and the frontend shows a "waiting for checks" state. When the CI job completes and reports its conclusion via the update endpoint, the next merge-status evaluation reflects the result. The trade-off is wall-clock latency (the user waits for CI), but the alternative (merging before CI completes) defeats the entire purpose of requiring the check.

## Interview Closing Statement

Pending or running checks block merge — the gate waits for CI to finish before allowing the merge.

---

# Q238. How does branch protection use status checks?

## High-Level Explanation

Branch protection stores a list of required check names (`requiredStatusChecks`), and merge eligibility evaluates those names against the actual checks for the source branch's HEAD. Direct answer: the `BranchProtection` document gains a `requiredStatusChecks` array of strings, and the merge gate passes this list to `evaluateRequiredChecks` alongside the checks queried for the current HEAD commit. Deeper: the integration is additive — branch protection already enforces review requirements and conflict checks, and required status checks add one more conjunct to the eligibility predicate. If `requiredStatusChecks` is empty or absent, the check gate passes vacuously (no checks required). The UI allows owners to add and remove required check names via a tag input in repository settings, with a maximum of 20 names and 100 characters each.

## Interview Closing Statement

Branch protection stores required check names; the merge gate evaluates them against the current HEAD's checks — one more boolean input to the existing eligibility predicate.

---

# Q239. How do you prevent users from falsely reporting success?

## High-Level Explanation

By restricting check creation and updates to repository owners only. Direct answer: only the repository owner can create or update status checks, enforced by `authorizeRepository(req, res, true)` on both endpoints. Deeper: if any authenticated user could create a check, an attacker could create a `SUCCESS` check for a required name and bypass merge protection. The owner-only restriction ensures only the entity that configured branch protection can influence the check gate. Future CI integrations will use API tokens tied to the repository, maintaining the same authorization model. This is the same pattern used for all other write operations in CommitHub — the owner controls writes, public users can read.

## Interview Closing Statement

Owner-only check creation means only the entity that configured protection can influence the check gate — no forged success is possible.

---

# Q240. Why shouldn't CommitHub execute arbitrary repository code?

## High-Level Explanation

Because executing untrusted code on the server is the most dangerous thing a hosting platform can do. Direct answer: running `npm test`, `make`, or `docker build` on user-submitted code would give arbitrary code execution with the server's privileges — database credentials, filesystem access, network access. Deeper: even sandboxed execution (containers, VMs) has escape vulnerabilities, and the attack surface is enormous (malicious test files, dependency confusion, resource exhaustion). CommitHub's design records what external CI systems report — the actual execution happens in the CI provider's environment, not on CommitHub's server. This eliminates an entire class of vulnerabilities and keeps the platform's security perimeter clean. The trade-off is that CommitHub cannot run CI autonomously, but that's the right trade-off: security over convenience, always.

## Interview Closing Statement

Executing untrusted code grants attackers the server's privileges — record what external CI reports instead of running it yourself.

---

# Q241. How would you integrate GitHub Actions later?

## High-Level Explanation

Via webhook endpoints that receive workflow_run events. Direct answer: add a `POST /api/webhooks/github` endpoint that validates the webhook signature, parses the `workflow_run` payload, and creates/updates status checks for the associated commits. Deeper: GitHub sends a `X-Hub-Signature-256` header for HMAC verification using a shared secret stored in the repository's CI configuration. The endpoint extracts `head_sha`, `name`, `conclusion`, and `status` from the payload, maps them to CommitHub's status check model, and calls the existing create/update logic. The authorization model stays the same — the webhook must be configured by the repository owner, and the check is scoped to the repository. Rate limiting and IP allowlisting provide additional defense. Trade-offs: webhook infrastructure adds operational complexity (secret management, retry handling, signature verification) but provides real-time updates without polling.

## Interview Closing Statement

A webhook endpoint validates the signature, maps the payload to status checks, and reuses the existing create/update logic — real-time CI results without polling.

---

# Q242. How would you integrate Jenkins?

## High-Level Explanation

Via Jenkins post-build hooks that call CommitHub's status check API. Direct answer: configure Jenkins to call `POST /api/repositories/:id/status-checks` with an API token after each build, passing the commit SHA, check name, and conclusion. Deeper: Jenkins supports post-build actions that make HTTP requests, so a Jenkinsfile would include a step that reports results back to CommitHub. The API token authenticates the Jenkins service as a CI integration, scoped to the repository. The lifecycle is straightforward: PENDING on trigger, RUNNING when the build starts, COMPLETED with conclusion when it finishes. Jenkins's existing test results, build logs, and artifacts are referenced via the `url` field. Trade-offs: Jenkins integration requires manual configuration per repository (unlike GitHub Actions' automatic webhook), but it works with any Jenkins setup without CommitHub needing to know Jenkins's internal architecture.

## Interview Closing Statement

Jenkins calls the status check API via post-build hooks — the same create/update endpoints, authenticated by API token, with Jenkins-specific URLs for detailed results.

---

# Q243. How would you integrate external CI providers securely?

## High-Level Explanation

With scoped API tokens and webhook signature verification. Direct answer: each CI integration gets a repository-scoped API token (not a user token) that can only create and update checks for that specific repository. Deeper: token-based auth means the CI provider authenticates as itself, not as a user — so check creation is attributable to the CI system, not to whoever set up the integration. Webhook endpoints add HMAC signature verification so the server can reject forged payloads. The authorization model stays owner-only for configuration (who can add a CI token) and token-scoped for execution (what the token can do). Rate limiting per token prevents abuse. Trade-offs: token management adds operational overhead, but it's the same model GitHub uses for Actions and it provides clear audit trails and revocation.

## Interview Closing Statement

Scoped API tokens authenticate CI systems per-repository, webhook signatures verify payload authenticity, and rate limiting prevents abuse — the same model GitHub uses.

---

# Q244. How would you handle webhook authentication?

## High-Level Explanation

With HMAC signature verification. Direct answer: each webhook endpoint verifies a shared secret using the `X-Hub-Signature-256` header (or equivalent for each CI provider). Deeper: the shared secret is generated when the webhook is configured and stored encrypted. On each incoming webhook, the server computes HMAC-SHA256 of the raw request body using the stored secret and compares it to the header value. A mismatch returns 401 Unauthorized and the payload is discarded. Additional defenses include IP allowlisting (restricting to known CI provider IP ranges), timestamp validation (rejecting webhooks older than a configurable window to prevent replay attacks), and idempotency (deduplicating by delivery ID to prevent double-processing). Trade-offs: HMAC verification adds CPU cost per webhook (negligible), and secret rotation requires coordination with the CI provider, but the alternative (no verification) means anyone can forge check results.

## Interview Closing Statement

HMAC-SHA256 signature verification, timestamp validation, and IP allowlisting — three layers that ensure only genuine CI payloads create checks.

---

# Q245. How would you prevent stale CI results?

## High-Level Explanation

By keying checks on commits. Direct answer: stale results are prevented structurally — checks for commit A simply don't appear when evaluating commit B. Deeper: this is the same property that makes the commit-based model correct. When a new commit is pushed, the merge-status endpoint queries checks for the new HEAD. Old checks for previous commits are not invalidated or deleted — they simply aren't queried. The system treats absent checks as unsatisfied, so a new push automatically resets CI status to "pending" for all required checks. No webhook-driven invalidation is needed, no timestamp comparison, no event bus — staleness falls out of the keying model. This is exactly why commit-based association was chosen over branch-based: branch-based would require detecting pushes and explicitly invalidating old results.

## Interview Closing Statement

Commit-based keying means new pushes automatically reset CI status — old checks are absent, not invalidated, and absence is unsatisfied.

---

# Q246. How would you scale status checks to millions of commits?

## High-Level Explanation

With TTL-based retention and efficient indexing. Direct answer: the `{repository, commit}` index serves the hot query (checks for a commit), and TTL-based cleanup prunes old checks that no branch references. Deeper: at scale, the concern is collection growth — every commit accumulates checks, and old commits' checks become irrelevant once the branch advances. A TTL index on `createdAt` (or a custom `expiresAt` field) automatically removes checks older than a configurable window (e.g., 90 days). The hot query (checks for the current HEAD) stays fast because it targets a single commit via the compound index. For repositories with extremely high commit rates, sharding by repository distributes the load. Aggregation is computed per-request and is O(checks per commit), typically single digits, so it stays cheap. Trade-offs: TTL pruning means historical check data is eventually lost, which is acceptable because the data is a point-in-time snapshot that becomes irrelevant once the branch moves.

## Interview Closing Statement

Index the hot query, TTL-prune the cold data, and shard by repository — the check collection stays bounded and the lookup stays fast.

---

# Q247. What indexes would you use?

## High-Level Explanation

Two indexes, each serving a distinct query pattern. Direct answer: `{repository: 1, commit: 1}` for the primary query (all checks for a commit), and a unique `{repository: 1, commit: 1, name: 1}` for deduplication. Deeper: the first index serves `GET /repositories/:id/commits/:commit/status-checks` and the merge-status evaluation — both query by repository and commit. The unique compound index prevents duplicate check names per commit (a check named "build" can exist for commit A and commit B, but not twice for commit A) and serves as a secondary lookup when the controller needs to find a specific check by name. No index is added for per-name queries across commits (that pattern doesn't exist), and no index is added for global listing (the repository scope is always present). Trade-offs: the unique index adds write overhead on check creation (the index must be updated), but it's the only way to enforce the uniqueness constraint atomically.

## Interview Closing Statement

Two indexes — `{repository, commit}` for the hot query and `{repository, commit, name}` unique for deduplication — each mapped to an actual access pattern.

---

# Q248. How would you handle duplicate check reports?

## High-Level Explanation

With the unique compound index returning `E11000`, which the controller maps to `409 Conflict`. Direct answer: attempting to create a check with a name that already exists for the same commit triggers a duplicate key error, which is caught and returned as a structured 409. Deeper: this handles two scenarios — accidental double-reporting (a CI integration retries after a network timeout) and malicious duplicate creation. The controller catches the MongoDB duplicate key error and returns a clear message: "Status check 'build' already exists for commit abc123." The CI integration can then PATCH the existing check instead of creating a new one. Trade-offs: the 409 requires the CI client to handle retries by updating instead of creating, which adds a small amount of client logic but ensures exactly one check per name per commit.

## Interview Closing Statement

The unique index rejects duplicates with 409 — one check per name per commit, enforced atomically at the database layer.

---

# Q249. How would you handle retries?

## High-Level Explanation

With idempotent update semantics. Direct answer: a CI integration that retries after a timeout can safely PATCH the existing check — the update is idempotent (setting the same status/conclusion twice is harmless). Deeper: the lifecycle transitions are validated (PENDING → RUNNING → COMPLETED), so a retry that attempts to set COMPLETED → PENDING is rejected with 400. But a retry that re-sets COMPLETED with the same conclusion is a no-op at the data level (the document is unchanged). The `startedAt` and `completedAt` timestamps are only set once (on first transition to RUNNING/COMPLETED), so retries don't overwrite them. For webhook-based integrations, idempotency keys in the payload header prevent double-processing. Trade-offs: lifecycle validation means a retry after COMPLETED must create a new check (different commit or name) rather than re-report the same one, which is correct behavior — once a check completes, it's a historical record.

## Interview Closing Statement

Updates are idempotent, lifecycle transitions are validated, and timestamps are set once — retries are safe without special handling.

---

# Q250. How would you model CI checks in MongoDB?

## High-Level Explanation

As a dedicated `StatusCheck` collection with commit-scoped documents. Direct answer: `{repository, commit, name, status, conclusion, description, url, startedAt, completedAt, timestamps}` with a unique compound index on `{repository, commit, name}`. Deeper: the model is deliberately simple — no embedded arrays, no references to workflow definitions, no execution metadata. Each document is a self-contained record of one check on one commit. The collection is query-scoped by repository and commit (the two most common access patterns), and the unique index prevents duplicates. At scale, the collection is sharded by repository (natural affinity — every query starts with repository) and TTL-pruned by age (old checks become irrelevant). The trade-off versus embedding checks on the Repository document is that checks are per-commit, not per-repository, so embedding would create unbounded array growth and poor query locality. A separate collection with compound indexes is the right shape.

## Interview Closing Statement

A dedicated collection keyed by (repository, commit, name) — self-contained documents, compound indexes for the hot query, and TTL pruning for bounded growth.

---

# Feature 08 Interview Closing Statement

CI Status Checks is a pure status-recording architecture that associates automated validation results with commits — the status half of CI, deliberately separated from execution. The StatusCheck model tracks lifecycle (PENDING → RUNNING → COMPLETED) and conclusion (SUCCESS/FAILURE/ERROR/CANCELLED) per (repository, commit, name), with a unique compound index preventing duplicates and a separate aggregation service providing worst-status-wins precedence. Branch protection's `requiredStatusChecks` array feeds into `evaluateRequiredChecks`, which matches required names against actual checks for the source branch's current HEAD — missing means unsatisfied, pending means blocked, failed means blocked. The security model is owner-only check creation (preventing forged success) and commit-based keying (making staleness a structural property rather than an invalidation protocol). Merge eligibility adds required checks as one more conjunct alongside reviews and conflicts, evaluated late under the same lock that serializes merges. The design explicitly avoids code execution on the server — recording what external CI reports rather than running it — which eliminates an entire class of vulnerabilities. Future CI integration extends naturally: webhook endpoints with HMAC verification, scoped API tokens, and TTL-pruned collections for bounded growth, all layered onto the same status check model without modifying the merge engine or the protection gate.

---

# Q251. How does the external CI webhook authentication work?

## High-Level Explanation

The webhook uses HMAC-SHA256 signing. When a CI integration is created, a random 32-byte hex secret is generated and returned to the user once. The CI provider computes `HMAC-SHA256(rawBody, secret)` and sends the hex digest in the `x-commithub-signature` header. CommitHub loads the stored secret, computes the same HMAC, and compares using `crypto.timingSafeEqual` for constant-time verification. A timestamp header (`x-commithub-timestamp`) must be within 300 seconds of server time to prevent replay attacks.

## Interview Closing Statement

HMAC-SHA256 provides authentication without sending the secret in transit. The sender proves possession of the secret by signing the request body. Constant-time comparison prevents timing attacks where an adversary measures response time to guess the signature byte by byte. The 300-second timestamp window limits the replay window — a captured request is only valid for 5 minutes. This is the same mechanism used by GitHub, GitLab, and Stripe webhooks.

---

# Q252. Why is the webhook secret stored in plain text rather than hashed?

## High-Level Explanation

HMAC verification requires the original secret on the server side. The sender computes `HMAC-SHA256(body, secret)` using the plain secret. To verify, the receiver must compute the same HMAC using the same secret. If the secret were hashed (like passwords), the receiver couldn't compute the HMAC — it would only have the hash. GitHub, GitLab, and Stripe all store webhook secrets in plain text (or encrypted at rest) for this reason.

## Interview Closing Statement

The security model is different from passwords. Passwords use one-way hashing because the server needs to verify a password without storing it. Webhook secrets use two-way HMAC because both parties need the same secret to compute the signature. The secret is protected by: (1) returned only once at creation, (2) never exposed via API responses (`select: false`), (3) transmitted over TLS, and (4) rotatable at any time. Database-level encryption at rest (e.g., MongoDB field-level encryption) can add defense in depth.

---

# Q253. How does the raw body preservation work for HMAC verification?

## High-Level Explanation

Express's `express.json()` middleware consumes the request body stream to parse JSON. HMAC verification needs the exact raw bytes that were signed. The solution is the `verify` callback option: `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })`. This callback fires during parsing, capturing the raw Buffer before any transformation. The webhook controller then reads `req.rawBody` to recompute the HMAC.

## Interview Closing Statement

Without raw body preservation, the server would compute HMAC on the re-serialized JSON (via `JSON.stringify(req.body)`), which may differ from the sender's original bytes due to key ordering, whitespace, or encoding differences. Capturing the raw buffer in the verify callback ensures the exact bytes are used for HMAC computation, matching what the sender signed. This is a standard pattern for webhook authentication in Node.js.

---

# Q254. How does the system handle idempotency for webhook deliveries?

## High-Level Explanation

External CI providers may send duplicate webhooks (retries, network issues). The system handles this through the unique compound index on (repository, commit, name). A second webhook for the same check either: (1) updates a non-completed check (e.g., RUNNING → COMPLETED), or (2) is a no-op if the check is already COMPLETED — completed checks are immutable. The webhook returns 200 in both cases, preventing the sender from retrying.

## Interview Closing Statement

Idempotency is structural rather than token-based. The (repository, commit, name) uniqueness constraint means duplicate creates fail with a duplicate key error, which the controller catches and converts to an idempotent 200 response. This design doesn't require the sender to include idempotency keys — the system naturally deduplicates based on the semantic identity of the check.

---

# Q255. How are out-of-order webhook deliveries handled?

## High-Level Explanation

CI providers may deliver events out of order (e.g., "completed" arrives before "started"). The system handles this gracefully: if a completion event arrives for a check that hasn't been seen yet, the check is created directly in COMPLETED state. If a "running" event later arrives for the same check, it's ignored because the check is already completed. The key insight is that completed checks are immutable — any subsequent update for the same (repository, commit, name) is a no-op.

## Interview Closing Statement

Out-of-order delivery is a fundamental property of distributed systems. The system handles it by making the state machine resilient: completion is a terminal state, so any event arriving after completion is harmless. This is simpler and more reliable than attempting to enforce ordering through message queues or sequence numbers, which add complexity without meaningful benefit for this use case.

---

# Q256. What security properties does the webhook endpoint provide?

## High-Level Explanation

Five layers: (1) HMAC-SHA256 authentication prevents unauthorized status updates, (2) constant-time signature comparison prevents timing attacks, (3) timestamp validation within 300 seconds prevents replay attacks, (4) disabled integrations reject all webhooks, (5) payload size limit (1MB) prevents memory exhaustion. The endpoint does NOT use JWT authentication — it uses the webhook secret as a shared secret between CommitHub and the CI provider.

## Interview Closing Statement

The security model follows the principle of defense in depth. No single mechanism is trusted absolutely — HMAC prevents forgery, timestamp prevents replay, size limits prevent DoS, and the enabled flag provides a kill switch. The endpoint returns generic error messages (no "integration found but disabled" vs "no integration found") to prevent information leakage about which integrations exist.

---

# Q257. How does secret rotation work?

## High-Level Explanation

The owner calls `POST /api/repositories/:id/ci-integrations/:iid/rotate-secret`. The server generates a new random 32-byte hex secret, updates the integration, and returns the new plain secret. The old secret immediately stops working — any subsequent webhook with the old signature fails HMAC verification. The CI provider must be reconfigured with the new secret.

## Interview Closing Statement

Rotation is atomic — the old secret is replaced in a single database write, so there's no window where both old and new secrets work. This is a deliberate trade-off: it may cause brief downtime if the CI provider isn't reconfigured immediately, but it prevents the old secret from remaining valid indefinitely. For zero-downtime rotation, a dual-secret approach (accepting either old or new) could be implemented, but the added complexity isn't justified for this use case.

---

# Q258. How are provider-specific status formats mapped?

## High-Level Explanation

The `PROVIDER_STATUS_MAP` object maps provider-specific status strings to CommitHub's standardized enums. For example, GitHub Actions uses "in_progress" → RUNNING, "completed" → COMPLETED, "success" → SUCCESS. The webhook controller reads the provider from the `x-commithub-provider` header (falling back to the stored provider), looks up the mapping, and translates the incoming payload. Unknown providers fall through to the generic mapping.

## Interview Closing Statement

Provider-specific mappings are a translation layer between heterogeneous CI systems and a unified internal model. This keeps the core StatusCheck model clean while accommodating the diversity of external systems. Adding a new provider requires only adding a mapping entry — no changes to the webhook controller, status check model, or merge engine.

---

# Q259. How does the webhook endpoint prevent cross-repository access?

## High-Level Explanation

The webhook URL includes the repository ID: `POST /api/repositories/:id/webhook`. The controller loads the CI integration scoped to that repository ID. Even if an attacker knows a valid webhook secret for repository A, they can't use it for repository B because the integration lookup filters by repository. Additionally, each integration has its own unique secret, so secrets aren't shared across repositories.

## Interview Closing Statement

The repository ID in the URL is the first line of defense. The integration lookup (`CIIntegration.findOne({ repository: repoId, enabled: true })`) ensures the secret is only valid for the specific repository. This is defense in depth — even if HMAC verification somehow passed (which it can't without the correct secret), the integration wouldn't be found for the wrong repository.

---

# Q260. How does the system handle webhook delivery failures?

## High-Level Explanation

The system is a passive receiver — it doesn't push status updates to anyone. If a webhook delivery fails on the CI provider's side, that's the provider's responsibility. If the CommitHub webhook endpoint fails (e.g., database down), the provider should retry. The 500 error response signals the provider to retry. The system doesn't implement delivery queues or retry logic because it receives, not sends.

## Interview Closing Statement

The webhook architecture is pull-based for reporting and push-based for receiving. CI providers push results to CommitHub (push). CommitHub records the results and makes them available for display and merge evaluation (pull). This separation of concerns means CommitHub doesn't need to handle delivery guarantees — that's the CI provider's responsibility. The timestamp-based replay protection means retries within the 300-second window are naturally handled.

---

# Q261. What happens when a webhook arrives for a non-existent commit?

## High-Level Explanation

The webhook controller accepts the webhook and creates a StatusCheck record for the commit, regardless of whether the commit exists in CommitHub's filesystem. This is by design — the CI provider may run checks on commits that CommitHub doesn't store (e.g., force-pushed commits, or commits from before the repository was added). The check is recorded and will be relevant when the commit is referenced in a PR merge evaluation.

## Interview Closing Statement

CommitHub doesn't validate that the commit SHA exists in its storage because: (1) the CI provider is the source of truth for what commits exist, (2) CommitHub's filesystem may not have every commit (e.g., shallow clones), (3) the check is still valid for merge evaluation if a PR references this commit. The commit-based keying means checks are naturally scoped — a check for commit A never affects commit B.

---

# Q262. How does the webhook handle large payloads?

## High-Level Explanation

The webhook endpoint enforces a 1MB payload limit (checked after raw body capture). Express's global JSON limit is 4MB, but webhooks typically don't need large payloads. If the payload exceeds 1MB, the endpoint returns 413 Payload Too Large. This prevents memory exhaustion attacks while accommodating legitimate CI payloads that include build logs or test results in the description field.

## Interview Closing Statement

Payload limits are a DoS prevention measure. Without limits, an attacker could send gigabyte-sized payloads to exhaust server memory. The 1MB limit is generous enough for legitimate CI payloads (which typically include commit SHA, check name, status, and a short description) while preventing abuse. The limit is checked on the raw body buffer, not the parsed JSON, to catch payloads that expand significantly during parsing.

---

# Q263. How does the CI_CHECK_UPDATED activity type work?

## High-Level Explanation

When a webhook is processed successfully, the controller creates a `CI_CHECK_UPDATED` activity event (best-effort, never blocking the response). The activity records the actor (integration creator), repository, check name, status, conclusion, and commit. This activity appears in the repository's activity feed, providing visibility into external CI status updates.

## Interview Closing Statement

Activity creation is best-effort by design — if the activity write fails, the webhook still returns 200 and the status check is still recorded. This follows the same pattern as all other activity types in CommitHub: the primary operation (status check update) is never sacrificed for side-effect logging. The CI_CHECK_UPDATED type was added to the ACTIVITY_TYPES enum specifically for this feature.

---

# Q264. How does the frontend display CI integrations?

## High-Level Explanation

RepositorySettings.jsx includes a CI Integrations section that: (1) lists existing integrations with name, provider, and enabled/disabled status, (2) provides a form to create new integrations with provider selection and name, (3) shows the webhook secret once at creation (with a dismiss button), (4) offers enable/disable toggle, secret rotation, and delete buttons per integration. The CI integration API client (ciIntegrationApi.js) wraps all CRUD operations.

## Interview Closing Statement

The frontend follows the same patterns as branch protection settings: a dedicated section within RepositorySettings, owner-only access (enforced by the backend), and optimistic UI updates. The webhook secret is shown once because it's never retrievable after creation — this is a security property, not a UX limitation. The provider dropdown uses a curated list of supported providers rather than free-form input.

---

# Q265. How would you add support for a new CI provider?

## High-Level Explanation

Two steps: (1) add the provider to the `CI_PROVIDERS` enum in ciIntegrationModel.js, (2) add a status mapping entry in `PROVIDER_STATUS_MAP` in webhookController.js mapping the provider's status strings to CommitHub's enums. No changes to the webhook controller logic, status check model, or merge engine are needed.

## Interview Closing Statement

The provider-agnostic architecture means adding providers is purely declarative — a mapping entry, not code changes. The webhook controller processes all providers through the same code path, translating via the mapping. This is the payoff of the abstraction layer: the core system is provider-unaware, and providers are thin adapters.

---

# Q266. How does the webhook endpoint differ from the status check API?

## High-Level Explanation

The status check API (Feature 8) uses JWT authentication and is owner-only — repository owners manually create and update checks. The webhook endpoint uses HMAC authentication and is open to any CI provider that has the integration secret. Both write to the same StatusCheck collection, but through different authentication mechanisms and authorization models.

## Interview Closing Statement

The two entry points serve different actors: the API serves the repository owner (human), the webhook serves the CI provider (machine). Different actors need different authentication: JWT for humans (session-based), HMAC for machines (secret-based). Both converge on the same data model, which is the key architectural insight — the StatusCheck model is the single source of truth regardless of how the data arrives.

---

# Q267. What are the trade-offs of the webhook architecture?

## High-Level Explanation

Trade-offs: (1) Push-based reporting is more real-time than polling but requires the CI provider to implement webhook delivery. (2) HMAC auth is simpler than OAuth but requires manual secret management. (3) Provider-specific mappings add maintenance but keep the core model clean. (4) Completed checks being immutable prevents corrections but ensures audit trail integrity. (5) The 300-second replay window is a balance between security and clock skew tolerance.

## Interview Closing Statement

Every design decision optimizes for some property at the expense of another. The webhook architecture optimizes for simplicity (no OAuth flow), security (HMAC + timestamp), and extensibility (provider mappings) at the expense of requiring CI providers to implement webhook delivery and manual secret management. These are acceptable trade-offs for a self-hosted version control system where the integration surface is well-defined.

---

# Q268. How would you implement rate limiting for the webhook endpoint?

## High-Level Explanation

Rate limiting should be per-integration (not per-IP, because multiple CI runners may share an IP). A token bucket or sliding window counter keyed by integration ID, with limits like 100 requests per minute. The rate limiter would be middleware applied only to the webhook route, not the global Express app. Exceeding the limit returns 429 Too Many Requests.

## Interview Closing Statement

Per-integration rate limiting prevents one misbehaving CI provider from affecting others. IP-based limiting is unreliable in cloud CI environments where IPs are shared or dynamic. The rate limit should be generous enough for legitimate use (CI pipelines typically send 2-5 webhooks per run) but restrictive enough to prevent abuse (thousands of requests per second). Redis-backed rate limiting would be needed for multi-instance deployments.

---

# Q269. How does this feature relate to GitHub's status check API?

## High-Level Explanation

GitHub's status check API is the direct inspiration. CommitHub's StatusCheck model mirrors GitHub's commit status API (pending/state/description/target_url), and the webhook integration mirrors GitHub's webhook delivery mechanism. The key difference is that CommitHub doesn't execute CI — it only records what external systems report. This is a deliberate architectural choice to avoid the security and complexity overhead of code execution.

## Interview Closing Statement

CommitHub's approach is "GitHub's status check model, implemented as a teaching system." The data model, lifecycle states, and webhook authentication are directly inspired by production systems. The deliberate omission of code execution makes the system safer to run and easier to understand, while the status recording architecture is production-quality and could serve as the foundation for a real CI integration layer.

---

# Q270. How would you scale the webhook endpoint to handle millions of webhooks per day?

## High-Level Explanation

Scaling strategies: (1) Horizontal scaling — stateless webhook handler behind a load balancer. (2) Webhook queue — accept webhooks into a message queue (Redis/RabbitMQ) and process asynchronously. (3) Batch processing — aggregate multiple status updates for the same commit into a single database write. (4) Read replicas — webhook reads (integration lookup) can hit read replicas. (5) Caching — cache integration secrets in Redis to avoid database hits on every webhook. (6) Sharding — shard the StatusCheck collection by repository for write distribution.

## Interview Closing Statement

The webhook endpoint is naturally horizontally scalable because it's stateless — each request is independent. The bottleneck is the database write (creating/updating StatusCheck documents) and the HMAC computation (CPU-bound). A message queue decouples acceptance from processing, allowing the endpoint to accept webhooks at network speed while processing them at database speed. Caching integration secrets in Redis eliminates the most frequent database read (loading the integration for HMAC verification), reducing the per-webhook latency from a database round-trip to a cache hit.

---

# Feature 09 Interview Closing Statement

External CI Status Integration is a secure webhook-based bridge between external CI providers and CommitHub's status check architecture. The CIIntegration model stores per-repository provider registrations with HMAC secrets; the webhook endpoint verifies requests using HMAC-SHA256 with constant-time comparison and 300-second timestamp replay protection. Raw body preservation via Express's verify callback ensures the exact bytes are used for HMAC computation. Provider-specific status formats are translated through a mapping layer to CommitHub's standardized StatusCheck model, maintaining idempotency (completed checks are immutable) and handling out-of-order delivery gracefully. The integration management API (create/list/update/delete/rotate) is owner-only, and the webhook endpoint is cross-repository safe through scoped integration lookups. Activity feed integration provides visibility, and the frontend settings UI manages the full lifecycle. The architecture is deliberately provider-agnostic — adding new CI providers requires only a mapping entry, not code changes — and the security model follows industry standards (GitHub, GitLab, Stripe) for webhook authentication. All 678 tests pass, confirming that the webhook layer integrates cleanly with Feature 8's status check system, branch protection gates, and PR merge evaluation without modifying any existing behavior.

---

# Q271. Why use a separate ReviewComment collection instead of extending the existing Comment model or embedding in the PR?

## High-Level Explanation

The existing Comment model is issue-only (content, author, issue). Reusing it for PR review comments would require adding nullable fields (pullRequest, filePath, line, etc.) and breaking the issue comment contract. Embedding in the PR document (like the existing PullRequestCommentSchema) works for simple comments but cannot support threading, file/line anchoring, or independent CRUD — the PR document would grow unbounded as threads accumulate. A separate collection gives us proper indexes, independent lifecycle, and room for threading without document size limits.

## Interview Closing Statement

The separate collection is the right trade-off: it avoids polluting the issue-only Comment model, avoids PR document bloat from embedded subdocuments, and enables proper indexing on filePath/line/resolved for efficient queries. The trade-off is an extra collection to manage, but MongoDB handles many collections well and the query patterns (by PR, by file, by resolved status) map cleanly to compound indexes.

---

# Q272. How does commit association work and why is it critical for code review comments?

## High-Level Explanation

Each review comment stores the `commit` ID it was written against. This is the commit the reviewer was looking at when they wrote the comment. When new commits are pushed to the PR, the comment doesn't move — it stays anchored to the original commit. The `markOutdatedComments()` function then compares the file content at the comment's commit vs. the current HEAD to determine if the comment is still relevant.

## Interview Closing Statement

Commit association is the foundation of trustworthy code review. Without it, comments would silently reference different code as the PR evolves, creating confusion about whether feedback was addressed. The outdated detection uses snapshot comparison (file content at old commit vs. new commit) rather than line number tracking, because line numbers shift frequently but content changes are meaningful. This is a best-effort process — the detection runs asynchronously and never blocks the primary operation.

---

# Q273. How does the threading model work? Why only flat replies instead of nested threads?

## High-Level Explanation

Threading uses a parent-child relationship: root comments have `parentComment = null`, replies have `parentComment = root._id`. Replies are limited to one level (no nesting). This is a deliberate simplification — flat threads are much easier to render, filter, and resolve. Resolution is a property of the root comment only, which simplifies the state model. Nested threads (like GitHub's) require recursive rendering, complex resolution cascading, and make it harder to follow the conversation flow.

## Interview Closing Statement

Flat threading is a pragmatic choice that covers 95% of review conversations while being dramatically simpler to implement and query. The trade-off is losing the ability to have side-conversations within a thread, but in practice, most code review discussions are linear. If nested threading were needed, the parentComment field already supports it — the restriction is enforced in the controller, not the data model.

---

# Q274. How does the outdated comment detection work?

## High-Level Explanation

When `markOutdatedComments(pullRequest)` is called: (1) resolve the PR's current HEAD commit, (2) for each non-outdated comment whose commit differs from HEAD, (3) load file snapshots at both commits, (4) compare content at the comment's filePath, (5) if the content changed and the specific line context is gone, mark `outdated: true`. The detection compares actual file content rather than just line numbers, because a line number might stay the same even when the content changes.

## Interview Closing Statement

The outdated detection is best-effort by design — it runs asynchronously and never fails the primary operation. The content-based comparison (checking if the specific line text still exists in the new version) is more accurate than line-number-only tracking. False negatives are acceptable (a comment marked as not-outdated when it should be), but false positives are more costly (a reviewer dismissing a still-relevant comment). The current approach errs on the side of not marking outdated when uncertain.

---

# Q275. Why does the global activity feed only show root comments, not replies?

## High-Level Explanation

Creating activity events for every reply would flood the activity feed with low-signal notifications. A PR with 20 replies on one thread would generate 20 activity entries. By only creating activity for root comments, the feed shows meaningful events (new discussion topics) without the noise of every back-and-forth reply. The replies are still visible when viewing the PR directly.

## Interview Closing Statement

Activity feeds are about discoverability, not completeness. The user needs to know that a new review discussion started, not that reply #7 was posted. This is the same pattern GitHub uses — notifications for new PRs and issues, but not for every comment reply. The notification system handles individual reply notifications to participants, while the activity feed provides a higher-level summary.

---

# Q276. How is file/line validation performed when creating a review comment?

## High-Level Explanation

The `validateFileLine()` function: (1) loads the commit snapshot via `getSnapshot(vcRoot, commit)`, (2) checks if `filePath` exists in the snapshot's file list, (3) if a line number is provided, reads the file content and verifies the line number is within range. This prevents comments on files that don't exist at that commit or on line numbers outside the file. The validation uses the same snapshot infrastructure as the commit system.

## Interview Closing Statement

Validation at creation time prevents orphaned comments that reference non-existent code. The cost is one filesystem read per comment creation (to verify the file/line), which is negligible compared to the database write. The alternative — deferring validation and showing errors when viewing — creates a worse user experience and makes it harder to maintain data integrity.

---

# Q277. How does the resolve/unresolve system work?

## High-Level Explanation

Resolution is a property of root comments only. The repo owner can resolve a thread by calling the resolve endpoint, which sets `resolved: true`, `resolvedBy`, and `resolvedAt`. The owner can also unresolve (reverse the resolution). Non-owners cannot resolve/unresolve. The resolution status affects the frontend filter (All / Unresolved / Resolved) and the thread card styling (resolved threads are dimmed).

## Interview Closing Statement

Resolution is owner-only because the owner is responsible for determining when review feedback has been addressed. The alternative — letting any participant resolve — could lead to premature resolution before the owner has verified the fix. The unresolve capability ensures mistakes can be corrected. The resolved status is stored on the root comment (not individual replies) because resolution is a thread-level concept.

---

# Q278. Why is `createReviewComment` validated against the filesystem but `replyToReviewComment` is not?

## High-Level Explanation

Root comments specify a commit, file, and line, so they need validation to ensure the referenced code actually exists. Replies inherit the parent's context (commit, filePath, line) automatically — the reply controller copies these from the parent comment. Since replies don't accept their own file/line parameters, there's nothing to validate. This reduces the filesystem overhead for replies while maintaining data integrity for root comments.

## Interview Closing Statement

This is a data model constraint enforced at the controller level: replies are structurally identical to their parent (same file, same line, same commit) and only differ in `body` and `parentComment`. Validating the parent's context on every reply would be redundant — the parent was already validated at creation time. The only way the parent's context could become invalid is if the comment data was tampered with directly in the database, which is outside the scope of application-level validation.

---

# Q279. How does the notification system work for review comments?

## High-Level Explanation

Root comments notify the PR author (if not the author themselves). Replies notify both the PR author and the root comment author (excluding self-notifications). @mentions in comment bodies are extracted and create MENTION notifications for the mentioned users. All notifications use the existing `createNotification()` and `createMentionNotifications()` services, which are best-effort and never fail the primary operation.

## Interview Closing Statement

The notification strategy mirrors GitHub's: notify participants who need to know, but not yourself. The PR author needs to know about new discussions on their PR. The root comment author needs to know about replies to their feedback. @mentions allow directed communication to specific users. The best-effort nature ensures that a notification failure never blocks a comment from being posted.

---

# Q280. How does the delete cascade work for review comments?

## High-Level Explanation

When a root comment is deleted, all its replies are also deleted via `ReviewComment.deleteMany({parentComment: comment._id})` followed by `comment.deleteOne()`. This ensures no orphaned replies remain in the database. The delete operation is authorized for both the comment author and the repo owner — the owner can clean up any comment on their repository.

## Interview Closing Statement

The cascade delete is essential because replies reference their parent via `parentComment`. Without cascading, deleting a root would leave replies with invalid parent references. The alternative — soft deletes with a `deleted` flag — would preserve data but complicate every query (needing to filter out deleted comments). Hard deletion with cascade is simpler and matches the expected behavior: when a review discussion is removed, all its replies should go with it.

---

# Q281. How does the ReviewComment model differ from GitHub's review comment model?

## High-Level Explanation

GitHub's model includes: `diff_hunk` (cached diff context), `position` (position within the diff, not line number), `original_position`, `pull_request_review_id` (formal review), and `in_reply_to_id`. CommitHub's model is simpler: `commit`, `filePath`, `line`, `side`. The key difference is that GitHub uses diff-position (which shifts with every commit) while CommitHub uses file line numbers with content-based outdated detection. This avoids the complexity of diff-position calculation while still detecting staleness.

## Interview Closing Statement

GitHub's diff-position model is more precise but requires maintaining a mapping between diff positions and file lines that updates with every commit. CommitHub's content-based approach is simpler to implement and maintain — we compare file content at two commits rather than tracking position shifts. The trade-off is slightly less precision in outdated detection (content-based detection might miss cases where the line exists but the surrounding context changed), but for a teaching system, the simpler approach is preferable.

---

# Q282. How would you add real-time updates to review comments?

## High-Level Explanation

WebSocket or Server-Sent Events (SSE) connection per PR. When a comment is created/edited/deleted/resolved, broadcast the event to all connected clients viewing that PR. The frontend maintains a subscription and updates the comment list in real-time. For scaling, use a pub/sub layer (Redis) so multiple server instances can broadcast to each other's connected clients.

## Interview Closing Statement

The current polling-based approach (reload on action) is sufficient for the teaching system but would need WebSocket upgrade for production use. The architecture supports this cleanly because the controller already emits structured events (create, resolve, delete) that could be broadcast. The main challenge is connection management — tracking which clients are viewing which PRs — which requires a session registry (Redis-backed for multi-instance deployments).

---

# Q283. How does the frontend inline commenting work with the diff display?

## High-Level Explanation

Each diff line gets a `+` button that appears on hover. Clicking it opens a textarea anchored to that file/line/commit. The commit ID comes from the PR's first commit (the source branch head at PR creation). File headers also get a "Comment" button for file-level comments. The comment form uses the same `createReviewComment` API, passing the exact file, line, and commit context.

## Interview Closing Statement

The inline commenting approach follows GitHub's UX pattern — hover to reveal the comment button, click to open the form, submit to create the comment. The key implementation detail is that the commit ID is fixed at PR creation time (the first commit in the source branch), not the current HEAD. This ensures comments are anchored to the version the reviewer actually looked at, not a potentially different version.

---

# Q284. How do you handle the case where a user comments on a line that was added (not present on the base)?

## High-Level Explanation

Added lines (type "add" in the diff) have `side = "RIGHT"` and a line number on the new file. The `targetLineNumber` in the frontend computes the new-file line number for added lines and context lines, but null for deleted lines. This means you can comment on added lines (which exist in the PR's source) but not on deleted lines (which no longer exist in the source). The backend validation checks that the line exists in the commit snapshot, which is the source commit.

## Interview Closing Statement

This matches GitHub's behavior: you can comment on added lines and context lines but not on deleted lines. The reason is that deleted lines don't exist in the source branch, so the comment has no stable anchor. If a user needs to discuss a deletion, they comment on the adjacent context line or the file-level comment. The `side` field (LEFT/RIGHT) provides additional context for the frontend to display which side of the diff the comment refers to.

---

# Q285. What happens to review comments when a PR is merged?

## High-Level Explanation

Review comments remain in the database and are still accessible when viewing a merged PR. They're associated with the PR via `pullRequest` field, not the branch. The commit association remains valid — the snapshot at the comment's commit still exists in the repository's version control history. Outdated detection stops being relevant (the PR is merged), but the comments themselves are historical artifacts that document the review process.

## Interview Closing Statement

Preserving review comments after merge is important for audit trails and knowledge retention. The comments document decisions made during the review process and can be referenced later when investigating issues. Since comments are anchored to commits (not branches), they remain valid even after the source branch is deleted. The only data that becomes irrelevant is the `outdated` flag, but keeping it doesn't cause any harm.

---

# Q286. How would you implement comment editing with edit history?

## High-Level Explanation

Add an `editHistory` array to the ReviewComment model, where each edit stores `{body, editedAt}`. When editing, push the old body to editHistory and update the current body. The frontend shows "edited" badges and optionally expands to show the edit history. This is a straightforward extension — the current edit implementation (just updating body) would be modified to also record the previous version.

## Interview Closing Statement

Edit history is a common feature in code review tools. The storage cost is linear in the number of edits per comment (typically 0-2), so it's negligible. The alternative — a separate EditHistory collection — is unnecessary because the data is always loaded with the parent comment. The key design decision is whether to show the full history or just an "edited" badge; the latter is simpler and sufficient for most use cases.

---

# Q287. How does the system handle concurrent comment creation on the same line?

## High-Level Explanation

Multiple users can comment on the same file/line simultaneously. There's no locking or conflict detection — each comment is independent and stored separately. The threading model handles this naturally: each comment becomes its own root thread (or a reply to an existing thread). The UI sorts comments by line number and creation time, so concurrent comments on the same line appear in chronological order.

## Interview Closing Statement

Concurrent commenting is safe because comments are append-only — no two operations modify the same document. MongoDB's atomic inserts handle concurrent creates without issues. The only potential UX issue is that two users might write similar comments without seeing each other's, but this is inherent to any non-real-time system and is the same behavior as GitHub. Real-time updates (WebSocket) would mitigate this by showing new comments as they're posted.

---

# Q288. How would you implement a "suggested changes" feature on review comments?

## High-Level Explanation

Add `suggestion` and `appliedSuggestion` fields to ReviewComment. The suggestion contains a code block that can be applied as a commit to the PR. When applied, the system creates a commit on the source branch with the suggested change. This requires: (1) parsing the suggestion as a file/line replacement, (2) creating a branch file edit, (3) committing with a message like "Apply suggestion from @user". The suggestion UI would show a diff preview before applying.

## Interview Closing Statement

Suggested changes are a power-user feature that significantly improves review efficiency. The implementation leverages the existing branch file edit and commit infrastructure — the suggestion is essentially a diff patch that gets applied to the source branch. The main complexity is in parsing the suggestion format (GitHub uses fenced code blocks with file/line metadata) and handling merge conflicts if the suggestion conflicts with other changes. For a teaching system, a simpler approach might be to just show the suggestion as quoted code without automatic application.

---

# Q289. How does the review comment system interact with branch protection?

## High-Level Explanation

Review comments are separate from formal reviews (the ReviewSchema embedded in the PR). Branch protection gates on review state (approved/changes_requested), not on comment count or content. However, the review comment system provides the granular feedback that leads to reviews — a reviewer might leave several line comments before submitting a formal "changes requested" review. The `review` field on ReviewComment optionally links a comment to a formal review.

## Interview Closing Statement

The separation between review comments and formal reviews is intentional: comments are discussions, reviews are decisions. Branch protection cares about decisions (has someone approved?), not discussions (how many comments were posted?). The optional `review` link allows the UI to group comments by review, showing which comments were part of which formal review. This mirrors GitHub's model where inline comments can be part of a review or standalone.

---

# Q290. How would you implement comment search across all PRs in a repository?

## High-Level Explanation

Add a text index on the `body` field and compound indexes on `{repository, body}` for text search. The search endpoint would accept a query string and optional filters (author, filePath, date range). MongoDB's `$text` search handles the full-text query, with results ranked by relevance. For large repositories, consider Elasticsearch for more sophisticated search (fuzzy matching, code-aware search).

## Interview Closing Statement

Comment search is valuable for finding past discussions about specific code patterns or decisions. MongoDB's text search is sufficient for basic keyword search and doesn't require external infrastructure. The trade-off is limited query flexibility (no fuzzy matching, no code-aware search), but for a teaching system, this is acceptable. The search should be scoped to the repository (not global) because review comments are repository-specific and cross-repository search would be confusing.

---

# Feature 10 Interview Closing Statement

Code Review Comments and Review Threads transform pull request reviews from high-level approval/rejection into granular, file-level discussions anchored to specific lines of code. The ReviewComment model stores commit association (which commit the reviewer was looking at), file/line positioning (exact location in the code), and threading (root comments with flat replies). The thread resolution system allows the repo owner to mark discussions as resolved, with outdated detection automatically flagging comments when the underlying code changes. The authorization model ensures only authorized users can edit/delete/resolve, while the notification system keeps participants informed without spamming. The frontend integrates commenting directly into the diff view with hover-to-comment buttons on each line, creating a seamless review experience. The architecture deliberately separates review comments (discussions) from formal reviews (decisions), allowing branch protection to gate on reviews while the comment system facilitates the discussions that inform those decisions. All 30 integration tests pass, and the frontend builds cleanly.


