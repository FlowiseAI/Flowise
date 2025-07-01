---
title: Contributing to AnswerAI
description: Complete guide to contributing to the AnswerAI Alpha Sprint - PR process, guidelines, and best practices
---

# Contributing to AnswerAI

Welcome to the AnswerAI Alpha Sprint! This guide will help you contribute effectively to our mission of building privacy-first AI tools.

## 🚀 Getting Started

### 1. Choose Your Repository

Visit our [organization repositories](https://github.com/orgs/the-answerai/repositories) and pick a project:

-   **[theanswer](https://github.com/the-answerai/theanswer)** - Main platform (21k⭐)
-   **[aai-browser-sidekick](https://github.com/the-answerai/aai-browser-sidekick)** - Chrome extension
-   **[FlowiseChatEmbed](https://github.com/the-answerai/FlowiseChatEmbed)** - Chat embedding (1.5k⭐)
-   **[mcp-inspector](https://github.com/the-answerai/mcp-inspector)** - MCP testing tool
-   **Various MCP servers** - HubSpot, Jira, Confluence integrations

### 2. Find Your First Issue

Look for issues tagged with:

-   `beginner` - Perfect for first-time contributors
-   `good first issue` - Well-documented starter tasks
-   `help wanted` - Community assistance needed
-   `alpha-sprint` - High-priority for July 21st deadline

## 📋 PR Process

### Before You Start

1. **Fork the repository** you want to contribute to
2. **Clone your fork** locally
3. **Create a new branch** for your feature/fix
4. **Read the existing code** to understand patterns

### Development Workflow

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/REPO_NAME.git
cd REPO_NAME

# Create feature branch
git checkout -b feature/your-feature-name

# Install dependencies
npm install
# or
pnpm install

# Start development server
npm run dev
```

### Making Changes

1. **Follow existing code style** - We use ESLint and Prettier
2. **Write descriptive commit messages**
3. **Test your changes** thoroughly
4. **Update documentation** if needed

### Commit Message Format

Use conventional commit format:

```
type: brief description

feat: add new chat sidekick for data analysis
fix: resolve extension popup sizing issue
docs: update API documentation for agents
style: format code according to prettier rules
refactor: improve database query performance
test: add unit tests for chat history
```

### Pull Request Guidelines

#### 1. Create a Quality PR

-   **Title**: Clear, descriptive summary
-   **Description**: Explain what you built and why
-   **Screenshots**: For UI changes
-   **Testing**: How you verified it works

#### 2. PR Template

```markdown
## What I Built

Brief description of your contribution

## Problem It Solves

Explain the specific issue or enhancement

## How It Serves the Mission

Connect to our privacy-first, developer-friendly goals

## Testing Done

-   [ ] Local testing completed
-   [ ] Edge cases considered
-   [ ] Documentation updated

## Screenshots/Video

[Include visual proof of your work]

## Additional Notes

Any special considerations or future improvements
```

### 3. Automated Review Process

Our system will automatically:

-   ✅ Run tests and linting
-   🤖 Provide AI-suggested improvements
-   📊 Check code coverage
-   🔍 Security vulnerability scan

### 4. Video Requirement

**Every merged PR requires a 1-3 minute video explaining:**

1. **What you built/fixed**
2. **Problem it solves**
3. **How it serves our mission**
4. **Demo of functionality**

#### Video Guidelines

-   **Length**: 1-3 minutes maximum
-   **Format**: MP4, MOV, or YouTube link
-   **Quality**: Clear audio, visible screen
-   **Content**: Focus on your contribution's impact

## 🎯 Contribution Types

### Code Contributions

-   **Bug fixes** - Resolve existing issues
-   **New features** - Enhance platform capabilities
-   **Performance** - Optimize speed and efficiency
-   **Security** - Strengthen privacy and safety

### Non-Code Contributions

-   **Documentation** - Improve guides and examples
-   **Testing** - Write and improve test coverage
-   **Design** - UI/UX improvements
-   **Community** - Help other contributors

## 🏆 Recognition System

### Credit Earning Tiers

**🥉 Bronze Contributors**

-   First merged PR
-   Community recognition
-   Alpha sprint certificate

**🥈 Silver Contributors**

-   5+ merged PRs
-   Technical mentor status
-   Early access to new features

**🥇 Gold Contributors**

-   10+ merged PRs
-   Architecture decision input
-   Revenue sharing opportunities

## ⚡ Alpha Sprint Priorities

### High-Priority Areas

1. **Chrome Extension Polish**

    - Performance optimizations
    - Bug fixes
    - New tool integrations

2. **Web Application Features**

    - Chat improvements
    - Agent management
    - Studio enhancements

3. **Foundation Work**
    - Desktop app architecture
    - API improvements
    - Documentation

### Special Recognition

**Alpha Sprint Heroes** get:

-   Direct access to core team
-   Influence on roadmap decisions
-   First access to revenue sharing
-   Speaking opportunities at events

## 🛠️ Development Environment

### Required Tools

-   **Node.js** (18.15.0+ or 20+)
-   **pnpm** (recommended) or npm
-   **Git** with SSH keys configured
-   **VS Code** (recommended) with extensions:
    -   ESLint
    -   Prettier
    -   TypeScript Hero

### Environment Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Start development servers
pnpm dev
```

### Testing

```bash
# Run all tests
pnpm test

# Run specific test suite
pnpm test:unit
pnpm test:e2e

# Watch mode for development
pnpm test:watch
```

## 🤝 Code Review Process

### What We Look For

1. **Code Quality**

    - Clean, readable code
    - Proper error handling
    - Performance considerations

2. **Alignment with Mission**

    - Privacy-first approach
    - User empowerment
    - Developer-friendly design

3. **Community Impact**
    - Solves real problems
    - Enhances user experience
    - Moves sprint goals forward

### Review Timeline

-   **Initial response**: Within 24 hours
-   **Full review**: Within 48 hours
-   **Merge decision**: Within 72 hours

## 🎉 After Your PR is Merged

1. **Record your video** (if not done already)
2. **Share on social media** with #AnswerAIAlphaSprint
3. **Find your next issue** to continue contributing
4. **Help other contributors** in discussions

## 💬 Getting Help

### Community Support

-   **Discord**: [Join our developer community](https://discord.gg/X54ywt8pzj)
-   **GitHub Discussions**: Ask questions in repo discussions
-   **Office Hours**: Weekly developer Q&A sessions

### Direct Support

-   **Stuck on setup?** Tag `@core-team` in discussions
-   **Architecture questions?** Create detailed GitHub issue
-   **Urgent blockers?** Message in #alpha-sprint Discord channel

## 📅 Sprint Timeline

**Now - July 21st, 2025**

-   Core development phase
-   Daily progress updates
-   Weekly community calls

**July 21st**

-   Alpha release celebration
-   Contributor recognition event
-   Roadmap for post-alpha development

---

Remember: We're not just building software—we're proving that committed developers can create better tools than billion-dollar corporations. Every contribution matters in showing the world what privacy-first, developer-owned AI looks like.

**Ready to start building?** [Browse our repositories](https://github.com/orgs/the-answerai/repositories) and find your first issue!
