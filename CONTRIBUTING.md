# Contributing to PuckHub

Thank you for considering contributing to PuckHub! We appreciate your interest in improving this ice hockey league management system.

## 📜 Contributor License Agreement

Before contributing, please read our [Contributor License Agreement (CLA)](CLA.md). By submitting a contribution, you agree to the terms outlined in the CLA.

**Key Points:**
- You retain ownership of your contributions
- You grant us permission to use your contributions under any license we choose
- This allows us to offer commercial licenses while keeping the base project source-available

## 🤝 Ways to Contribute

### 1. Report Bugs
- Use GitHub Issues to report bugs
- Include steps to reproduce
- Describe expected vs actual behavior
- Include your environment details (OS, Node version, browser)

### 2. Suggest Features
- Open a GitHub Issue with the "feature request" label
- Clearly describe the use case and benefits
- Be open to discussion about implementation

### 3. Submit Code
- Fork the repository
- Create a feature branch (`git checkout -b feature/amazing-feature`)
- Follow our code style and conventions
- Write clear commit messages
- Submit a pull request

### 4. Improve Documentation
- Fix typos or clarify unclear sections
- Add examples or better explanations
- Update outdated information

## 🛠️ Development Setup

### Prerequisites
- Node.js 20+
- pnpm 10.28.2
- Docker (for PostgreSQL)
- Git

### Getting Started

1. **Fork and Clone**
   ```bash
   git clone https://github.com/YOUR-USERNAME/puckhub.git
   cd puckhub
   ```

2. **Install Dependencies**
   ```bash
   pnpm install
   ```

3. **Setup Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start Development**
   ```bash
   pnpm dev
   # Starts Docker (DB + pgAdmin) + all dev servers
   # Admin UI: http://localhost:3000
   # API: http://localhost:3001
   ```

5. **Run Tests**
   ```bash
   pnpm test          # Unit tests
   pnpm test:e2e      # E2E tests
   pnpm lint          # Type checking
   ```

## 📝 Code Style

### General Guidelines
- **TypeScript**: Strict mode, no `any` types without good reason
- **Imports**: No `.js` extensions (use extensionless paths)
- **Language**: UI text and error messages in **German** (primary), English translations provided
- **Formatting**: Prettier + ESLint (runs automatically)

### Project Conventions
- **Package Manager**: Always use `pnpm`, never npm/yarn
- **Commit Messages**: Clear, descriptive, in English
  ```
  feat: add player statistics page
  fix: resolve roster loading issue
  docs: update API documentation
  ```

### Monorepo Structure
```
packages/
├── api/         # Hono + tRPC API server
├── db/          # Drizzle ORM + PostgreSQL schema
├── ui/          # Shared UI components
└── config/      # Shared configuration

apps/
├── admin/       # TanStack Start admin UI
└── web/         # Public website (placeholder)
```

## 🔄 Pull Request Process

1. **Update Documentation**
   - Update README.md if you add features
   - Update CLAUDE.md files if you change architecture
   - Add JSDoc comments for complex functions

2. **Add Tests**
   - Add unit tests for new functions
   - Add E2E tests for user-facing features
   - Ensure all tests pass: `pnpm test`

3. **Type Check**
   ```bash
   pnpm lint
   ```

4. **Create Pull Request**
   - Fill out the PR template
   - Reference related issues
   - Request review from maintainers

5. **Address Feedback**
   - Respond to comments
   - Make requested changes
   - Keep the PR focused (one feature/fix per PR)

## 🎯 Priority Areas

We especially welcome contributions in these areas:

### High Priority
- 🐛 Bug fixes
- 🌍 Translation improvements (German/English)
- 📚 Documentation improvements
- ♿ Accessibility enhancements

### Medium Priority
- ✨ New features (discuss in an issue first)
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🧪 Additional test coverage

### Lower Priority
- 🔧 Code refactoring (must maintain functionality)
- 🎨 Style/aesthetic changes (discuss first)

## 🚫 What We Won't Accept

- Changes that break existing functionality without good reason
- Features that only benefit a very specific use case
- Large refactors without prior discussion
- Code that doesn't follow our style guide
- Contributions without proper testing
- Changes to licensing or CLA without explicit approval

## 📋 Database Changes

If your contribution involves database schema changes:

1. **Create Migration**
   ```bash
   cd packages/db
   pnpm db:generate  # Generate SQL migration
   ```

2. **Test Migration**
   ```bash
   pnpm db:migrate   # Test on dev DB
   ```

3. **Update Seed Data**
   - Update `src/seed/index.ts` or `src/seed/demo.ts` if needed
   - Ensure seed still works: `pnpm db:seed:demo`

4. **Document Changes**
   - Update `packages/db/CLAUDE.md`
   - Add migration notes to PR description

## 🔒 Security Issues

**DO NOT** open public issues for security vulnerabilities.

Instead, email security reports to:
**Sascha Grüßhaber**: sascha@gruesshaber.eu

Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond within 48 hours and work with you to resolve the issue before public disclosure.

## 💬 Community Guidelines

- Be respectful and professional
- Welcome newcomers and help them get started
- Give constructive feedback
- Focus on what's best for the project and its users
- Respect different opinions and experience levels

## 📞 Getting Help

- **Questions**: Open a GitHub Discussion
- **Bugs**: Open a GitHub Issue
- **Feature Requests**: Open a GitHub Issue with "feature request" label
- **Direct Contact**: sascha@gruesshaber.eu

## 📄 License

By contributing to PuckHub, you agree that your contributions will be subject to the project's [License](LICENSE.md) and [Contributor License Agreement](CLA.md).

---

Thank you for contributing to PuckHub! 🏒
