# Feature 10 — Code Review Comments and Review Threads

Implements file-level and line-level review comments on pull requests, with threaded conversations, thread resolution, commit association, and outdated detection. Complements the existing PR review system (Feature 20) by adding granular code discussion that stays attached to specific lines of code.

## 1. Objective

Pull request reviews gain line-level commenting:

- reviewers leave comments on specific files and line numbers
- comments are anchored to a commit (historical binding)
- root comments form threads; replies are flat (one level only)
- threads can be resolved/unresolved by the repo owner
- comments are marked outdated when the underlying code changes
- notifications fire on replies and @mentions
- activity events are created for root comments (not replies, to avoid spam)

## 2. Status

Implemented. 30 new integration tests in `backend/tests/reviewCommentSystem.test.js`.

## 3. High-Level Explanation

```
PR Diff View
    ↓
Inline Comment Button (+ on each line, Comment on file header)
    ↓
ReviewComment.create(filePath, line, commit, body)
    ↓
Thread = root comment + flat replies
    ↓
Resolution: owner resolves/unresolves the root comment
    ↓
Outdated Detection: new commits → compare file content → mark stale
```

## 4. Data Model

### ReviewComment (separate collection)

| Field | Type | Purpose |
|---|---|---|
| pullRequest | ObjectId → PR | Owning PR |
| repository | ObjectId → Repo | Denormalized for auth checks |
| author | ObjectId → User | Comment author |
| commit | String | Commit ID the comment was written against |
| filePath | String | File the comment references |
| line | Number? | Line number (null for file-level comments) |
| side | LEFT/RIGHT/null | Which side of the diff (default RIGHT) |
| body | String | Comment text |
| parentComment | ObjectId → ReviewComment? | null for root, set for replies |
| review | ObjectId? | Optional link to a formal review |
| resolved | Boolean | Whether the thread is resolved |
| resolvedBy | ObjectId → User? | Who resolved it |
| resolvedAt | Date? | When resolved |
| outdated | Boolean | Whether code has changed since comment |

### Indexes

- `{pullRequest, filePath, line}` — query comments per file/line
- `{pullRequest, resolved, createdAt}` — filter by resolved status
- `{pullRequest, parentComment}` — find replies
- `{repository, author, createdAt}` — user's comment history

## 5. API Endpoints

All mounted under `/api/repositories/:id/pull-requests/:number/review-comments`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/` | List comments (filter: `filePath`, `resolved`) |
| POST | `/` | Create a comment (body, commit, filePath, line?, side?, parentCommentId?) |
| GET | `/:commentId` | Get thread (root + replies) |
| PATCH | `/:commentId` | Edit comment (author only) |
| DELETE | `/:commentId` | Delete comment (author or repo owner) |
| POST | `/:commentId/reply` | Reply to a root comment |
| POST | `/:commentId/resolve` | Resolve thread (repo owner only) |
| POST | `/:commentId/unresolve` | Unresolve thread (repo owner only) |

## 6. Thread Model

- **Root comment**: `parentComment = null`. Forms the thread header.
- **Reply**: `parentComment = root._id`. Flat — replies cannot nest further.
- **Resolution**: Only root comments can be resolved/unresolved.
- **Deletion**: Deleting a root cascades to delete all replies.

## 7. Commit Association and Outdated Detection

Each comment stores the `commit` ID it was written against. When new commits are pushed to the PR:

1. `markOutdatedComments()` is called (best-effort, never fails the primary operation).
2. For each non-outdated comment whose `commit` differs from the current HEAD:
   - Load snapshots at both commits
   - Compare file content at the comment's `filePath`
   - If the content changed and the specific line context is gone → mark `outdated: true`

This preserves historical accuracy — comments never silently move to different lines.

## 8. Authorization

| Action | Who |
|---|---|
| Create comment | Anyone with read access (owner or public repo) |
| Reply | Anyone with read access |
| Edit | Author only |
| Delete | Author or repo owner |
| Resolve/Unresolve | Repo owner only |

## 9. Notifications

- **Reply to comment**: notifies the root comment author + PR author (excluding self)
- **@mentions in body**: extracted via `createMentionNotifications()`
- **Root comment activity**: `PR_COMMENTED` with metadata `{filePath, line}`
- **Reply activity**: none (avoids feed spam)

## 10. Frontend

### Inline Diff Commenting
- Each diff line shows a `+` button on hover
- File headers show a "Comment" button for file-level comments
- Clicking opens a textarea; submitting creates a review comment anchored to that file/line/commit

### ReviewCommentPanel
- Displays all review comments grouped into threads
- Filter tabs: All / Unresolved / Resolved
- Thread card shows file path, line number, outdated badge, resolved badge
- Each reply is shown inline under the root
- "Reply" button opens inline reply form
- "Resolve"/"Unresolve" button (owner only)
- "Delete" button (author only)
