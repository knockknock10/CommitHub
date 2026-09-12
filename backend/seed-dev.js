import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import User from "./models/userModel.js";
import Repository from "./models/repoModel.js";
import Issue from "./models/issueModel.js";
import Comment from "./models/commentModel.js";
import PullRequest from "./models/pullRequestModel.js";
import Collaborator from "./models/collaboratorModel.js";
import Organization from "./models/organizationModel.js";
import OrganizationMembership from "./models/organizationMembershipModel.js";
import Team from "./models/teamModel.js";
import TeamMembership from "./models/teamMembershipModel.js";
import Notification from "./models/notificationModel.js";
import { createActivity } from "./services/activityService.js";
import { createNotification } from "./services/notificationService.js";
import { createCommit as performCommit } from "./utils/repoVersion.js";
import { getRepoRoot } from "./utils/repoStorage.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await connectDB();

const DEV_PASSWORD = "DevPassword123!";

const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);

let log = (msg) => console.log("[seed] " + msg);

const findOrCreateUser = async (userName, email, profile = {}) => {
    const existing = await User.findOne({ userName });
    if (existing) {
        let changed = false;
        if (existing.email !== email) {
            existing.email = email;
            changed = true;
        }
        if (!(await bcrypt.compare(DEV_PASSWORD, existing.password))) {
            existing.password = hashedPassword;
            changed = true;
        }
        if (profile.name !== undefined && existing.name !== profile.name) {
            existing.name = profile.name;
            changed = true;
        }
        if (profile.bio !== undefined && existing.bio !== profile.bio) {
            existing.bio = profile.bio;
            changed = true;
        }
        if (changed) {
            await existing.save();
            log(`updated credentials for ${userName}`);
        }
        return existing;
    }
    const user = await User.create({
        userName,
        email,
        password: hashedPassword,
        name: profile.name || "",
        bio: profile.bio || ""
    });
    log(`created user ${userName}`);
    return user;
};

const findOrCreateRepo = async ({
    name,
    description = "",
    visibility = "public",
    owner,
    branches = ["main"],
    stars = 0,
    forks = 0,
    prCount = 0
}) => {
    const existing = await Repository.findOne({
        name,
        owner: owner._id
    });
    if (existing) {
        return existing;
    }
    const repo = await Repository.create({
        name,
        description,
        visibility,
        owner: owner._id,
        branches,
        stars,
        forks,
        prCount
    });
    await User.updateOne(
        { _id: owner._id },
        { $addToSet: { repositories: repo._id } }
    );
    log(`created repository ${owner.userName}/${name} (${visibility})`);
    return repo;
};

/* Write a file tree directly onto the repository filesystem so the file
   browser and code viewer read real content from the working tree. */
const writeTree = async (repo, tree) => {
    const root = getRepoRoot(repo.owner, repo._id);
    await fs.promises.mkdir(root, { recursive: true });

    for (const [relativePath, content] of Object.entries(tree)) {
        const target = path.join(root, relativePath);
        await fs.promises.mkdir(
            path.dirname(target),
            { recursive: true }
        );
        await fs.promises.writeFile(target, content, "utf8");
    }
};

const initialCommit = async (repo, author, message) => {
    const root = getRepoRoot(repo.owner, repo._id);

    try {
        const commit = await performCommit(root, {
            message,
            author: {
                name: author.userName,
                email: author.email
            }
        });
        await createActivity({
            actor: author._id,
            type: "COMMIT_CREATED",
            repository: repo._id,
            commitId: commit.id,
            metadata: { commitMessage: commit.message }
        });
        return commit;
    } catch (error) {
        if (error.code === "NO_CHANGES") {
            return null;
        }
        log(`initial commit failed for ${repo.name}: ${error.message}`);
        return null;
    }
};

const addUserToRepo = async (repo, user, role, invitedBy) => {
    const existing = await Collaborator.findOne({
        repository: repo._id,
        user: user._id
    });
    if (existing) {
        return existing;
    }
    const collaborator = await Collaborator.create({
        repository: repo._id,
        user: user._id,
        role,
        invitedBy: invitedBy._id
    });
    log(`added ${user.userName} as ${role} on ${repo.name}`);
    await createActivity({
        actor: invitedBy._id,
        type: "COLLABORATOR_ADDED",
        repository: repo._id
    });
    return collaborator;
};

const addStar = async (user, repo) => {
    const already = user.starRepo.some(
        (r) => r.toString() === repo._id.toString()
    );
    if (already) {
        return;
    }
    await User.updateOne(
        { _id: user._id },
        { $addToSet: { starRepo: repo._id } }
    );
    await Repository.updateOne(
        { _id: repo._id },
        { $inc: { stars: 1 } }
    );
    await createActivity({
        actor: user._id,
        type: "REPOSITORY_STARRED",
        repository: repo._id
    });
    await createNotification({
        recipient: repo.owner,
        actor: user._id,
        type: "REPOSITORY_STARRED",
        repository: repo._id,
        message: "starred your repository"
    });
};

const addFollow = async (user, target) => {
    const already = user.followedUsers.some(
        (u) => u.toString() === target._id.toString()
    );
    if (already || user._id.toString() === target._id.toString()) {
        return;
    }
    await User.updateOne(
        { _id: user._id },
        { $addToSet: { followedUsers: target._id } }
    );
};

const createIssue = async (repo, author, title, description, status, label, assignee = null) => {
    const existing = await Issue.findOne({
        title,
        repository: repo._id
    });
    if (existing) {
        return existing;
    }
    const issue = await Issue.create({
        title,
        description,
        status,
        repository: repo._id,
        label,
        author: author._id,
        assignee: assignee ? assignee._id : null
    });
    log(`created ${status} issue "${title}" on ${repo.name}`);
    await createActivity({
        actor: author._id,
        type: "ISSUE_CREATED",
        repository: repo._id,
        issue: issue._id
    });
    if (repo.owner.toString() !== author._id.toString()) {
        await createNotification({
            recipient: repo.owner,
            actor: author._id,
            type: "ISSUE_CREATED",
            repository: repo._id,
            issue: issue._id,
            message: `opened an issue in your repository: "${title}"`
        });
    }
    return issue;
};

const createPr = async (repo, author, number, title, description, status, sourceBranch, targetBranch, mergedBy = null) => {
    const existing = await PullRequest.findOne({
        repository: repo._id,
        number
    });
    if (existing) {
        return existing;
    }
    const pr = await PullRequest.create({
        number,
        repository: repo._id,
        author: author._id,
        sourceBranch,
        targetBranch,
        title,
        description,
        status,
        mergedAt: status === "merged" ? new Date() : null,
        mergedBy: mergedBy ? mergedBy._id : null
    });
    log(`created PR #${number} "${title}" on ${repo.name} (${status})`);
    await createActivity({
        actor: author._id,
        type: status === "merged" ? "PR_MERGED" : "PR_CREATED",
        repository: repo._id,
        pullRequest: pr._id
    });
    if (repo.owner.toString() !== author._id.toString()) {
        await createNotification({
            recipient: repo.owner,
            actor: author._id,
            type: status === "merged" ? "PR_MERGED" : "PR_CREATED",
            repository: repo._id,
            pullRequest: pr._id,
            message: `opened a pull request in your repository: "${title}" (#${number})`
        });
    }
    return pr;
};

