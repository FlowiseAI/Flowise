# AnswerAgentAI Documentation Website

This documentation website is built using [Docusaurus](https://docusaurus.io/), a modern static website generator, and serves as both the marketing site and comprehensive documentation hub for the entire AnswerAgentAI platform ecosystem.

## 🎯 Purpose & Scope

This package serves multiple critical functions:

### 📖 **Complete Documentation Hub**

-   **Answer Agent Documentation**: Comprehensive guides for using Answer Agent across all platforms
-   **API Reference**: Complete API documentation auto-generated from OpenAPI specs
-   **Integration Guides**: Step-by-step tutorials for integrating with AnswerAgentAI services
-   **User Guides**: End-user documentation for all AnswerAgentAI products and features
-   **Developer Resources**: Technical documentation for building on the AnswerAgentAI platform

### 🚀 **Marketing Website**

-   **Product Landing Pages**: Dedicated pages for each AnswerAgentAI product and service
-   **Feature Showcases**: Interactive demonstrations of platform capabilities
-   **Customer Journey**: Guided paths from awareness to conversion
-   **SEO Optimization**: Search engine optimized content for discoverability
-   **Lead Generation**: Integrated forms and CTAs for business development

### 🎤 **Interactive Experience**

-   **Voice Agent Integration**: Live voice conversations with AI agents
-   **Interactive Demos**: Hands-on examples of platform features
-   **Dynamic Content**: Real-time updates and personalized experiences
-   **Multi-modal Support**: Text, voice, and visual interaction methods

## 🚀 Quick Start

### Prerequisites

-   Node.js >= 18.15.0
-   pnpm >= 9

### Local Development

```bash
cd packages/docs
pnpm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
cd packages/docs
pnpm build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

## 📁 Project Structure

```
packages/docs/
├── blog/                          # Blog posts and configuration
│   ├── authors.yml               # Blog authors configuration
│   ├── tags.yml                  # Blog tags configuration
│   └── *.md                      # Blog post files
├── docs/                         # Documentation content
│   ├── api/                      # API documentation
│   ├── developers/               # Developer guides
│   ├── user-guides/              # User documentation
│   └── *.md/*.mdx                # Documentation files
├── src/
│   ├── components/               # Custom React components
│   │   ├── ElevenLabsInlineWidget/  # Voice agent integration
│   │   ├── AnimatedIntegrations/    # UI animations
│   │   └── UsingAnswerAgentAISubmenu/    # Navigation component
│   ├── pages/                    # Marketing pages (React)
│   │   ├── index.tsx            # Homepage
│   │   ├── ai-workshops.tsx     # AI Workshops landing page
│   │   ├── agents.tsx           # Agents page
│   │   ├── apps.tsx             # Apps page
│   │   ├── developers.tsx       # Developers page
│   │   ├── sidekick-studio.tsx  # Sidekick Studio page
│   │   └── *.tsx                # Other marketing pages
│   ├── css/                     # Global styles
│   └── utils/                   # Utility functions
├── static/                      # Static assets
├── openapi/                     # OpenAPI specifications
├── docusaurus.config.ts         # Docusaurus configuration
├── sidebars.ts                  # Documentation sidebar configuration
└── package.json                 # Dependencies and scripts
```

## 📝 Blog System

### Blog Configuration

-   **Authors**: Configured in `blog/authors.yml`
-   **Tags**: Configured in `blog/tags.yml`
-   **Posts**: Markdown files in `blog/` directory

### Creating Blog Posts

1. Create a new markdown file in `blog/` directory
2. Use the naming convention: `YYYY-MM-DD-post-title.md`
3. Include frontmatter with metadata:

```markdown
---
slug: unique-post-slug
title: Post Title
authors: [bradtaylorsf]
tags: [tag1, tag2, tag3]
---

# Post Title

Your content here...
```

### Blog Features

-   **Author profiles** with social links
-   **Tag system** for categorization
-   **RSS/Atom feeds** automatically generated
-   **Reading time** estimation
-   **SEO optimization** with meta tags

## 🎨 Marketing Pages

### Page Structure

Marketing pages are React components located in `src/pages/` that follow a consistent pattern:

```tsx
import clsx from 'clsx'
import Layout from '@theme/Layout'
import styles from './index.module.css'

function PageComponent() {
    return (
        <Layout title='Page Title' description='Page description for SEO'>
            <main>{/* Page content */}</main>
        </Layout>
    )
}

