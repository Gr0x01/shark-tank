---
Last-Updated: 2025-12-13
Maintainer: RB
Status: Live - Production
---

# Technology Stack: tankd.io

## Core Technologies
Modern web stack optimized for rapid development and minimal operational overhead.

### Backend
- **Runtime**: Node.js 18+ (via Next.js API routes)
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage (for product photos)
- **Authentication**: Supabase Auth (for admin tools)

### Frontend
- **Framework**: Next.js 14+ with React 18
- **State Management**: React Context + useState/useReducer
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI + custom components
- **Build Tool**: Built into Next.js

### Infrastructure
- **Hosting**: Vercel (seamless Next.js integration)
- **Database Hosting**: Supabase (managed Postgres)
- **File Storage**: Supabase Storage
- **CDN**: Vercel Edge Network (included)
- **Analytics**:
  - Google Analytics 4 (active, tracking ID: G-8G8CLL4K3F)
  - Plausible.io (active, privacy-friendly backup)
  - PostHog (not yet integrated - planned for Phase 4)
- **Monitoring**: Vercel Analytics + Supabase monitoring
- **Automation**: Vercel Cron (3 scheduled jobs: episode detection, daily enrichment, narrative refresh)

## Development Tools

### Code Quality
- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier with Tailwind plugin
- **Type Checking**: TypeScript (strict mode)
- **Testing**: Jest + React Testing Library (unit tests), Playwright (e2e)

### Development Environment
- **Package Manager**: npm
- **Version Control**: Git
- **CI/CD**: Vercel automated deployments + GitHub Actions
- **Environment**: Local development with Next.js dev server

### Specialized Tools
- **Data Validation**: Zod for runtime type checking
- **Environment Variables**: Next.js built-in env support

### LLM & AI Tools
- **Language Model**: OpenAI gpt-4.1-mini (Flex tier, 50% cost savings)
- **Search API**: Tavily (web research for enrichment)
- **Use Cases**:
  - Product narrative generation (~$0.001/product)
  - Shark biography enrichment (~$0.0012/shark)
  - Deal detail extraction from web search
- **Performance**: 100% accuracy on 618 products, zero hallucinations
- **Monthly Cost**: ~$3.82 for all automation (OpenAI ~$0.20, Tavily ~$3.60)
- **Reference**: See `/memory-bank/architecture/llm-models.md` for model testing details

## Architecture Decisions

### Database Design
- **PostgreSQL**: Relational structure for product/shark/episode relationships
- **Normalized Schema**: Separate tables for shows, sharks, products, episodes
- **Soft Deletes**: `status` field instead of hard deletes for products

### API Design
- **Next.js API Routes**: Server-side API endpoints within same codebase
- **RESTful Design**: Simple GET/POST endpoints for products and search
- **Type Safety**: Shared TypeScript types between client and server

### Security Considerations
- **Environment Variables**: All API keys stored in Vercel env vars
- **Input Validation**: Zod schemas for all user inputs
- **Admin Auth**: Supabase Auth for admin-only endpoints

### Performance Considerations
- **Static Generation**: Pre-generate pages where possible (SEO critical)
- **Client-Side Filtering**: Cache dataset client-side for instant filtering
- **Lazy Loading**: Load product details on demand

## Dependencies
```json
{
  "next": "14+",
  "react": "18+", 
  "typescript": "5+",
  "tailwindcss": "3+",
  "@headlessui/react": "^1.7.0",
  "@supabase/supabase-js": "^2.38.0",
  "posthog-js": "^1.302.0",
  "zod": "^3.22.0"
}
```

## Environment Configuration
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your_posthog_project_api_key
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Automation
CRON_SECRET=your_cron_secret

# AI/LLM
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
```

## Deployment Architecture
- **Frontend**: Static generation + ISR where possible on Vercel Edge
- **API Routes**: Vercel serverless functions (Node.js runtime)
- **Database**: Supabase managed PostgreSQL
- **Assets**: Vercel CDN for static assets
