# Contributing to GuardAnt

First off, thank you for considering contributing to GuardAnt! It's people like you that make GuardAnt such a great tool. 🐜

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [How Can I Contribute?](#how-can-i-contribute)
4. [Development Process](#development-process)
5. [Style Guidelines](#style-guidelines)
6. [Commit Guidelines](#commit-guidelines)
7. [Pull Request Process](#pull-request-process)
8. [Community](#community)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

### Our Standards

- **Be Respectful**: Treat everyone with respect. No harassment, discrimination, or offensive behavior.
- **Be Collaborative**: Work together effectively and considerately.
- **Be Professional**: Maintain professional conduct in all interactions.
- **Be Inclusive**: Welcome and support people of all backgrounds and identities.

## Getting Started

### Prerequisites

Before you begin, ensure you have:

- Bun 1.0+ or Node.js 18+
- Git
- A GitHub account
- Basic knowledge of TypeScript and React

### Setting Up Your Development Environment

1. **Fork the repository**
   ```bash
   # Visit https://github.com/your-org/guardant
   # Click "Fork" button
   ```

2. **Clone your fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/guardant.git
   cd guardant
   ```

3. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/your-org/guardant.git
   ```

4. **Install dependencies**
   ```bash
   bun install
   ```

5. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

6. **Start development servers**
   ```bash
   ./dev-start.sh
   ```

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

#### How to Submit a Good Bug Report

Create an issue using the bug report template with:

- **Clear title**: Summarize the issue
- **Detailed description**: What went wrong?
- **Steps to reproduce**: How can we recreate the issue?
- **Expected behavior**: What should happen?
- **Actual behavior**: What actually happens?
- **Screenshots**: If applicable
- **Environment details**: OS, browser, versions

Example:
```markdown
**Title**: Service status not updating in real-time

**Description**: 
When a service goes down, the status page doesn't update until manual refresh.

**Steps to reproduce**:
1. Create a service monitoring https://example.com
2. Take the service offline
3. Wait for next check interval
4. Observe status page

**Expected**: Status changes to "down" automatically
**Actual**: Status remains "up" until page refresh

**Environment**: 
- OS: macOS 13.0
- Browser: Chrome 118
- GuardAnt version: 1.0.0
```

### Suggesting Enhancements

#### Before Submitting an Enhancement

- Check if it's already suggested
- Consider if it fits the project scope
- Think about backward compatibility

#### How to Submit an Enhancement Suggestion

Create an issue using the feature request template with:

- **Use case**: Why is this needed?
- **Proposed solution**: How should it work?
- **Alternatives**: Other ways to solve it?
- **Additional context**: Mockups, examples, etc.

### Your First Code Contribution

#### Good First Issues

Look for issues labeled:
- `good first issue` - Simple fixes perfect for beginners
- `help wanted` - We need help with these
- `documentation` - Documentation improvements

#### Areas to Contribute

1. **Bug Fixes**: Fix reported issues
2. **Features**: Implement requested features
3. **Documentation**: Improve docs, add examples
4. **Tests**: Increase test coverage
5. **Performance**: Optimize slow code
6. **Accessibility**: Improve a11y
7. **Translations**: Add language support

## Development Process

### 1. Find or Create an Issue

```bash
# Check existing issues
# https://github.com/your-org/guardant/issues

# If none exists, create one describing what you want to work on
```

### 2. Create a Feature Branch

```bash
# Update your fork
git checkout main
git pull upstream main
git push origin main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 3. Make Your Changes

Follow our coding standards and make your changes:

```bash
# Make changes
vim src/...

# Run tests
bun test

# Check types
bun run typecheck

# Lint code
bun run lint
```

### 4. Write/Update Tests

```typescript
// Example test
describe('ServiceMonitor', () => {
  it('should detect service downtime', async () => {
    const monitor = new ServiceMonitor();
    const result = await monitor.check({
      url: 'https://offline.example.com',
      timeout: 5000
    });
    
    expect(result.status).toBe('down');
    expect(result.error).toBeDefined();
  });
});
```

### 5. Update Documentation

If your change affects:
- API endpoints - update `docs/API.md`
- Configuration - update `README.md`
- Architecture - update `docs/ARCHITECTURE.md`

### 6. Commit Your Changes

See [Commit Guidelines](#commit-guidelines) below.

### 7. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Style Guidelines

### TypeScript Style Guide

```typescript
// ✅ Good: Explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<UserData> {
  // Implementation
}

// ❌ Bad: Implicit any
async function getUser(id) {
  // Implementation
}

// ✅ Good: Error handling
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error });
  return { success: false, error: error.message };
}

// ❌ Bad: Unhandled errors
const result = await riskyOperation();
return result;
```

### React Style Guide

```tsx
// ✅ Good: Functional components with TypeScript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant}`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

// ❌ Bad: Untyped props
export function Button(props) {
  return <button onClick={props.onClick}>{props.label}</button>;
}
```

### CSS/Tailwind Guidelines

```tsx
// ✅ Good: Tailwind utility classes
<div className="flex items-center justify-between p-4 bg-white rounded-lg shadow">

// ✅ Good: Component variants with clsx
import clsx from 'clsx';

<div className={clsx(
  'rounded-lg p-4',
  variant === 'success' && 'bg-green-100 text-green-800',
  variant === 'error' && 'bg-red-100 text-red-800'
)}>

// ❌ Bad: Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

### File Organization

```
/src
  /components
    /Button
      Button.tsx        # Component
      Button.test.tsx   # Tests
      Button.stories.tsx # Storybook
      index.ts          # Export
  /hooks
    useAuth.ts         # Custom hooks
  /utils
    validation.ts      # Utilities
  /types
    index.ts           # TypeScript types
```

## Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/).

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(monitoring): add TCP port monitoring support"

# Bug fix
git commit -m "fix(auth): resolve JWT token expiration issue"

# Documentation
git commit -m "docs(api): update webhook endpoint documentation"

# With body
git commit -m "feat(alerts): implement email notifications

- Add email service integration
- Create notification templates
- Add user preferences for notifications

Closes #123"
```

### Commit Rules

1. Use present tense ("add feature" not "added feature")
2. Use imperative mood ("move cursor" not "moves cursor")
3. Limit first line to 72 characters
4. Reference issues and PRs in the body
5. Be descriptive but concise

## Pull Request Process

### Before Submitting a PR

- [ ] All tests pass (`bun test`)
- [ ] Code is linted (`bun run lint`)
- [ ] Types check (`bun run typecheck`)
- [ ] Documentation is updated
- [ ] Commit messages follow guidelines
- [ ] Branch is up to date with main

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented complex code
- [ ] I have updated documentation
- [ ] My changes generate no warnings
- [ ] I have added tests for my changes
- [ ] All tests pass locally

## Related Issues
Closes #(issue number)

## Screenshots (if applicable)
```

### PR Review Process

1. **Automated Checks**: CI/CD runs tests, linting, and type checking
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Reviewer tests the changes locally
4. **Feedback**: Address any requested changes
5. **Approval**: Once approved, PR can be merged
6. **Merge**: Maintainer merges using "Squash and merge"

### What Reviewers Look For

- **Correctness**: Does it solve the problem?
- **Tests**: Are there adequate tests?
- **Performance**: No performance regressions?
- **Security**: No security vulnerabilities?
- **Style**: Follows coding standards?
- **Documentation**: Is it documented?

## Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/guardant)
- **GitHub Discussions**: Ask questions in [Discussions](https://github.com/your-org/guardant/discussions)
- **Stack Overflow**: Tag questions with `guardant`

### Ways to Contribute Beyond Code

- **Answer questions**: Help others in Discord or GitHub Discussions
- **Write tutorials**: Create blog posts or video tutorials
- **Improve documentation**: Fix typos, add examples
- **Share feedback**: Tell us what works and what doesn't
- **Spread the word**: Star the repo, share on social media

### Recognition

We believe in recognizing contributors:

- **Contributors Page**: All contributors are listed
- **Release Notes**: Contributors are mentioned
- **Special Badges**: Active contributors get special Discord roles
- **Swag**: Top contributors receive GuardAnt swag

## Development Tips

### Useful Commands

```bash
# Run specific test
bun test src/services/monitor.test.ts

# Run tests in watch mode
bun test --watch

# Check bundle size
bun run analyze

# Generate types from schema
bun run generate:types

# Format code
bun run format

# Check for security vulnerabilities
bun audit
```

### Debugging

```typescript
// Use debug logging
import { logger } from '@/shared/logger';

logger.debug('Debugging info', {
  variable: someVariable,
  state: currentState
});

// Browser debugging
console.group('Component State');
console.log('Props:', props);
console.log('State:', state);
console.groupEnd();
```

### Performance Tips

1. **Profile before optimizing**: Use Chrome DevTools
2. **Memoize expensive operations**: Use `useMemo` and `React.memo`
3. **Lazy load components**: Use `React.lazy` for code splitting
4. **Optimize images**: Use WebP format and proper sizing

## Thank You!

Thank you for contributing to GuardAnt! Your efforts help make monitoring better for everyone. 🙏

If you have any questions, don't hesitate to ask in our Discord or create a discussion on GitHub.

Happy coding! 🐜