export default PageComponent
```

### Available Marketing Pages

#### Homepage (`index.tsx`) - Platform Overview

-   **Hero section** with 3D animation showcasing AI capabilities
-   **Mission statement**: "AI for ALL, not for the few"
-   **Feature highlights** with interactive elements
-   **Product ecosystem** overview with navigation to all services
-   **CTA buttons** for key actions (Join Alpha, Chrome Extension)
-   **Animated integrations** showcase

#### AI Workshops (`ai-workshops.tsx`) - Enterprise Training

-   **Workshop information** and comprehensive pricing
-   **Benefits section** with feature cards highlighting ROI
-   **How it works** process explanation (3-day online + 2-day in-person)
-   **Integrated voice agents** for instant support and booking
-   **Location options** and scheduling system
-   **Corporate training** focus with team-building elements

#### Agents (`agents.tsx`) - Answer Agent Platform

-   **Agent showcase** and core capabilities
-   **Use case examples** across different industries
-   **Integration guides** for developers
-   **Agent marketplace** and customization options
-   **Performance metrics** and analytics
-   **Multi-platform deployment** (web, mobile, desktop)

#### Apps (`apps.tsx`) - Application Ecosystem

-   **Application overview** of the entire AnswerAgentAI suite
-   **Feature comparisons** between different apps
-   **Download links** for desktop and mobile applications
-   **Integration capabilities** with existing workflows
-   **Pricing tiers** and feature matrices
-   **User testimonials** and case studies

#### Developers (`developers.tsx`) - Developer Platform

-   **Developer resources** and getting started guides
-   **API documentation links** to comprehensive references
-   **Code examples** and integration tutorials
-   **SDK downloads** and library documentation
-   **Community resources** and support channels
-   **Contribution guidelines** and open source projects

#### Sidekick Studio (`sidekick-studio.tsx`) - Content Creation Platform

-   **Studio features** and creative capabilities
-   **Workflow demonstrations** with interactive examples
-   **Getting started guides** for content creators
-   **Template library** and customization options
-   **Collaboration tools** for team projects
-   **Export and publishing** options

#### Browser Sidekick (`browser-sidekick.tsx`) - Chrome Extension

-   **Chrome extension** features and capabilities
-   **Installation guide** and setup instructions
-   **Browser integration** demonstrations
-   **Productivity features** and workflow enhancements
-   **Privacy and security** information
-   **User reviews** and ratings

#### Chat (`chat.tsx`) - Conversational AI

-   **Chat interface** capabilities and features
-   **Conversation examples** and use cases
-   **Customization options** for different industries
-   **Integration with existing** chat systems
-   **Multi-language support** and localization
-   **Analytics and insights** dashboard

#### Creators (`creators.tsx`) - Creator Economy

-   **Creator tools** and monetization options
-   **Content creation** workflows and templates
-   **Community features** and collaboration
-   **Revenue sharing** and payment systems
-   **Creator showcase** and success stories
-   **Getting started** as a creator

#### Getting Started (`getting-started.tsx`) - Onboarding

-   **Onboarding flow** for new users
-   **Step-by-step tutorials** for each product
-   **Quick start guides** and checklists
-   **Video tutorials** and interactive demos
-   **Support resources** and help documentation
-   **Community links** and user forums

#### Learn (`learn.tsx`) - Educational Resources

-   **Learning paths** for different user types
-   **Tutorial library** with searchable content
-   **Certification programs** and badges
-   **Webinar schedules** and recorded sessions
-   **Best practices** and advanced techniques
-   **Community-contributed** content

### Design Patterns

#### Common Components

-   **Hero sections** with background animations
-   **Feature cards** with hover effects
-   **CTA buttons** with consistent styling
-   **Responsive layouts** using CSS Grid/Flexbox

#### Styling Conventions

-   **CSS Modules** for component-specific styles
-   **Shared styles** in `src/css/`
-   **Theme integration** with Docusaurus theming
-   **Consistent color scheme** and typography

## 🎤 ElevenLabs Voice Agent Integration

### Overview

The site uses the `ElevenLabsInlineWidget` component to integrate voice conversations directly into pages. Users can click to start voice calls with AI agents trained on specific topics.

### Component Location

-   **Component**: `src/components/ElevenLabsInlineWidget/index.tsx`
-   **Styles**: `src/components/ElevenLabsInlineWidget/styles.module.css`

### Basic Usage

```tsx
import ElevenLabsInlineWidget from '@site/src/components/ElevenLabsInlineWidget'
;<ElevenLabsInlineWidget agentId='agent_01k03gnw7xe11btz2vprkf7ay5' text='🤖 Talk to an Agent' variant='cta' />
```

### Configuration Options

#### Required Props

-   **`agentId`**: ElevenLabs agent ID (get from [ElevenLabs Agents Dashboard](https://elevenlabs.io/app/conversational-ai/agents))

#### Optional Props

-   **`text`**: Button text (default: 'Start Voice Call')
-   **`variant`**: Button style - `'cta'` | `'outline'` | `'chip'` (default: 'cta')
-   **`emoji`**: Emoji for chip variant
-   **`buttonClassName`**: Custom CSS classes for button styling
-   **`wrapperClassName`**: Custom CSS classes for wrapper element
-   **`inline`**: Boolean - removes column wrapper for horizontal layouts (default: false)
-   **`showStatus`**: Boolean - shows/hides status messages (default: true)
-   **`onConversationStart`**: Callback when call starts
-   **`onConversationEnd`**: Callback when call ends

### Layout Variants

#### 1. Default Layout (Column)

```tsx
<ElevenLabsInlineWidget agentId='agent_01k03gnw7xe11btz2vprkf7ay5' text='Talk to Support' variant='cta' />
```

-   Creates vertical layout with status messages below button
-   Best for standalone placement

#### 2. Inline Layout (Horizontal)

```tsx
<ElevenLabsInlineWidget agentId='agent_01k03gnw7xe11btz2vprkf7ay5' text='Quick Chat' variant='chip' inline={true} showStatus={false} />
```

-   Renders as inline button without wrapper
-   Perfect for horizontal button groups
-   Status messages positioned absolutely if enabled

#### 3. Custom Styled (Matching Site CTAs)

```tsx
<ElevenLabsInlineWidget
    agentId='agent_01k03gnw7xe11btz2vprkf7ay5'
    text='🤖 Talk to an Agent'
    variant='cta'
    buttonClassName={`${styles.ctaButton} ${styles.ctaPrimary}`}
    inline={true}
    showStatus={false}