const createOrg = async (name, slug, description, owner) => {
    const existing = await Organization.findOne({ slug });
    if (existing) {
        return existing;
    }
    const org = await Organization.create({
        name,
        slug,
        description,
        owner: owner._id
    });
    log(`created organization ${name}`);
    await OrganizationMembership.create({
        organization: org._id,
        user: owner._id,
        role: "OWNER"
    });
    return org;
};

const addOrgMember = async (org, user, role) => {
    const existing = await OrganizationMembership.findOne({
        organization: org._id,
        user: user._id
    });
    if (existing) {
        return existing;
    }
    await OrganizationMembership.create({
        organization: org._id,
        user: user._id,
        role
    });
    log(`added ${user.userName} to ${org.name} as ${role}`);
};

const createTeam = async (org, name, description, createdBy) => {
    const existing = await Team.findOne({ organization: org._id, name });
    if (existing) {
        return existing;
    }
    const team = await Team.create({
        name,
        organization: org._id,
        description,
        createdBy: createdBy._id
    });
    log(`created team ${name} in ${org.name}`);
    return team;
};

const addTeamMember = async (team, user, role = "member") => {
    const existing = await TeamMembership.findOne({
        team: team._id,
        user: user._id
    });
    if (existing) {
        return existing;
    }
    await TeamMembership.create({
        team: team._id,
        user: user._id,
        role
    });
};

