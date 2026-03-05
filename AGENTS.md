# AGENTS.md - Live AI Interview Coach

Monorepo with Next.js 14 (port 3000) + NestJS (port 3001) + MongoDB + Socket.IO. Turborepo + pnpm.

## Commands

### Root

```bash
pnpm install          # Install deps
pnpm build            # Build all
pnpm lint             # Lint all
pnpm format           # Format code
pnpm format:check      # Check formatting
```

### API (NestJS)

```bash
cd apps/api

pnpm dev              # Dev with hot reload
pnpm build            # Production build
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
pnpm test:cov         # With coverage
pnpm jest modules/gemini/gemini.service.spec.ts  # Single test file
pnpm lint             # Lint
```

### Web (Next.js)

```bash
cd apps/web
pnpm dev              # Dev server
pnpm build            # Production build
pnpm lint             # Lint
```

## Code Style

- TypeScript strict mode, ESLint + Prettier
- React: functional components, 'use client' for client components
- NestJS: `@Injectable()`, constructor injection, DTOs with `class-validator`

### Imports

```typescript
import { useState } from 'react';
import { io } from 'socket.io-client';
import { useInterviewStore } from '@/store';
import { getWebSocketClient } from '@/lib/websocket-client';
```

Use `@/` for apps/web/src/, `@live-ai-coach/shared` for shared package.

### Naming

- Files: kebab-case (`websocket-client.ts`)
- Components: PascalCase (`InterviewArea.tsx`)
- Hooks: `useXxx.ts`
- DTOs: `XxxDto.ts`
- Services: PascalCase
- Constants: UPPER_SNAKE_CASE

### Types

- Interfaces for objects, types for unions/primitives
- Export from shared package for cross-app usage

### Error Handling

- Custom exception classes in `apps/api/src/modules/*/exceptions/`
- Wrap async in try/catch, use typed errors for WebSocket events
- Log with Winston logger, never console.log

## Key Files

- Backend: `apps/api/src/main.ts`, `app.module.ts`, `modules/gemini/gemini.service.ts`, `modules/websocket/websocket.gateway.ts`, `modules/websocket/services/session-manager.service.ts`
- Frontend: `apps/web/src/hooks/use-interview.ts`, `use-audio-stream.ts`, `use-camera-analysis.ts`, `lib/websocket-client.ts`
- Shared: `packages/shared/src/types/`, `dtos/`, `constants/`

## Env Variables

```bash
API_PORT=3001
MONGODB_URI=mongodb://localhost:27017/live-interview-coach
GEMINI_API_KEY=xxx
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

## Testing

- Use `describe()`/`it()` blocks, `beforeEach()` for setup
- Mock external services (Gemini, MongoDB)
- Test error cases, not just success

## Docker

```bash
pnpm docker:up        # Production
pnpm docker:dev       # Dev with hot reload
```

## Performance

- Clean WebSocket on disconnect, use AbortController
- Limit audio/video buffers, paginate MongoDB queries

## Security

- Validate DTOs with class-validator, use helmet, rate limiting
- Never expose API keys client-side, use JWT

## Web UI Guidelines

### Accessibility

- Icon buttons: `aria-label`, form controls: `<label>` or `aria-label`
- Keyboard handlers (`onKeyDown`), semantic HTML, `aria-live` for async

### Focus

- Visible focus: `focus-visible:ring-*`, never `outline-none` without replacement

### Forms

- `autocomplete` and `name` on inputs, clickable labels, enabled submit until request starts

### Animation

- Honor `prefers-reduced-motion`, animate `transform`/`opacity` only

### Typography

- Ellipsis `…` not `...`, loading: `"Loading…"`, `text-wrap: balance` on headings