/>
```

-   Uses site's existing CTA button styles
-   Maintains visual consistency with other buttons

### Creating New Voice Agents

1. **Visit ElevenLabs Dashboard**: [https://elevenlabs.io/app/conversational-ai/agents](https://elevenlabs.io/app/conversational-ai/agents)
2. **Create New Agent**: Click "Create Agent" button
3. **Configure Agent**:
    - Set agent name and description
    - Choose voice model and settings
    - Configure conversation flow and knowledge base
    - Set system prompts for specific use cases
4. **Get Agent ID**: Copy the agent ID from the dashboard
5. **Update Code**: Replace `agentId` prop in the component

### Current Implementations

#### AI Workshops Page (`ai-workshops.tsx`)

-   **Hero Section**: Chip variant in secondary links
-   **Prominent CTA Section**: CTA variant matching site buttons
-   **Pricing Section**: Inline variant in horizontal button group

#### Agent Configuration

-   **Current Agent ID**: `agent_01k03gnw7xe11btz2vprkf7ay5`
-   **Purpose**: Trained to answer questions about AI workshops, pricing, and availability
-   **Voice**: Configured for professional, helpful conversations

## 📚 Documentation System

### Structure

The documentation system is organized into several key areas:

#### **Answer Agent Documentation**

-   **Core Concepts**: Understanding Answer Agent architecture and capabilities
-   **Getting Started**: Quick start guides for different user types
-   **API Reference**: Complete API documentation with examples
-   **Integration Guides**: Platform-specific integration tutorials
-   **Best Practices**: Optimization and performance guidelines
-   **Troubleshooting**: Common issues and solutions

#### **Platform Documentation**

-   **User Guides**: Step-by-step tutorials for end users
-   **Admin Guides**: Configuration and management documentation
-   **Developer Guides**: Technical documentation for developers
-   **Integration Examples**: Code samples and use cases
-   **SDK Documentation**: Library and framework references

#### **Product-Specific Documentation**

-   **Sidekick Studio**: Content creation and workflow automation
-   **Browser Extension**: Chrome extension features and usage
-   **Mobile Apps**: iOS and Android application guides
-   **Desktop Apps**: Native application documentation
-   **Chat Interface**: Conversational AI implementation guides

#### **Business Documentation**

-   **Enterprise Features**: Advanced capabilities for business users
-   **Security & Compliance**: Data protection and regulatory compliance
-   **Pricing & Plans**: Subscription tiers and feature comparisons
-   **Support Resources**: Help desk and community support

### Adding Documentation

1. Create markdown/MDX files in appropriate `docs/` subdirectory
2. Update `sidebars.ts` to include new pages
3. Use frontmatter for metadata:

```markdown
---
title: Page Title
description: Page description
sidebar_position: 1
tags: [answer-agent, api, integration]
---