const seed = async () => {
    /* ============================= USERS ============================= */
    log("=== users ===");
    const sanjeev = await findOrCreateUser("sanjeevkumar", "sanjeev@example.com", {
        name: "Sanjeev Kumar",
        bio: "Building CommitHub — a full-featured GitHub-style platform with real version control."
    });
    const alex = await findOrCreateUser("alexmorgan", "alex@example.com", {
        name: "Alex Morgan",
        bio: "Full-stack engineer. Maintains task-manager and contributes to CommitHub."
    });
    const priya = await findOrCreateUser("priyasharma", "priya@example.com", {
        name: "Priya Sharma",
        bio: "Frontend developer and open-source contributor. Reporting bugs since 2024."
    });
    const daniel = await findOrCreateUser("danielchen", "daniel@example.com", {
        name: "Daniel Chen",
        bio: "Machine learning engineer. Owner of DevForge."
    });
    const emma = await findOrCreateUser("emmawilson", "emma@example.com", {
        name: "Emma Wilson",
        bio: "Backend engineer focused on APIs and real-time systems."
    });

    /* ========================= REPOSITORIES ========================== */
    log("=== repositories ===");

    /* sanjeev repos */
    const commithub = await findOrCreateRepo({
        name: "CommitHub",
        description: "GitHub inspired version control platform with pull requests, issues, and real-time collaboration.",
        visibility: "public",
        owner: sanjeev,
        branches: ["main", "development"],
        stars: 32,
        forks: 9
    });

    const commithubFrontend = await findOrCreateRepo({
        name: "commithub-frontend",
        description: "Frontend dashboard and repository interface for CommitHub.",
        visibility: "public",
        owner: sanjeev,
        branches: ["main", "feature/ui-refresh"],
        stars: 41,
        forks: 13
    });

    const awsStorage = await findOrCreateRepo({
        name: "aws-storage-service",
        description: "Handles AWS S3 uploads and repository backups.",
        visibility: "private",
        owner: sanjeev,
        branches: ["main"],
        stars: 8,
        forks: 1
    });

    const aevor = await findOrCreateRepo({
        name: "aevor",
        description: "High-performance API gateway written in Go with JWT authentication and rate limiting.",
        visibility: "public",
        owner: sanjeev,
        branches: ["main"],
        stars: 18,
        forks: 4
    });

    const expenseTracker = await findOrCreateRepo({
        name: "expense-tracker",
        description: "Personal expense tracking API with monthly budgets and category analytics.",
        visibility: "private",
        owner: sanjeev,
        branches: ["main"],
        stars: 2,
        forks: 0
    });

    /* alex repos */
    const taskManager = await findOrCreateRepo({
        name: "task-manager",
        description: "Task management API with projects, kanban boards and team collaboration.",
        visibility: "public",
        owner: alex,
        branches: ["main", "development"],
        stars: 24,
        forks: 6,
        prCount: 3
    });

    const weatherApi = await findOrCreateRepo({
        name: "weather-api",
        description: "Weather forecast and location weather API built with FastAPI.",
        visibility: "public",
        owner: alex,
        branches: ["main"],
        stars: 11,
        forks: 3,
        prCount: 2
    });

    const portfolio = await findOrCreateRepo({
        name: "portfolio",
        description: "Personal portfolio website with projects gallery and contact form.",
        visibility: "public",
        owner: alex,
        branches: ["main"],
        stars: 5,
        forks: 1
    });

    const alexPrivate = await findOrCreateRepo({
        name: "alex-private-project",
        description: "Internal summer internship project. Access required.",
        visibility: "private",
        owner: alex,
        branches: ["main"],
        stars: 1,
        forks: 0
    });

    /* priya repos */
    const mlPlayground = await findOrCreateRepo({
        name: "ml-playground",
        description: "Machine learning experiments in scikit-learn and PyTorch.",
        visibility: "public",
        owner: priya,
        branches: ["main", "experiments"],
        stars: 27,
        forks: 8,
        prCount: 1
    });

    const recipeApi = await findOrCreateRepo({
        name: "recipe-api",
        description: "Recipe sharing REST API with search, ratings and meal planning.",
        visibility: "public",
        owner: priya,
        branches: ["main"],
        stars: 9,
        forks: 2
    });

    const campusConnect = await findOrCreateRepo({
        name: "campus-connect",
        description: "Campus events and clubs platform for students.",
        visibility: "private",
        owner: priya,
        branches: ["main"],
        stars: 3,
        forks: 0
    });

    /* daniel repos */
    const chatServer = await findOrCreateRepo({
        name: "chat-server",
        description: "Real-time chat server using Socket.IO with rooms and typing indicators.",
        visibility: "public",
        owner: daniel,
        branches: ["main", "feature/typing"],
        stars: 33,
        forks: 10,
        prCount: 1
    });

    const fileStorage = await findOrCreateRepo({
        name: "file-storage",
        description: "Distributed file storage service written in Go with S3 backend.",
        visibility: "public",
        owner: daniel,
        branches: ["main"],
        stars: 14,
        forks: 5
    });

    const urlShortener = await findOrCreateRepo({
        name: "url-shortener",
        description: "URL shortening service with analytics and expiry support.",
        visibility: "private",
        owner: daniel,
        branches: ["main"],
        stars: 6,
        forks: 1
    });

    /* emma repos */
    const ecommerceApi = await findOrCreateRepo({
        name: "ecommerce-api",
        description: "E-commerce REST API for products, cart and orders.",
        visibility: "public",
        owner: emma,
        branches: ["main", "dev"],
        stars: 19,
        forks: 7,
        prCount: 2
    });

    const blogPlatform = await findOrCreateRepo({
        name: "blog-platform",
        description: "Markdown blog platform with comments and tags.",
        visibility: "public",
        owner: emma,
        branches: ["main"],
        stars: 8,
        forks: 2
    });

    /* ========================= FILE TREES ============================ */
    log("=== file trees ===");

    await writeTree(commithub, {
        "README.md": `# CommitHub

A GitHub-inspired version control platform.

## Features

- Repositories with file browsing and code viewing
- Issues and pull requests
- Real-time collaboration with Socket.IO
- Branch protection and conflict resolution
- Organizations and teams

## Getting started

\`\`\`bash
npm install
npm run dev
\`\`\`

The platform stores every repository as a real directory tree under \`repo-storage/\`.
`,
        "package.json": `{
  "name": "commithub",
  "version": "1.4.0",
  "description": "GitHub inspired version control platform",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --test tests/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "socket.io": "^4.7.0"
  }
}
`,
        ".gitignore": `node_modules/
.env
.DS_Store
logs/
repo-storage/
`,
        "src/server.js": `import app from "./app.js";

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(\`CommitHub API running on port \${PORT}\`);
});
`,
        "src/app.js": `import express from "express";
import apiRoutes from "./routes/api.js";

const app = express();

app.use(express.json());

app.use("/api", apiRoutes);

export default app;
`,
        "src/controllers/repoController.js": `import Repository from "../models/Repository.js";

export const createRepository = async (req, res) => {
    const { name, description, visibility } = req.body;

    const repository = await Repository.create({
        name,
        description,
        visibility,
        owner: req.user._id
    });

    res.status(201).json(repository);
};
`,
        "src/controllers/issueController.js": `export const createIssue = async (req, res) => {
    const { title, description } = req.body;

    const issue = await Issue.create({
        title,
        description,
        repository: req.params.id,
        author: req.user._id
    });

    res.status(201).json(issue);
};
`,
        "src/controllers/prController.js": `export const mergePullRequest = async (req, res) => {
    const pr = await PullRequest.findById(req.params.number);

    pr.status = "merged";
    pr.mergedAt = new Date();
    await pr.save();

    res.json(pr);
};
`,
        "src/routes/api.js": `import express from "express";
import authRoutes from "./auth.js";

const router = express.Router();

router.use("/auth", authRoutes);

router.get("/health", (req, res) => {
    res.json({ status: "ok" });
});

export default router;
`,
        "src/routes/auth.js": `import express from "express";

const router = express.Router();

router.post("/login", (req, res) => {
    res.json({ token: "demo-token" });
});

export default router;
`
    });
    await initialCommit(commithub, sanjeev, "Initial platform scaffolding");

    await writeTree(commithubFrontend, {
        "README.md": `# CommitHub Frontend

React dashboard for CommitHub.

\`\`\`bash
npm install
npm run dev
\`\`\`
`,
        "package.json": `{
  "name": "commithub-frontend",
  "version": "1.4.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "vite build" },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0"
  }
}
`,
        "src/App.jsx": `import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Repository from "./pages/Repository.jsx";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/repo/:id" element={<Repository />} />
            </Routes>
        </BrowserRouter>
    );
}
`,
        "src/main.jsx": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
`,
        "src/components/Header.jsx": `export default function Header() {
    return (
        <header className="header">
            <h1>CommitHub</h1>
            <nav>
                <a href="/repositories">Repositories</a>
                <a href="/issues">Issues</a>
            </nav>
        </header>
    );
}
`,
        "src/components/Sidebar.jsx": `export default function Sidebar() {
    return (
        <aside className="sidebar">
            <a href="/dashboard">Dashboard</a>
            <a href="/repositories">Repositories</a>
            <a href="/activity">Activity</a>
        </aside>
    );
}
`,
        "src/components/RepoCard.jsx": `export default function RepoCard({ repo }) {
    return (
        <div className="repo-card">
            <h3>{repo.name}</h3>
            <p>{repo.description}</p>
            <span className={\`badge \${repo.visibility}\`}>{repo.visibility}</span>
        </div>
    );
}
`,
        "src/pages/Dashboard.jsx": `import RepoCard from "../components/RepoCard.jsx";

export default function Dashboard({ repos }) {
    return (
        <main className="dashboard">
            <h2>Your repositories</h2>
            <div className="repo-grid">
                {repos.map((repo) => (
                    <RepoCard key={repo.id} repo={repo} />
                ))}
            </div>
        </main>
    );
}
`,
        "src/pages/Repository.jsx": `import { useParams } from "react-router-dom";

export default function Repository() {
    const { id } = useParams();

    return <main className="repository">Repository {id}</main>;
}
`,
        "src/pages/Search.jsx": `export default function Search() {
    return (
        <main className="search">
            <input type="search" placeholder="Search..." />
        </main>
    );
}
`
    });
    await initialCommit(commithubFrontend, sanjeev, "Initial frontend dashboard");

    await writeTree(awsStorage, {
        "README.md": `# AWS Storage Service

Private service handling S3 uploads and repository backups.
`,
        "package.json": `{
  "name": "aws-storage-service",
  "version": "1.0.0",
  "main": "server.js",
  "dependencies": { "aws-sdk": "^2.1500.0", "express": "^4.18.2" }
}
`,
        "server.js": `import express from "express";
import { upload } from "./src/s3.js";

const app = express();

app.post("/upload", upload, (req, res) => {
    res.json({ key: req.file.key });
});

app.listen(5003);
`,
        "src/config.js": `import dotenv from "dotenv";
dotenv.config();

export const AWS_CONFIG = {
    region: process.env.AWS_REGION || "us-east-1",
    bucket: process.env.S3_BUCKET
};
`,
        "src/s3.js": `import aws from "aws-sdk";

export const s3 = new aws.S3();

export async function upload(key, body) {
    return s3.putObject({ Bucket: process.env.S3_BUCKET, Key: key, Body: body }).promise();
}
`,
        "src/backup.js": `import { copyFile, mkdir } from "fs/promises";

export async function backupRepository(repoRoot, targetDir) {
    await mkdir(targetDir, { recursive: true });
    await copyFile(repoRoot, targetDir);
}
`,
        ".env.example": `AWS_REGION=us-east-1
S3_BUCKET=commithub-backups
`
    });
    await initialCommit(awsStorage, sanjeev, "S3 upload service init");

    await writeTree(aevor, {
        "README.md": `# Aevor

A high-performance API gateway written in Go.

Features: JWT authentication, rate limiting, routing, and metrics.

\`\`\`bash
go build ./cmd/server
./server
\`\`\`
`,
        "go.mod": `module github.com/sanjeevkumar/aevor

go 1.21

require github.com/golang-jwt/jwt/v5 v5.2.0
`,
        "cmd/server/main.go": `package main

import (
    "log"
    "net/http"

    "github.com/sanjeevkumar/aevor/internal/auth"
    "github.com/sanjeevkumar/aevor/internal/database"
)

func main() {
    db := database.NewPostgres()
    if err := db.Connect(); err != nil {
        log.Fatal(err)
    }

    authHandler := auth.NewHandler()
    http.Handle("/api/auth", authHandler)

    log.Println("aevor listening on :8080")
    http.ListenAndServe(":8080", nil)
}
`,
        "internal/auth/service.go": `package auth

import (
    "github.com/golang-jwt/jwt/v5"
)

var jwtSecret = []byte("change-me")

type Claims struct {
    UserID string
    jwt.RegisteredClaims
}

func Sign(userID string) (string, error) {
    claims := Claims{UserID: userID}
    return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(jwtSecret)
}
`,
        "internal/repository/service.go": `package repository

import "database/sql"

type Service struct {
    db *sql.DB
}

func NewService(db *sql.DB) *Service {
    return &Service{db: db}
}

func (s *Service) List() ([]string, error) {
    rows, err := s.db.Query("SELECT name FROM repositories")
    if err != nil {
        return nil, err
    }
    defer rows.Close()

    var names []string
    for rows.Next() {
        var name string
        if err := rows.Scan(&name); err != nil {
            return nil, err
        }
        names = append(names, name)
    }
    return names, nil
}
`,
        "internal/database/postgres.go": `package database

import (
    "database/sql"
    _ "github.com/lib/pq"
)

type Postgres struct {
    conn *sql.DB
}

func NewPostgres() *Postgres {
    return &Postgres{}
}

func (p *Postgres) Connect() error {
    conn, err := sql.Open("postgres", "postgres://localhost/aevor")
    if err != nil {
        return err
    }
    p.conn = conn
    return conn.Ping()
}
`,
        "Dockerfile": `FROM golang:1.21-alpine AS build
WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY . .
RUN go build -o /aevor ./cmd/server

FROM alpine:3.19
COPY --from=build /aevor /usr/local/bin/aevor
EXPOSE 8080
CMD ["aevor"]
`,
        "docker-compose.yml": `version: "3.9"
services:
  aevor:
    build: .
    ports:
      - "8080:8080"
`
    });
    await initialCommit(aevor, sanjeev, "Initial aevor gateway");

    await writeTree(expenseTracker, {
        "README.md": `# Expense Tracker

Personal expense tracking API.

Private repository.
`,
        "package.json": `{
  "name": "expense-tracker",
  "version": "0.1.0",
  "main": "src/server.js",
  "dependencies": { "express": "^4.18.2", "mongoose": "^7.5.0" }
}
`,
        ".env.example": `PORT=4000
MONGO_URI=mongodb://localhost:27017/expense-tracker
`,
        "src/server.js": `import express from "express";
import expenseRoutes from "./routes/expenseRoutes.js";

const app = express();
app.use(express.json());
app.use("/expenses", expenseRoutes);

app.listen(4000);
`,
        "src/db.js": `import mongoose from "mongoose";

export const connect = () =>
    mongoose.connect(process.env.MONGO_URI);
`,
        "src/routes/expenseRoutes.js": `import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ expenses: [] });
});

export default router;
`,
        "src/routes/categoryRoutes.js": `import { Router } from "express";

const router = Router();

router.get("/", (req, res) => {
    res.json({ categories: ["Food", "Rent", "Transport"] });
});

export default router;
`
    });
    await initialCommit(expenseTracker, sanjeev, "Expense tracker scaffold");

    await writeTree(taskManager, {
        "README.md": `# Task Manager

Task and project management API with kanban board support.

## API

- \`GET /api/tasks\` - list tasks
- \`POST /api/tasks\` - create a task
- \`GET /api/projects\` - list projects

## Setup

\`\`\`bash
npm install
cp .env.example .env
npm run dev
\`\`\`
`,
        "package.json": `{
  "name": "task-manager",
  "version": "2.1.0",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js",
    "test": "node --test test/"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "jsonwebtoken": "^9.0.2"
  }
}
`,
        ".env.example": `PORT=4000
MONGO_URI=mongodb://localhost:27017/taskmanager
JWT_SECRET=change-me
`,
        "src/server.js": `import express from "express";
import taskRoutes from "./routes/taskRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";

const app = express();

app.use(express.json());
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);

app.listen(process.env.PORT || 4000, () => {
    console.log("task-manager running");
});
`,
        "src/controllers/taskController.js": `import Task from "../models/Task.js";

export const listTasks = async (req, res) => {
    const tasks = await Task.find({ project: req.query.project });
    res.json(tasks);
};

export const createTask = async (req, res) => {
    const task = await Task.create({
        title: req.body.title,
        project: req.body.project,
        assignee: req.body.assignee
    });
    res.status(201).json(task);
};

export const updateTaskStatus = async (req, res) => {
    const task = await Task.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
    );
    if (!task) {
        return res.status(404).json({ message: "Task not found" });
    }
    res.json(task);
};
`,
        "src/controllers/projectController.js": `import Project from "../models/Project.js";

export const listProjects = async (req, res) => {
    res.json(await Project.find());
};

export const createProject = async (req, res) => {
    const project = await Project.create(req.body);
    res.status(201).json(project);
};
`,
        "src/models/Task.js": `import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    status: {
        type: String,
        enum: ["todo", "in_progress", "done"],
        default: "todo"
    },
    project: { type: mongoose.Types.ObjectId, ref: "Project" },
    assignee: { type: mongoose.Types.ObjectId, ref: "User" },
    dueDate: Date
}, { timestamps: true });

export default mongoose.model("Task", taskSchema);
`,
        "src/models/Project.js": `import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    owner: { type: mongoose.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Project", projectSchema);
`,
        "src/routes/taskRoutes.js": `import { Router } from "express";
import {
    listTasks,
    createTask,
    updateTaskStatus
} from "../controllers/taskController.js";

const router = Router();

router.get("/", listTasks);
router.post("/", createTask);
router.patch("/:id", updateTaskStatus);

export default router;
`,
        "src/routes/projectRoutes.js": `import { Router } from "express";
import { listProjects, createProject } from "../controllers/projectController.js";

const router = Router();

router.get("/", listProjects);
router.post("/", createProject);

export default router;
`
    });
    await initialCommit(taskManager, alex, "Initial task-manager API");

    await writeTree(weatherApi, {
        "README.md": `# Weather API

Forecast and current weather API built with FastAPI.

## Endpoints

- \`GET /weather/current?city=\`
- \`GET /weather/forecast?city=&days=\`

## Run

\`\`\`bash
pip install -r requirements.txt
uvicorn app.main:app --reload
\`\`\`
`,
        "requirements.txt": `fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.0
requests==2.31.0
`,
        "app/main.py": `from fastapi import FastAPI
from app.api import weather, location

app = FastAPI(title="Weather API")

app.include_router(weather.router, prefix="/weather")
app.include_router(location.router, prefix="/location")


@app.get("/")
def health():
    return {"status": "ok"}
`,
        "app/models.py": `from pydantic import BaseModel


class Forecast(BaseModel):
    city: str
    high: float
    low: float
    conditions: str
`,
        "app/schemas.py": `from pydantic import BaseModel


class LocationRequest(BaseModel):
    latitude: float
    longitude: float
`,
        "app/api/weather.py": `from fastapi import APIRouter, Query
import httpx

router = APIRouter()


@router.get("/current")
async def current(city: str = Query(..., min_length=1)):
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"https://api.weather.example/city/{city}")
        return resp.json()
`,
        "app/api/location.py": `from fastapi import APIRouter
from app.schemas import LocationRequest

router = APIRouter()


@router.post("/reverse")
async def reverse(req: LocationRequest):
    return {"latitude": req.latitude, "longitude": req.longitude}
`,
        "Dockerfile": `FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0"]
`
    });
    await initialCommit(weatherApi, alex, "FastAPI weather service init");

    await writeTree(portfolio, {
        "README.md": `# Portfolio

Personal portfolio site built with vanilla HTML/CSS/JS.
`,
        "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Alex Morgan</title>
    <link rel="stylesheet" href="css/style.css" />
</head>
<body>
    <main class="hero">
        <h1>Hi, I'm Alex.</h1>
        <p>Full-stack developer.</p>
    </main>
    <script src="js/app.js"></script>
</body>
</html>
`,
        "css/style.css": `:root {
    --bg: #0f172a;
    --text: #e2e8f0;
}

* {
    box-sizing: border-box;
}

body {
    margin: 0;
    background: var(--bg);
    color: var(--text);
    font-family: system-ui, sans-serif;
}

.hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8rem 2rem;
}
`,
        "js/app.js": `// project cards filtering
document.addEventListener("DOMContentLoaded", () => {
    console.log("portfolio ready");
});
`
    });
    await initialCommit(portfolio, alex, "Portfolio site init");

    await writeTree(alexPrivate, {
        "README.md": `# Alex Private Project

Confidential summer project. Authorized collaborators only.
`,
        "package.json": `{
  "name": "alex-private-project",
  "version": "0.1.0",
  "main": "src/server.js",
  "private": true
}
`,
        "src/server.js": `console.log("private project booting...");
`,
        "docs/ROADMAP.md": `# Roadmap

- [ ] Finalize integration plan
- [ ] Review security notes
`
    });
    await initialCommit(alexPrivate, alex, "Private project init");

    await writeTree(mlPlayground, {
        "README.md": `# ML Playground

Machine learning experiments with scikit-learn and PyTorch.

## Contents

- \`scripts/\` - training and evaluation scripts
- \`notebooks/\` - exploratory Jupyter notebooks
- \`data/\` - datasets
`,
        "requirements.txt": `scikit-learn==1.4.0
torch==2.1.2
pandas==2.1.4
numpy==1.26.3
jupyter>=1.0,<2
`,
        ".gitignore": `__pycache__/
*.pyc
data/*.csv
.env
`,
        "scripts/train.py": `import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split


def main():
    X = np.random.rand(1000, 10)
    y = (X[:, 0] > 0.5).astype(int)

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)

    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)

    print(f"accuracy: {model.score(X_test, y_test):.3f}")


if __name__ == "__main__":
    main()
`,
        "scripts/evaluate.py": `import joblib


def evaluate(model_path: str, X_test, y_test):
    model = joblib.load(model_path)
    return model.score(X_test, y_test)
`,
        "notebooks/exploration.ipynb": `{
 "cells": [
  {
   "cell_type": "markdown",
   "metadata": {},
   "source": ["# Data exploration\n\nExploring the dataset before modelling."]
  },
  {
   "cell_type": "code",
   "execution_count": null,
   "metadata": {},
   "outputs": [],
   "source": ["import pandas as pd\n\nprint(pd)"] 
  }
 ],
 "metadata": {},
 "nbformat": 4,
 "nbformat_minor": 5
}
`,
        "data/.gitkeep": ""
    });
    await initialCommit(mlPlayground, priya, "ML playground init");

    await writeTree(recipeApi, {
        "README.md": `# Recipe API

Recipe sharing API with ratings and meal planning.

\`\`\`bash
npm run dev
\`\`\`
`,
        "package.json": `{
  "name": "recipe-api",
  "version": "1.2.0",
  "main": "src/app.js",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0"
  }
}
`,
        "src/app.js": `import express from "express";
import recipes from "./routes/recipes.js";

const app = express();

app.use(express.json());
app.use("/recipes", recipes);

export default app;
`,
        "src/db.js": `import mongoose from "mongoose";

export async function connect() {
    return mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/recipes");
}
`,
        "src/models/Recipe.js": `import mongoose from "mongoose";

const recipeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    ingredients: [String],
    steps: [String],
    rating: { type: Number, default: 0 },
    author: { type: mongoose.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Recipe", recipeSchema);
`,
        "src/routes/recipes.js": `import { Router } from "express";
import Recipe from "../models/Recipe.js";

const router = Router();

router.get("/", async (req, res) => {
    res.json(await Recipe.find());
});

router.post("/", async (req, res) => {
    res.status(201).json(await Recipe.create(req.body));
});

export default router;
`,
        "src/data/seed.json": `[
  { "title": "Banana Pancakes", "ingredients": ["banana", "egg", "flour"], "rating": 4.5 },
  { "title": "Miso Ramen", "ingredients": ["miso", "noodles", "broth"], "rating": 5 }
]
`
    });
    await initialCommit(recipeApi, priya, "Recipe API init");

    await writeTree(campusConnect, {
        "README.md": `# Campus Connect

Campus events and clubs platform.
`,
        "package.json": `{
  "name": "campus-connect",
  "version": "0.1.0",
  "private": true,
  "dependencies": { "express": "^4.18.2", "mongoose": "^7.5.0" }
}
`,
        "src/server.js": `import app from "./app.js";

app.listen(4004, () => console.log("campus-connect up"));
`,
        "src/config/db.js": `import mongoose from "mongoose";

export const connect = () => mongoose.connect(process.env.MONGO_URI);
`,
        "src/controllers/authController.js": `export const login = (req, res) => {
    res.json({ ok: true });
};
`,
        "src/controllers/eventController.js": `export const listEvents = async (req, res) => {
    res.json({ events: [] });
};
`
    });
    await initialCommit(campusConnect, priya, "Campus connect init");

    await writeTree(chatServer, {
        "README.md": `# Chat Server

Real-time chat server using Socket.IO.

## Features

- Rooms
- Typing indicators
- Message history
`,
        "package.json": `{
  "name": "chat-server",
  "version": "2.0.0",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "dev": "nodemon src/server.js",
    "start": "node src/server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.0"
  }
}
`,
        "src/server.js": `import express from "express";
import http from "http";
import { Server } from "socket.io";
import messageRoutes from "./routes/message.js";

const app = express();
const server = http.createServer(app);

const io = new Server(server, { cors: { origin: "*" } });

app.use("/messages", messageRoutes);

import "./socket/handler.js";

server.listen(4005, () => {
    console.log("chat server running on 4005");
});

export { io };
`,
        "src/socket/handler.js": `import { io } from "../server.js";

export function registerHandlers() {
    io.on("connection", (socket) => {
        socket.on("join:room", (room) => socket.join(room));
        socket.on("typing", ({ room, user }) => {
            socket.to(room).emit("typing", { user });
        });
    });
}

registerHandlers();
`,
        "src/controllers/messageController.js": `import Message from "../models/Message.js";

export const listMessages = async (req, res) => {
    res.json(await Message.find().sort({ createdAt: 1 }));
};
`,
        "src/controllers/roomController.js": `import Room from "../models/Room.js";

export const createRoom = async (req, res) => {
    res.status(201).json(await Room.create(req.body));
};
`,
        "src/models/Message.js": `import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    room: { type: mongoose.Types.ObjectId, ref: "Room" },
    author: { type: mongoose.Types.ObjectId, ref: "User" },
    body: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Message", messageSchema);
`,
        "src/models/Room.js": `import mongoose from "mongoose";

const roomSchema = new mongoose.Schema({
    name: { type: String, required: true },
    members: [{ type: mongoose.Types.ObjectId, ref: "User" }]
});

export default mongoose.model("Room", roomSchema);
`
    });
    await initialCommit(chatServer, daniel, "Chat server init");

    await writeTree(fileStorage, {
        "README.md": `# File Storage

Distributed file storage service in Go.

## Design

- Local disk backend by default
- S3 backend via env flag
`,
        "go.mod": `module github.com/danielchen/file-storage

go 1.21

require github.com/aws/aws-sdk-go v1.50.0
`,
        "cmd/storage/main.go": `package main

import (
    "log"
    "net/http"
    "os"

    "github.com/danielchen/file-storage/internal/store"
)

func main() {
    backend := store.NewLocal(os.Getenv("DATA_DIR"))
    mux := http.NewServeMux()

    mux.HandleFunc("/upload", backend.Upload)
    mux.HandleFunc("/download/", backend.Download)

    log.Println("storage listening on :8090")
    log.Fatal(http.ListenAndServe(":8090", mux))
}
`,
        "internal/store/local.go": `package store

import (
    "io"
    "net/http"
    "os"
    "path/filepath"
)

type Local struct {
    dir string
}

func NewLocal(dir string) *Local {
    return &Local{dir: dir}
}

func (l *Local) Upload(w http.ResponseWriter, r *http.Request) {
    file, _, err := r.FormFile("file")
    if err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    defer file.Close()

    out, err := os.Create(filepath.Join(l.dir, r.FormValue("name")))
    if err != nil {
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    defer out.Close()

    io.Copy(out, file)
    w.WriteHeader(http.StatusCreated)
}
`,
        "internal/store/s3.go": `package store

import "github.com/aws/aws-sdk-go/aws"

type S3 struct {
    bucket string
}

func NewS3(bucket string) *S3 {
    return &S3{bucket: bucket}
}

var _ = aws.String // referenced in production build
`,
        "Dockerfile": `FROM golang:1.21-alpine AS build
WORKDIR /app
COPY go.mod .
RUN go mod download
COPY . .
RUN go build -o /storage ./cmd/storage

FROM alpine:3.19
COPY --from=build /storage /usr/local/bin/storage
VOLUME ["/data"]
CMD ["storage"]
`
    });
    await initialCommit(fileStorage, daniel, "File storage init");

    await writeTree(urlShortener, {
        "README.md": `# URL Shortener

Private URL shortening service with analytics.
`,
        "package.json": `{
  "name": "url-shortener",
  "version": "0.1.0",
  "dependencies": { "express": "^4.18.2", "mongoose": "^7.5.0" }
}
`,
        "src/app.js": `import express from "express";
import urls from "./routes/urls.js";

export const app = express();
app.use(express.json());
app.use("/", urls);
`,
        "src/db.js": `import mongoose from "mongoose";

export const connect = () => mongoose.connect(process.env.MONGO_URI);
`,
        "src/models/Url.js": `import mongoose from "mongoose";

const urlSchema = new mongoose.Schema({
    slug: { type: String, unique: true },
    destination: { type: String, required: true },
    clicks: { type: Number, default: 0 },
    expiresAt: Date
});

export default mongoose.model("Url", urlSchema);
`
    });
    await initialCommit(urlShortener, daniel, "URL shortener init");

    await writeTree(ecommerceApi, {
        "README.md": `# E-commerce API

Products, cart, and orders REST API.

\`\`\`bash
npm install
node scripts/seed.js
npm run dev
\`\`\`
`,
        "package.json": `{
  "name": "ecommerce-api",
  "version": "1.0.0",
  "main": "src/app.js",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0"
  }
}
`,
        ".env.example": `PORT=4010
MONGO_URI=mongodb://localhost:27017/ecommerce
JWT_SECRET=change-me
`,
        "src/app.js": `import express from "express";
import productRoutes from "./routes/productRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

const app = express();

app.use(express.json());
app.use("/products", productRoutes);
app.use("/orders", orderRoutes);
app.use("/cart", cartRoutes);

export default app;
`,
        "src/models/Product.js": `import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    sku: { type: String, unique: true },
    price: { type: Number, required: true },
    stock: { type: Number, default: 0 },
    categories: [String]
}, { timestamps: true });

export default mongoose.model("Product", productSchema);
`,
        "src/models/Order.js": `import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
    customer: { type: mongoose.Types.ObjectId, ref: "User" },
    items: [
        {
            product: { type: mongoose.Types.ObjectId, ref: "Product" },
            qty: Number,
            price: Number
        }
    ],
    status: {
        type: String,
        enum: ["pending", "paid", "shipped", "delivered"],
        default: "pending"
    }
}, { timestamps: true });

export default mongoose.model("Order", orderSchema);
`,
        "src/routes/productRoutes.js": `import { Router } from "express";
import Product from "../models/Product.js";

const router = Router();

router.get("/", async (req, res) => {
    res.json(await Product.find({}));
});

router.post("/", async (req, res) => {
    res.status(201).json(await Product.create(req.body));
});

export default router;
`,
        "src/routes/orderRoutes.js": `import { Router } from "express";
import Order from "../models/Order.js";

const router = Router();

router.get("/history", async (req, res) => {
    res.json(await Order.find({ customer: req.user.id }));
});

export default router;
`,
        "src/routes/cartRoutes.js": `import { Router } from "express";

const router = Router();

const carts = new Map();

router.get("/", (req, res) => {
    res.json({ items: carts.get(req.user.id) || [] });
});

export default router;
`,
        "scripts/seed.js": `import mongoose from "mongoose";
import Product from "../src/models/Product.js";

await mongoose.connect("mongodb://localhost:27017/ecommerce");

await Product.insertMany([
    { name: "Wireless Mouse", sku: "WM-001", price: 29.99, stock: 40 },
    { name: "Mechanical Keyboard", sku: "MK-002", price: 89.0, stock: 15 }
]);

await mongoose.disconnect();
console.log("seeded products");
`
    });
    await initialCommit(ecommerceApi, emma, "E-commerce API init");

    await writeTree(blogPlatform, {
        "README.md": `# Blog Platform

Markdown blog platform with comments and tags.

\`\`\`bash
npm run dev
\`\`\`
`,
        "package.json": `{
  "name": "blog-platform",
  "version": "1.0.0",
  "main": "src/app.js",
  "type": "module",
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.5.0",
    "ejs": "^3.1.9"
  }
}
`,
        "src/app.js": `import express from "express";
import postRoutes from "./controllers/postController.js";

const app = express();

app.set("view engine", "ejs");
app.use(express.static("public"));
app.use("/posts", postRoutes);

export default app;
`,
        "src/controllers/postController.js": `import { Router } from "express";
import Post from "../models/Post.js";

const router = Router();

router.get("/", async (req, res) => {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.render("index", { posts });
});

export default router;
`,
        "src/controllers/commentController.js": `import Comment from "../models/Comment.js";

export const addComment = async (req, res) => {
    res.status(201).json(await Comment.create(req.body));
};
`,
        "src/models/Post.js": `import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    body: { type: String, required: true },
    tags: [String]
}, { timestamps: true });

export default mongoose.model("Post", postSchema);
`,
        "src/models/Comment.js": `import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
    post: { type: mongoose.Types.ObjectId, ref: "Post" },
    author: { type: mongoose.Types.ObjectId, ref: "User" },
    body: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model("Comment", commentSchema);
`,
        "views/index.ejs": `<!DOCTYPE html>
<html>
<head><title>Blog</title><link rel="stylesheet" href="/css/style.css" /></head>
<body>
  <h1>Posts</h1>
  <ul>
    <% posts.forEach((post) => { %>
      <li><a href="/posts/<%= post.slug %>"><%= post.title %></a></li>
    <% }) %>
  </ul>
</body>
</html>
`,
        "public/css/style.css": `body {
    font-family: Georgia, serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 2rem;
}
`
    });
    await initialCommit(blogPlatform, emma, "Blog platform init");

    /* ========================= COLLABORATORS ========================== */
    log("=== collaborators ===");

    /* task-manager: sanjeev developer, priya reporter */
    await addUserToRepo(taskManager, sanjeev, "developer", alex);
    await addUserToRepo(taskManager, priya, "reporter", alex);

    /* commithub: alex developer */
    await addUserToRepo(commithub, alex, "developer", sanjeev);

    /* weather-api: priya read_only */
    await addUserToRepo(weatherApi, priya, "read_only", alex);

    /* ml-playground: daniel maintainer */
    await addUserToRepo(mlPlayground, daniel, "maintainer", priya);

    /* chat-server: emma developer */
    await addUserToRepo(chatServer, emma, "developer", daniel);

    /* recipe-api: alex read_only */
    await addUserToRepo(recipeApi, alex, "read_only", priya);

    /* ======================== ORGANIZATIONS =========================== */
    log("=== organizations ===");

    const openSourceLabs = await createOrg(
        "OpenSource Labs",
        "opensource-labs",
        "Building open source tools for developers.",
        sanjeev
    );
    const devForge = await createOrg(
        "DevForge",
        "devforge",
        "We forge developer tools that scale.",
        daniel
    );

    await addOrgMember(openSourceLabs, alex, "ADMIN");
    await addOrgMember(openSourceLabs, priya, "MEMBER");
    await addOrgMember(devForge, emma, "ADMIN");

    const frontendTeam = await createTeam(
        openSourceLabs,
        "Frontend Guild",
        "React and UI engineers",
        sanjeev
    );
    const backendTeam = await createTeam(
        openSourceLabs,
        "Backend Guild",
        "API and platform engineers",
        alex
    );
    const devopsTeam = await createTeam(
        devForge,
        "DevOps",
        "CI/CD and infrastructure",
        daniel
    );

    await addTeamMember(frontendTeam, sanjeev);
    await addTeamMember(frontendTeam, priya);
    await addTeamMember(backendTeam, alex);
    await addTeamMember(backendTeam, sanjeev);
    await addTeamMember(devopsTeam, daniel);
    await addTeamMember(devopsTeam, emma);

    /* ============================= ISSUES ============================= */
    log("=== issues ===");

    await createIssue(
        taskManager, alex,
        "Fix authentication redirect",
        "After login, users are sometimes redirected to the dashboard instead of the intended page. Investigate the redirect handling in the auth service.",
        "open", "bug"
    );
    await createIssue(
        taskManager, sanjeev,
        "Add project kanban board",
        "It would be helpful to visualize task status with a kanban board per project.",
        "open", "enhancement"
    );
    await createIssue(
        taskManager, alex,
        "Handle invalid task IDs gracefully",
        "Updating a task with a malformed ID returns a 500. It should return a 400.",
        "closed", "bug"
    );
    await createIssue(
        weatherApi, priya,
        "Add support for metric units",
        "Forecast endpoint should accept units=metric to convert temperatures.",
        "open", "enhancement"
    );
    await createIssue(
        weatherApi, alex,
        "Improve rate limiting",
        "Add a sliding-window rate limit to the forecast endpoint.",
        "closed", "enhancement"
    );
    await createIssue(
        commithub, priya,
        "Improve mobile navigation",
        "Sidebar overlaps the search bar on screens smaller than 768px.",
        "open", "bug"
    );
    await createIssue(
        commithub, alex,
        "Handle invalid repository IDs",
        "Visiting /repo/not-an-id shows the error page inconsistently.",
        "closed", "bug"
    );
    await createIssue(
        mlPlayground, daniel,
        "Add data preprocessing notebook",
        "We should add an example notebook showing standard preprocessing steps.",
        "open", "enhancement"
    );
    await createIssue(
        mlPlayground, priya,
        "Fix model serialization",
        "joblib fails when saving models with custom transformers.",
        "closed", "bug"
    );
    await createIssue(
        chatServer, emma,
        "Add typing indicators",
        "Typing events should debounce and expire after a few seconds.",
        "open", "enhancement"
    );
    await createIssue(
        chatServer, daniel,
        "Fix reconnection backoff",
        "Socket reconnection uses a fixed delay that floods the server on outages.",
        "open", "bug", emma
    );
    await createIssue(
        ecommerceApi, emma,
        "Add pagination to product list",
        "Product listing needs cursor-based pagination.",
        "open", "enhancement"
    );
    await createIssue(
        ecommerceApi, daniel,
        "Fix cart race condition",
        "Adding items concurrently can drop entries from the cart.",
        "closed", "bug", emma
    );

    /* a couple of issues with the label variety */
    await createIssue(
        commithub, sanjeev,
        "Document the repository storage layout",
        "Explain the repo-storage directory layout in the developer docs.",
        "open", "documentation"
    );
    await createIssue(
        recipeApi, alex,
        "Tag dishes with dietary restrictions",
        "Support vegan, vegetarian, gluten-free tags.",
        "open", "good first issue", priya
    );

    /* ========================= PULL REQUESTS ========================== */
    log("=== pull requests ===");

    await createPr(
        taskManager, alex, 1,
        "Add dark mode support",
        "Adds a theme toggle persisted in localStorage.",
        "open", "feature/dark-mode", "main"
    );
    await createPr(
        taskManager, alex, 2,
        "Fix redirect loop on expired sessions",
        "Expired sessions now redirect correctly to login once.",
        "closed", "fix/redirect-loop", "main"
    );
    await createPr(
        taskManager, sanjeev, 3,
        "Improve task filtering",
        "Filter tasks by status and assignee from query params.",
        "merged", "feature/task-filters", "main", alex
    );
    await createPr(
        weatherApi, alex, 1,
        "Add metric units endpoint",
        "Adds GET /weather/current with units query parameter.",
        "open", "feature/metric-units", "main"
    );
    await createPr(
        weatherApi, alex, 2,
        "Cache forecast responses",
        "Adds an in-memory TTL cache for forecast lookups.",
        "merged", "perf/forecast-cache", "main", alex
    );
    await createPr(
        commithub, alex, 1,
        "Add repository search",
        "Global search endpoint returning users, repositories, and organizations.",
        "merged", "feature/global-search", "development", sanjeev
    );
    await createPr(
        mlPlayground, daniel, 1,
        "Add preprocessing pipeline",
        "Introduces a reusable preprocessing module for tabular datasets.",
        "open", "feature/preprocessing", "experiments", priya
    );
    await createPr(
        chatServer, emma, 1,
        "Add typing indicator events",
        "Implements debounced typing events with expiry.",
        "open", "feature/typing", "main"
    );
    await createPr(
        ecommerceApi, emma, 1,
        "Fix cart race condition",
        "Uses atomic operations when updating cart items.",
        "merged", "fix/cart-race", "main", emma
    );
    await createPr(
        ecommerceApi, daniel, 2,
        "Add order history endpoint",
        "Adds GET /orders/history for the current user.",
        "open", "feature/order-history", "dev"
    );

    /* ============================ STARS =============================== */
    log("=== stars ===");

    await addStar(alex, commithub);
    await addStar(alex, commithubFrontend);
    await addStar(sanjeev, taskManager);
    await addStar(sanjeev, weatherApi);
    await addStar(priya, taskManager);
    await addStar(priya, commithubFrontend);
    await addStar(daniel, ecommerceApi);
    await addStar(emma, chatServer);
    await addStar(emma, taskManager);
    await addStar(daniel, blogPlatform);
    await addStar(priya, chatServer);

    /* ============================ FOLLOWS ============================= */
    log("=== follows ===");

    await addFollow(sanjeev, alex);
    await addFollow(sanjeev, priya);
    await addFollow(alex, sanjeev);
    await addFollow(alex, emma);
    await addFollow(priya, sanjeev);
    await addFollow(priya, alex);
    await addFollow(priya, daniel);
    await addFollow(daniel, priya);
    await addFollow(daniel, emma);
    await addFollow(emma, alex);
    await addFollow(emma, daniel);

    /* ====================== NOTIFICATIONS ============================= */
    log("=== notifications ===");

    /* notifications for sanjeev */
    await createNotification({
        recipient: sanjeev._id,
        actor: alex._id,
        type: "PR_MERGED",
        repository: commithub._id,
        pullRequest: (await PullRequest.findOne({ repository: commithub._id, title: "Add repository search" }))._id,
        message: 'merged your pull request: "Add repository search" (#1)'
    });
    await createNotification({
        recipient: sanjeev._id,
        actor: priya._id,
        type: "ISSUE_CREATED",
        repository: commithub._id,
        issue: (await Issue.findOne({ repository: commithub._id, title: "Improve mobile navigation" }))._id,
        message: 'opened an issue in your repository: "Improve mobile navigation"'
    });

    /* notifications for alex */
    await createNotification({
        recipient: alex._id,
        actor: sanjeev._id,
        type: "PR_CREATED",
        repository: taskManager._id,
        pullRequest: (await PullRequest.findOne({ repository: taskManager._id, title: "Improve task filtering" }))._id,
        message: 'opened a pull request in your repository: "Improve task filtering" (#3)'
    });
    await createNotification({
        recipient: alex._id,
        actor: sanjeev._id,
        type: "ISSUE_CREATED",
        repository: taskManager._id,
        issue: (await Issue.findOne({ repository: taskManager._id, title: "Add project kanban board" }))._id,
        message: 'opened an issue in your repository: "Add project kanban board"'
    });
    await createNotification({
        recipient: alex._id,
        actor: priya._id,
        type: "ISSUE_CREATED",
        repository: weatherApi._id,
        issue: (await Issue.findOne({ repository: weatherApi._id, title: "Add support for metric units" }))._id,
        message: 'opened an issue in your repository: "Add support for metric units"'
    });

    /* notifications for emma from daniel */
    await createNotification({
        recipient: emma._id,
        actor: daniel._id,
        type: "ISSUE_CREATED",
        repository: chatServer._id,
        issue: (await Issue.findOne({ repository: chatServer._id, title: "Fix reconnection backoff" }))._id,
        message: 'opened an issue in your repository: "Fix reconnection backoff"'
    });

    /* ====================== ACTIVITY RECORDS ========================== */
    log("=== activity records ===");

    await createActivity({
        actor: alex._id,
        type: "REPOSITORY_CREATED",
        repository: taskManager._id
    });
    await createActivity({
        actor: priya._id,
        type: "REPOSITORY_CREATED",
        repository: mlPlayground._id
    });
    await createActivity({
        actor: daniel._id,
        type: "REPOSITORY_CREATED",
        repository: chatServer._id
    });
    await createActivity({
        actor: emma._id,
        type: "REPOSITORY_CREATED",
        repository: ecommerceApi._id
    });
    await createActivity({
        actor: alex._id,
        type: "REPOSITORY_FORKED",
        repository: commithub._id
    });

    log("");
    log("=== DONE ===");
    log(`Users:              ${await User.countDocuments()}`);
    log(`Repositories:       ${await Repository.countDocuments()}`);
    log(`Issues:             ${await Issue.countDocuments()}`);
    log(`Pull requests:      ${await PullRequest.countDocuments()}`);
    log(`Collaborators:      ${await Collaborator.countDocuments()}`);
    log(`Organizations:      ${await Organization.countDocuments()}`);
    log(`Teams:              ${await Team.countDocuments()}`);
    log(`Team memberships:   ${await TeamMembership.countDocuments()}`);
    log(`Notifications:      ${await Notification.countDocuments()}`);

    await mongoose.disconnect();
    process.exit(0);
};

seed().catch((error) => {
    console.error("seed failed:", error);
    process.exit(1);
});