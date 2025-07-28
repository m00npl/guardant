# GitHub Configuration

This directory contains GitHub-specific configuration files for the GuardAnt project.

## Contents

### Workflows (`/workflows`)
- **ci.yml**: Continuous Integration workflow that runs on every push and PR
  - Linting and TypeScript checking
  - Unit and integration tests
  - Security scanning
  - E2E tests
  - Preview deployments for PRs
  
- **cd.yml**: Continuous Deployment workflow
  - Builds and pushes Docker images to GitHub Container Registry
  - Deploys to staging on main branch pushes
  - Deploys to production on version tags
  - Publishes packages to NPM on releases

- **docs.yml**: Documentation deployment workflow
  - Builds and deploys documentation to GitHub Pages
  - Triggered on changes to docs/ or README.md

### Issue Templates (`/ISSUE_TEMPLATE`)
- **bug_report.md**: Template for bug reports
- **feature_request.md**: Template for feature requests
- **documentation.md**: Template for documentation issues
- **config.yml**: Issue template configuration

### Pull Request Template
- **pull_request_template.md**: Template for pull requests

### Scripts (`/scripts`)
- **setup-branch-protection.sh**: Script to configure branch protection rules

## Setup Instructions

### 1. Enable GitHub Actions
GitHub Actions should be enabled by default. If not:
1. Go to Settings → Actions → General
2. Select "Allow all actions and reusable workflows"
3. Click Save

### 2. Configure Secrets
Add these secrets in Settings → Secrets and variables → Actions:

Required:
- `CODECOV_TOKEN`: Get from https://codecov.io
- `SNYK_TOKEN`: Get from https://snyk.io
- `NPM_TOKEN`: Get from https://www.npmjs.com

Optional:
- `VERCEL_TOKEN`: For preview deployments
- `VERCEL_ORG_ID`: Your Vercel organization ID
- `VERCEL_PROJECT_ID`: Your Vercel project ID
- `SLACK_WEBHOOK`: For deployment notifications

### 3. Enable GitHub Pages
1. Go to Settings → Pages
2. Source: Deploy from a branch
3. Branch: gh-pages / (root)
4. Click Save

The docs workflow will create the gh-pages branch automatically on first run.

### 4. Configure Branch Protection
Run the setup script after creating the develop branch:

```bash
# Create develop branch if it doesn't exist
git checkout -b develop
git push -u origin develop

# Run protection setup
cd .github/scripts
./setup-branch-protection.sh
```

Or manually configure in Settings → Branches:

**Main branch:**
- Require pull request reviews (1 approval)
- Dismiss stale reviews
- Require status checks: lint, test, build, security
- Require branches to be up to date
- Require conversation resolution
- Do not allow force pushes
- Do not allow deletions

**Develop branch:**
- Require pull request reviews (1 approval)
- Require status checks: lint, test
- Do not allow force pushes
- Do not allow deletions

### 5. Create Environments
In Settings → Environments, create:

**staging**
- No protection rules
- URL: https://staging.guardant.me

**production**
- Required reviewers: Add yourself
- URL: https://guardant.me

## Workflow Status Badges

The README already includes status badges that will show workflow status once they run.

## Maintenance

### Updating Workflows
- Test workflow changes in a feature branch first
- Use the workflow_dispatch trigger for manual testing
- Check Actions tab for logs and debugging

### Security
- Regularly update action versions
- Review and rotate secrets periodically
- Enable Dependabot for automated updates

## Troubleshooting

### Workflows not running
- Check if Actions are enabled in repository settings
- Verify workflow file syntax
- Check branch protection rules

### Failed deployments
- Check secret configuration
- Verify environment URLs
- Review deployment logs in Actions tab

### Pages not updating
- Check if gh-pages branch exists
- Verify Pages is enabled in settings
- Check docs workflow logs

## Contact

For issues or questions: moon.pl.kr@gmail.com