# Page Title

Your documentation content...
```

### Documentation Categories

#### **API Documentation** (`docs/api/`)

-   **Authentication**: API key management and security
-   **Endpoints**: Complete REST API reference
-   **WebSocket**: Real-time communication protocols
-   **GraphQL**: Query language documentation
-   **SDKs**: Language-specific libraries
-   **Rate Limiting**: Usage limits and best practices

#### **User Guides** (`docs/user-guides/`)

-   **Getting Started**: Onboarding and setup
-   **Basic Usage**: Core functionality tutorials
-   **Advanced Features**: Power user capabilities
-   **Customization**: Personalization options
-   **Troubleshooting**: Common issues and solutions

#### **Developer Guides** (`docs/developers/`)

-   **Architecture**: System design and components
-   **Development Setup**: Local development environment
-   **Contributing**: How to contribute to the project
-   **Plugin Development**: Creating custom extensions
-   **Testing**: Quality assurance and testing strategies

#### **Integration Guides** (`docs/integrations/`)

-   **Slack Integration**: Team communication setup
-   **Discord Integration**: Community platform connection
-   **CRM Integration**: Customer relationship management
-   **Zapier Integration**: Workflow automation
-   **Custom Integrations**: Building your own connections

### MDX Features

-   **React components** in markdown for interactive content
-   **Interactive examples** with live code execution
-   **Code syntax highlighting** with multiple language support
-   **Tabbed content** for organized information
-   **Admonitions** (notes, warnings, tips, info boxes)
-   **Mermaid diagrams** for visual documentation
-   **OpenAPI integration** for automatic API documentation

## 🔧 Development Patterns

### Component Development

-   **Functional components** with TypeScript
-   **CSS Modules** for styling
-   **Responsive design** principles
-   **Accessibility** considerations

### Styling Guidelines

-   **Consistent spacing** using CSS custom properties
-   **Theme integration** with Docusaurus variables
-   **Mobile-first** responsive design
-   **Dark mode** support

### Performance Optimization

-   **Code splitting** for large components
-   **Image optimization** with proper formats
-   **Lazy loading** for non-critical content
-   **Bundle analysis** with build tools

## 🛠️ Available Scripts

### Development

```bash
pnpm start          # Start development server
pnpm build          # Build for production
pnpm serve          # Serve built site locally
```

### API Documentation

```bash
pnpm api-docs       # Generate API docs from OpenAPI specs
pnpm gen-api-docs   # Generate specific API documentation
pnpm clean-api-docs # Clean generated API docs
```

### Maintenance

```bash
pnpm clear          # Clear Docusaurus cache
pnpm write-translations  # Extract translatable strings
pnpm write-heading-ids   # Generate heading IDs
```

## 🚀 Deployment

### Build Process

1. **Generate API docs** from OpenAPI specifications
2. **Build static site** with Docusaurus
3. **Optimize assets** (images, CSS, JS)
4. **Deploy to hosting** (Vercel, Netlify, etc.)

### Environment Variables

-   **`DOCUSAURUS_CONFIG`**: Configuration overrides
-   **`BASE_URL`**: Site base URL for deployment
-   **`ALGOLIA_*`**: Search configuration (if using Algolia)

## 🔍 SEO & Analytics

### SEO Features

-   **Meta tags** for all pages
-   **OpenGraph** and Twitter Card support
-   **Structured data** markup
-   **Sitemap** generation
-   **Canonical URLs**

### Analytics Integration

-   **Google Analytics** support
-   **Custom tracking** events
-   **Performance monitoring**

## 🎯 Best Practices

### Content Creation

1. **Write clear, concise content** targeting specific user needs
2. **Use headings** to structure content hierarchically
3. **Include code examples** for technical documentation
4. **Add images and diagrams** to illustrate concepts
5. **Test all links** and examples before publishing

### Answer Agent Documentation

1. **Cover all platforms** (web, mobile, desktop, browser extension)
2. **Include real-world examples** from actual use cases
3. **Provide troubleshooting guides** for common issues
4. **Document API changes** and version compatibility
5. **Include performance optimization** tips and best practices
6. **Maintain consistency** across all documentation sections

### Voice Agent Integration

1. **Use `inline={true}` for horizontal layouts** to prevent wrapper interference
2. **Set `showStatus={false}` in button groups** to avoid layout conflicts
3. **Match button styling** using `buttonClassName` for visual consistency
4. **Choose appropriate variants**:
    - `cta`: Primary actions and important calls-to-action
    - `outline`: Secondary actions
    - `chip`: Compact inline actions with emojis
5. **Test voice quality** and conversation flow before deployment
6. **Update agent training** regularly based on user feedback

### Marketing Pages

1. **Follow consistent layout patterns** across pages
2. **Use responsive design** for all screen sizes
3. **Optimize images** for web performance
4. **Include clear CTAs** on every page
5. **Test user flows** from page to page
6. **Maintain brand consistency** across all marketing materials
7. **Include social proof** (testimonials, case studies, reviews)
8. **Optimize for SEO** with proper meta tags and structured data
9. **Track user interactions** with analytics and conversion metrics
10. **A/B test different versions** of key pages and components

## 🐛 Troubleshooting

### Common Issues

#### Build Errors

-   **Clear cache**: `pnpm clear`
-   **Reinstall dependencies**: `rm -rf node_modules && pnpm install`
-   **Check TypeScript**: Verify all imports and types

#### Voice Agent Issues

-   **Alignment problems**: Use `inline={true}` for horizontal button groups
-   **Voice quality**: Test in ElevenLabs dashboard first
-   **Styling conflicts**: Check CSS specificity and use `buttonClassName`

#### Documentation Issues

-   **Broken links**: Use relative paths for internal links
-   **Missing pages**: Update `sidebars.ts` configuration
-   **MDX errors**: Verify React component imports and syntax
-   **Search not working**: Check Algolia configuration and indexing
-   **Slow build times**: Optimize images and reduce bundle size

#### Answer Agent Documentation Issues

-   **Outdated examples**: Regularly update code samples and screenshots
-   **Missing platform coverage**: Ensure all platforms are documented
-   **Version mismatches**: Keep documentation in sync with product releases
-   **Incomplete API docs**: Verify OpenAPI specs are up to date
-   **User feedback**: Monitor support channels for common documentation gaps

### Getting Help

-   **Check Docusaurus docs**: [https://docusaurus.io/docs](https://docusaurus.io/docs)
-   **Review ElevenLabs docs**: [https://elevenlabs.io/docs](https://elevenlabs.io/docs)
-   **Search existing issues** in the project repository
-   **Create detailed bug reports** with reproduction steps

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** following the established patterns
4. **Test thoroughly** in development environment
5. **Submit a pull request** with detailed description

For detailed contributing guidelines, see CONTRIBUTING.md in the project root.
