## Branch Protection Setup

After this commit is merged to `main`, configure the following branch protection rules on GitHub:

### Steps:
1. Go to: **Settings** → **Branches** → **Branch protection rules** → **Add rule**
2. Branch name pattern: `main`
3. Enable the following:

#### Required Settings:
- ✅ **Require a pull request before merging**
  - ✅ Require approvals: 1 (or more if you have multiple contributors)
  - ✅ Dismiss stale pull request approvals when new commits are pushed
  - ✅ Require review from Code Owners (optional, if you create a CODEOWNERS file)

- ✅ **Require status checks to pass before merging**
  - ✅ Require branches to be up to date before merging
  - Required checks:
    - `Test & Lint (20.x)`
    - `Test & Lint (22.x)`
    - `Build`

- ✅ **Require conversation resolution before merging**

- ✅ **Require linear history** (optional but recommended for clean git history)

- ✅ **Do not allow bypassing the above settings**
  - Uncheck "Allow administrators to bypass these settings" for strict enforcement

#### Optional but Recommended:
- ✅ **Require signed commits**
- ✅ **Include administrators** (if you want rules to apply to admins too)
- ✅ **Restrict who can push to matching branches** (set specific users/teams)

### After Setup:
- All changes to `main` must go through Pull Requests
- All tests must pass in CI before merging
- Code must be reviewed by at least one other person
- Direct commits to `main` will be blocked

### Creating Feature Branches:
```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: your feature description"

# Push to remote
git push origin feature/your-feature-name

# Create a PR on GitHub
# Wait for CI to pass and get approval
# Then merge via GitHub UI
```

### Naming Conventions:
- Feature branches: `feature/feature-name`
- Bug fixes: `fix/bug-description`
- Hotfixes: `hotfix/issue-description`
- Documentation: `docs/what-changed`
- Refactoring: `refactor/what-refactored`
- Tests: `test/what-tested`
