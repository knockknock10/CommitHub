# CommitHub

CommitHub is a full-stack project I'm building to understand how a code-hosting platform works beyond the interface. It brings together repositories, branches, commits, pull requests, code reviews and merge handling in one application.

The frontend is built with React. The backend uses Node.js, Express and MongoDB, with Socket.IO for live updates.

This project models Git-like workflows inside the application. It does not implement the Git wire protocol and isn't intended to replace GitHub or GitLab.

## What it can do

- Create public and private repositories and browse their files.
- Create branches, record commits and compare branches.
- Open pull requests, review changes and leave inline comments.
- Check merge eligibility and resolve conflicts.
- Set branch protection rules and required approvals.
- Manage collaborators, organisations and teams with different roles.
- View notifications and activity updates.
- Receive live updates for repository and pull-request activity.

## How it is put together

```text
React frontend
     |
     | REST API and Socket.IO
     v
Express backend
     |
     +---- Controllers and services
     +---- Authentication and permission checks
     +---- Repository and merge logic
     |
     +---- MongoDB
     +---- Local repository file storage
```

The backend keeps request handling, permission checks and repository operations in separate parts of the code. Repository files are stored on the local filesystem at the moment. The AWS S3 SDK is present in the project, but S3 is not the primary repository-content store.

## Main tools

| Part | Tools |
| --- | --- |
| Frontend | React 19, Vite, React Router, Axios |
| Backend | Node.js, Express 5 |
| Database | MongoDB, Mongoose |
| Live updates | Socket.IO |
| Authentication | JWT, bcrypt |
| Tests | Node.js test runner |
| Development | Docker Compose |

## Run it locally

You need Node.js 20 or newer, npm and Docker.

Start MongoDB from the repository root:

```bash
docker compose up -d
```

Create `backend/.env`:

```env
PORT=5001
MONGO_URI=mongodb://admin:password@localhost:27017/commithub?authSource=admin
JWT_SECRET=replace-this-with-a-local-secret
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
REPO_STORAGE_ROOT=/tmp/commithub-repos
```

Install and start the backend:

```bash
cd backend
npm install
npm run dev
```

In another terminal, create `commithub-frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5001/api
```

Then start the frontend:

```bash
cd commithub-frontend
npm install
npm run dev
```

The backend runs on port 5001 and Vite serves the frontend on port 5173.

The MongoDB username and password above are the values used by the local Docker Compose setup. They are only for local development; change them before using a different database.

## Run the tests

```bash
cd backend
MONGO_URI=mongodb://admin:password@localhost:27017/commithub?authSource=admin npm test
```

The tests use Node's built-in test runner and cover the API and repository workflows. Run them against a test database, not a database containing data you need to keep.

## Current limitations

There are still parts of this project I want to improve:

- Rate limiting is kept in memory, so it isn't suitable for multiple backend instances.
- Socket.IO is running as a single instance; it isn't set up for horizontal scaling.
- Repository content is stored on local disk.
- Search uses MongoDB queries rather than a dedicated search service.
- The repository and commit model is Git-like, but it is not a Git server and does not support the Git wire protocol.
- There is no production infrastructure setup yet.

I'm continuing to work on the project, so the code and feature set may change.
