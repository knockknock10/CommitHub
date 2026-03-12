# CommitHub

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![AWS S3](https://img.shields.io/badge/AWS_S3-569A31?style=flat&logo=amazons3&logoColor=white)](https://aws.amazon.com/s3/)

Most developers use `git` every day without really knowing what happens inside the `.git` folder.  
I built **CommitHub** to explore and understand the internal mechanics behind version control systems such as snapshots, staging areas, and branching logic.

CommitHub is a lightweight **CLI-based version control tool** that recreates some of the core functionality of Git.  
It also includes a **remote synchronization feature using AWS S3**, allowing commits to be pushed and pulled similar to a remote repository.

---

## Why I Built This

* **The Challenge:** How can a system track file changes across time without storing unnecessary duplicate data?
* **The Idea:** Build a simplified version control system from scratch and understand how commits, branches, and repository history are managed internally.
* **The Approach:** Implement a snapshot-based architecture where each commit represents the state of the project at a given moment.
* **Remote Storage:** Integrate **AWS S3** to simulate a remote repository similar to how Git interacts with services like GitHub.

---

## System Architecture

The core logic revolves around the hidden `.CommitHub` directory, which manages the repository state.

* **Staging Area**  
  Files are first added to a temporary index before being included in the next commit.

* **Commit Objects**  
  Each commit stores metadata (message, timestamp, etc.) along with the snapshot of tracked files.

* **Branching Model**  
  Branches work as pointers to commit IDs. Switching branches updates the `HEAD` pointer and restores the working directory to that commit's state.

```text
.CommitHub/
├── HEAD                # Points to the current active branch
├── branches/           # Stores latest commit ID for each branch
├── commits/            # Snapshot database
│   └── <commit-id>/
│       ├── commit.json # Commit metadata (message, time)
│       └── data/       # Snapshot of tracked files
└── staging/            # Temporary index before committing
```
Getting Started
Prerequisites

Node.js (v16 or higher)

AWS credentials configured (for remote features)
### Installation

```text
git clone https://github.com/your-username/commithub.git
cd commithub
npm install
```
### Basic Workflow
```text
# Initialize a repository
node index.js init

# Stage a file
node index.js add file.txt

# Create a commit
node index.js commit -m "Fixed the login logic"

# Create a branch
node index.js branch feature-ui

# Switch to that branch
node index.js checkout feature-ui
```
***Remote Sync (AWS S3)***

CommitHub uses the AWS SDK to treat an S3 bucket as a remote repository.
**Push**
Uploads the local .CommitHub state to the configured S3 bucket.
**Pull**
Downloads the remote state and updates the local repository accordingly.
This simulates a simplified GitHub-style push and pull workflow.

***Tech Stack***
Runtime: Node.js

CLI Framework: yargs

Cloud Storage: AWS S3

Core Logic: Node.js fs module for repository state management

# Author :- Kr Sanjeev
