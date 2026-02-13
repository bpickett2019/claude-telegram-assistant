---
name: github
description: "Interact with GitHub repositories, pull requests, and issues using gh CLI"
metadata:
  openclaw:
    emoji: "🐙"
    requires:
      bins: ["gh"]
    install:
      - id: brew
        kind: brew
        formula: gh
        bins: [gh]
        label: "Homebrew (macOS/Linux)"
      - id: apt
        kind: apt
        package: gh
        bins: [gh]
        label: "APT (Debian/Ubuntu)"
---

# GitHub Skill

Control GitHub directly from Telegram using the `gh` CLI. Manage repositories, pull requests, issues, and more.

## Prerequisites

This skill requires the GitHub CLI (`gh`) to be installed and authenticated:

```bash
# Install gh CLI
brew install gh  # macOS
# or
sudo apt install gh  # Ubuntu/Debian

# Authenticate
gh auth login
```

## Pull Requests

### List Pull Requests
```bash
# List PRs for current repo
gh pr list

# List PRs for specific repo
gh pr list --repo owner/repo

# Filter by state
gh pr list --state open
gh pr list --state closed
gh pr list --state merged
```

### View Pull Request Details
```bash
# View PR in terminal
gh pr view 123

# View PR in browser
gh pr view 123 --web

# Get PR as JSON
gh pr view 123 --json title,body,author,state
```

### Create Pull Request
```bash
# Create PR interactively
gh pr create

# Create PR with title and body
gh pr create --title "Fix bug" --body "Description of changes"

# Create draft PR
gh pr create --draft --title "WIP: New feature"
```

### Checkout and Review PRs
```bash
# Checkout PR locally
gh pr checkout 123

# View PR diff
gh pr diff 123

# Add review comment
gh pr review 123 --comment --body "Looks good!"

# Approve PR
gh pr review 123 --approve

# Request changes
gh pr review 123 --request-changes --body "Please fix..."
```

### Merge Pull Requests
```bash
# Merge PR
gh pr merge 123

# Merge with squash
gh pr merge 123 --squash

# Merge and delete branch
gh pr merge 123 --delete-branch

# Merge with custom commit message
gh pr merge 123 --squash --body "Custom merge message"
```

## Issues

### List Issues
```bash
# List issues for current repo
gh issue list

# List issues for specific repo
gh issue list --repo owner/repo

# Filter by state/assignee/label
gh issue list --state open
gh issue list --assignee @me
gh issue list --label bug
```

### View Issue Details
```bash
# View issue
gh issue view 456

# View in browser
gh issue view 456 --web

# Get as JSON
gh issue view 456 --json title,body,author,labels,state
```

### Create Issue
```bash
# Create issue interactively
gh issue create

# Create with title and body
gh issue create --title "Bug report" --body "Description"

# Create with labels
gh issue create --title "Feature request" --label enhancement
```

### Manage Issues
```bash
# Close issue
gh issue close 456

# Reopen issue
gh issue reopen 456

# Add comment
gh issue comment 456 --body "Update: still working on this"

# Edit issue
gh issue edit 456 --add-label "priority:high"
```

## Repositories

### Clone Repository
```bash
# Clone repo
gh repo clone owner/repo

# Clone to specific directory
gh repo clone owner/repo /path/to/dir
```

### View Repository
```bash
# View repo in browser
gh repo view owner/repo --web

# Get repo info as JSON
gh repo view owner/repo --json name,description,stargazerCount,forkCount
```

### Create Repository
```bash
# Create new repo
gh repo create my-new-repo --public

# Create from current directory
gh repo create --source . --public

# Create with description
gh repo create my-repo --description "My awesome project" --public
```

### Fork Repository
```bash
# Fork repo
gh repo fork owner/repo

# Fork and clone
gh repo fork owner/repo --clone
```

### Search Repositories
```bash
# Search for repos
gh search repos "machine learning" --language python --limit 10

# Search within organization
gh search repos "API" --owner myorg
```

## Workflow Runs

### List Workflows
```bash
# List workflow runs
gh run list

# List runs for specific workflow
gh run list --workflow ci.yml

# Filter by status
gh run list --status failure
```

### View Workflow Run
```bash
# View run details
gh run view 12345

# View run logs
gh run view 12345 --log

# Download artifacts
gh run download 12345
```

### Rerun Workflows
```bash
# Rerun failed jobs
gh run rerun 12345 --failed

# Rerun entire workflow
gh run rerun 12345
```

## Gists

### Create Gist
```bash
# Create gist from file
gh gist create myfile.txt

# Create public gist
gh gist create --public myfile.txt

# Create with description
gh gist create --desc "Useful script" script.sh
```

### List and View Gists
```bash
# List your gists
gh gist list

# View gist
gh gist view abc123

# Clone gist
gh gist clone abc123
```

## API for Advanced Queries

For complex queries, use the GitHub GraphQL API:

```bash
# Custom GraphQL query
gh api graphql -f query='
  query {
    viewer {
      repositories(first: 10) {
        nodes {
          name
          stargazerCount
        }
      }
    }
  }
'

# REST API calls
gh api repos/owner/repo/contributors
gh api user/repos --jq '.[].name'
```

## Useful Patterns

### Check PR Status Before Merging
```bash
# Get PR checks status
gh pr view 123 --json statusCheckRollup --jq '.statusCheckRollup[] | select(.conclusion != "SUCCESS")'
```

### List Recent Activity
```bash
# Your recent PRs
gh search prs --author @me --sort updated --limit 5

# Recent issues assigned to you
gh search issues --assignee @me --sort updated --limit 5
```

### Batch Operations
```bash
# Close multiple issues
for issue in 1 2 3 4 5; do
  gh issue close $issue
done
```

## Tips

- Use `--json` flag with `--jq` for structured data extraction
- Use `--web` flag to open items in browser for visual inspection
- Set default repo with `gh repo set-default` to avoid typing `--repo` every time
- Use `gh alias` to create shortcuts for common commands
- Enable `gh` shell completion for faster workflows

## Environment Variables

Set these in `.env` if needed:

```bash
GH_TOKEN=ghp_xxxxxxxxxxxxx  # GitHub personal access token
GH_ENTERPRISE_TOKEN=xxx     # For GitHub Enterprise
```
