#!/bin/bash

# Setup Branch Protection Rules for GuardAnt
# This script uses GitHub CLI to configure branch protection rules

set -e

echo "Setting up branch protection rules for GuardAnt..."

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it first."
    echo "Visit: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "Error: Not authenticated with GitHub CLI. Please run 'gh auth login' first."
    exit 1
fi

REPO="m00npl/guardant"

# Configure main branch protection
echo "Configuring protection for 'main' branch..."
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/${REPO}/branches/main/protection \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "test", "build", "security"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF

# Configure develop branch protection
echo "Configuring protection for 'develop' branch..."
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -H "X-GitHub-Api-Version: 2022-11-28" \
  /repos/${REPO}/branches/develop/protection \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": false,
    "contexts": ["lint", "test"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismissal_restrictions": {},
    "dismiss_stale_reviews": false,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_conversation_resolution": false,
  "lock_branch": false,
  "allow_fork_syncing": true
}
EOF

echo "Branch protection rules configured successfully!"
echo ""
echo "Protected branches:"
echo "- main: Requires all checks to pass, 1 review, and dismisses stale reviews"
echo "- develop: Requires lint and test checks to pass, 1 review"
echo ""
echo "To view current protection rules:"
echo "gh api /repos/${REPO}/branches/main/protection"
echo "gh api /repos/${REPO}/branches/develop/protection"