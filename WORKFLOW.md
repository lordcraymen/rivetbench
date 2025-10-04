# Development Workflow

This document describes the recommended workflow for contributing to this project to ensure clean branch management and avoid working on stale branches.

## Daily Workflow

### 1. Start Fresh Every Time

Before starting any new work, always start from a clean, up-to-date main branch:

```bash
# Switch to main branch
git checkout main

# Pull latest changes
git pull origin main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Branch Naming Convention

Use descriptive branch names with prefixes:

- `feature/` - For new features
- `fix/` - For bug fixes
- `refactor/` - For code refactoring
- `docs/` - For documentation changes
- `test/` - For test additions or modifications

**Examples:**
```bash
git checkout -b feature/add-user-authentication
git checkout -b fix/resolve-memory-leak
git checkout -b refactor/improve-error-handling
git checkout -b docs/update-api-documentation
```

### 3. Work on Your Feature

Make your changes, commit regularly with clear messages:

```bash
# Stage changes
git add .

# Commit with descriptive message
git commit -m "feat: add user authentication endpoint"

# Push to remote
git push origin feature/your-feature-name
```

### 4. Create a Pull Request

1. Push your branch to GitHub
2. Create a Pull Request from your branch to `main`
3. Wait for review and approval
4. Once approved and merged, the branch will be **automatically deleted**

### 5. After PR is Merged

**Important:** Never continue working on a branch after its PR is merged!

```bash
# Switch back to main
git checkout main

# Pull the latest changes (including your merged PR)
git pull origin main

# Your local merged branch will be automatically cleaned up
git fetch --prune

# For any remaining local branches, you can delete them manually
git branch -d feature/your-old-feature
```

## Automated Branch Cleanup

This repository has automated branch cleanup configured:

### Automatic Deletion on PR Merge

When a Pull Request is merged into `main`, GitHub Actions automatically:
- Detects the merged PR
- Deletes the source branch from the remote repository

### Manual Cleanup (If Needed)

If you need to manually clean up all merged branches:

1. Go to the "Actions" tab in GitHub
2. Select "Delete Merged Branches" workflow
3. Click "Run workflow"
4. This will delete all remote branches that are fully merged into main

## Best Practices

### ✅ Do's

- **Always start from main:** `git checkout main && git pull`
- **Create new branches for new work:** Each feature/fix gets its own branch
- **Use descriptive branch names:** Makes it easy to understand what's being worked on
- **Delete local branches after merge:** Keep your local repository clean
- **Keep branches short-lived:** Merge frequently to avoid conflicts

### ❌ Don'ts

- **Don't reuse old feature branches:** Always create a new branch for new work
- **Don't work directly on main:** All changes should go through PRs
- **Don't keep branches after merging:** They'll be deleted automatically anyway
- **Don't create generic branch names:** Use specific, descriptive names

## Quick Reference

```bash
# Start new work
git checkout main && git pull && git checkout -b feature/new-feature

# Save and push work
git add . && git commit -m "description" && git push origin feature/new-feature

# After PR is merged - clean up
git checkout main && git pull && git fetch --prune

# List local branches
git branch

# Delete a local branch
git branch -d branch-name

# Force delete a local branch (if not fully merged)
git branch -D branch-name

# List all branches (including remote)
git branch -a

# Clean up deleted remote branches
git fetch --prune
```

## Troubleshooting

### "I'm on an old branch that's already merged"

```bash
# Switch to main and update
git checkout main
git pull origin main

# Create a new branch for your new work
git checkout -b feature/new-work
```

### "I accidentally pushed to an old feature branch"

```bash
# Check what commits you made
git log origin/main..HEAD --oneline

# If the changes are important:
# 1. Create a new branch from current position
git checkout -b feature/new-branch-name

# 2. Switch main and pull
git checkout main
git pull

# 3. Rebase your new branch on main
git checkout feature/new-branch-name
git rebase main

# 4. Push the new branch
git push origin feature/new-branch-name
```

### "I want to see which branches are merged"

```bash
# Local branches merged into main
git branch --merged main

# Remote branches merged into main
git branch -r --merged origin/main

# Branches not yet merged
git branch --no-merged main
```

## Git Aliases (Optional)

Add these to your `~/.gitconfig` for faster workflow:

```ini
[alias]
    # Quick workflow commands
    fresh = "!f() { git checkout main && git pull && git checkout -b $1; }; f"
    cleanup = "!git fetch --prune && git branch --merged main | grep -v 'main' | xargs -r git branch -d"
    merged = branch --merged main
    unmerged = branch --no-merged main
    
    # Pretty log
    lg = log --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit
```

Usage after adding aliases:
```bash
# Start fresh with a new branch
git fresh feature/my-new-feature

# Clean up merged branches
git cleanup

# See pretty log
git lg
```

## Summary

The key principle: **Always start fresh from main, create a new branch for each piece of work, and never reuse merged branches.** This keeps your repository clean and prevents confusion about which branch contains which work.
