# Feature 01 – Repository Details

---

# Status

🟡 Designing

Owner: Sanjeev Kumar

Priority: High

Sprint: 1

---

# Implementation Status (Aug 2026)

Backend authorization for `GET /api/repositories/:id` is implemented and integration-tested.

- Authentication is enforced on every request via the JWT `protect` middleware.
- The middleware now returns `401` if the JWT is valid but the user no longer exists in the database.
- The repository endpoint returns:
  - `400` for a malformed repository ID
  - `404` when the repository does not exist
  - `200` for public repositories (any authenticated user) and for the owner of private repositories
  - `403` for private repositories requested by a non-owner
  - `500` with a generic message (no internal error details leaked)
- The owner field is populated (`userName`, `email`).

Verified with an integration test suite (12/12 cases passing) against a dedicated test MongoDB database.

---

# Feature Objective

The Repository Details page serves as the central workspace of CommitHub.

Its primary purpose is to allow authenticated users to securely access and interact with an individual repository. This page acts as the foundation for almost every repository-related feature such as file browsing, branch management, issues, pull requests, commits, settings, and collaboration.

Rather than displaying static information, the page retrieves the latest repository data from the backend while enforcing authentication, authorization, and proper error handling.

---

# High-Level Explanation

When a user selects a repository from the dashboard, the frontend should navigate to the Repository Details page using client-side routing.

The Repository Details page then communicates with the backend through a REST API to retrieve the most recent repository information. The backend authenticates the user, authorizes access, queries MongoDB, and returns the repository data.

Finally, React renders the page using the received data while gracefully handling loading states and possible failures.

---

# Detailed Flow

## Step 1 – User Interaction

The user clicks on a repository card displayed on the Dashboard.

---

## Step 2 – Client-side Routing

React Router intercepts the click event.

The browser URL changes to

/repositories/:repositoryId

without performing a page refresh.

---

## Step 3 – Repository Page Initialization

RepositoryPage is mounted.

The repository ID is extracted from the URL.

---

## Step 4 – Data Fetching

The RepositoryPage sends an HTTP request to retrieve repository data.

---

## Step 5 – Backend Processing

The backend

- validates JWT
- authenticates user
- checks authorization
- validates repository ID
- queries MongoDB

---

## Step 6 – Database

MongoDB retrieves the repository document.

Related data such as the repository owner may also be populated.

---

## Step 7 – Response

The backend returns a JSON response.

---

## Step 8 – UI Rendering

React updates the component state.

The loading indicator disappears.

The Repository Details page is rendered.

---

# Edge Cases

- Invalid repository ID
- Repository not found
- Unauthorized user
- Forbidden access
- JWT expired
- Network timeout
- Empty repository
- Missing README
- No branches
- Repository deleted during request
- Server error

---

# Design Decisions

## Why REST?

REST is simple, predictable, and aligns well with the architecture of CommitHub.

---

## Why fetch data from backend instead of passing repository data through React Router?

Fetching from the backend ensures the user always sees the latest repository information rather than stale client-side data.

---

## Why authenticate every request?

Every repository request should verify the user's identity to prevent unauthorized access.

---

## Why separate routing from data fetching?

Routing determines *where* the user goes.

Data fetching determines *what* information should be displayed.

Keeping these responsibilities separate improves maintainability.

---

# Future Improvements

- Repository caching
- Infinite scrolling
- Optimistic UI
- GraphQL support
- WebSocket updates
- Repository activity timeline
- Repository analytics
- Audit logging

---

# Open Questions

**Should forks have independent permissions?**

Deferred. Forking is not yet implemented.

**Should archived repositories be editable?**

Deferred. Archiving is not yet implemented.

**Should public repositories require authentication?**

Yes. Every repository request passes through the JWT `protect` middleware, so even public repositories require a valid token. A public repository is then readable by any authenticated user; a private repository is readable only by its owner.
