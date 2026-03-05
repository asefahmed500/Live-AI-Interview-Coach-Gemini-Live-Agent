# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Live AI Interview Coach** monorepo built for the **Gemini Live Agent Challenge 2025**. It provides real-time, multimodal interview coaching with:
- **Real-time audio streaming** via WebSocket
- **Video frame analysis** for confidence tracking
- **Interruptible AI conversations** powered by Gemini Live API

**Tech Stack:**
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS (port 3000)
- **Backend**: NestJS + TypeScript + Mongoose (port 3001)
- **Database**: MongoDB Atlas (production) or local MongoDB
- **Real-time**: WebSocket (Socket.IO) on namespace `/live`
- **Build System**: Turborepo with pnpm workspaces
- **AI Integration**: Google Gemini Live API (@google/genai SDK)

## Development Commands

### Starting the Development Environment
```bash
# Install dependencies (run from root)
pnpm install

# Start all apps (API on :3001, Web on :3000)
pnpm dev

# Start specific app
pnpm dev:api    # NestJS backend with hot reload
pnpm dev:web    # Next.js frontend with hot reload

# Build all packages
pnpm build

# Lint all packages
pnpm lint
```

### API-Specific Commands (apps/api)
```bash
cd apps/api

# Development with hot reload (preferred method)
pnpm run dev           # Uses nest start --watch
pnpm run start:debug   # Debug mode with watch

# Build for production
pnpm run build         # Uses nest build
pnpm run start:prod    # Run production build

# Run tests
jest                    # Run all tests
jest --watch           # Watch mode
jest --coverage        # With coverage
jest --testNamePattern="test name"  # Run specific test
jest --config ./test/jest-e2e.json  # Run e2e tests

# Alternative: Run directly with ts-node (useful for debugging)
npx ts-node src/main.ts
```

### Windows Development

On Windows, `npx nest` commands may fail due to shell script compatibility issues. Use these alternatives:

```bash
# Instead of: npx nest start --watch
pnpm run dev           # Uses package.json script

# Instead of: npx nest build
pnpm run build

# Or run directly with ts-node for debugging
npx ts-node src/main.ts
```

## Architecture

### Monorepo Structure
```
live-ai-interview-coach/
├── apps/
│   ├── api/              # NestJS backend (deploy to Google Cloud Run)
│   └── web/              # Next.js frontend (deploy to Vercel)
├── packages/
│   └── shared/           # Shared types, DTOs, constants
├── deploy.sh             # Google Cloud Run deployment script
└── turbo.json           # Turborepo configuration
```

### Backend Module Pattern (apps/api/src)

Each feature follows NestJS's modular pattern:
```
modules/
├── auth/               # Authentication (JWT)
├── sessions/           # Session CRUD
├── feedback/           # Feedback generation
├── websocket/          # WebSocket gateway (/live namespace)
├── gemini/             # Gemini AI integration (@google/genai)
└── confidence/         # Confidence scoring engine (video analysis)

**Common utilities** (`common/` directory):
- `decorators/` - Custom decorators (@CurrentUser)
- `filters/` - Exception filters (HttpExceptionFilter, AllExceptionsFilter)
- `guards/` - Route guards (AuthGuard, RateLimitGuard)
- `interceptors/` - Transform, logging, timeout interceptors
- `middleware/` - Security headers, request size, request logging
- `pipes/` - Custom validation pipes
- `services/` - Logger service
```

**Key backend concepts:**
- **Guards**: Route-level authentication (JWT)
- **Interceptors**: TransformInterceptor wraps responses in `{ data, timestamp }`
- **Filters**: HttpExceptionFilter handles global errors
- **Pipes**: ValidationPipe with strict mode (whitelist + forbidNonWhitelisted)
- **Winston**: Structured logging to console (not files in dev)

### Circular Dependency Resolution

**Problem**: ConfidenceModule needs WebSocketModule, but WebSocketModule needs ConfidenceModule

**Solution**: Use `@Optional()` decorator and `@Global()` modules:

```typescript
// ConfidenceModule is @Global() - can be imported anywhere
@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([...]),
  ],
  providers: [ConfidenceEngineService],
  exports: [ConfidenceEngineService],
})
export class ConfidenceModule {}

// In ConfidenceEngineService - make dependencies optional
constructor(
  @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly winstonLogger: any,
  @InjectModel(InterviewSession.name) private readonly sessionModel: Model<InterviewSessionDocument>,
  @Optional() private readonly sessionManager?: SessionManagerService,
  @Optional() @Inject('SOCKET_IO_SERVER') private readonly ioServer?: SocketIOServer
) {}
```

### WebSocket Architecture

**Namespace**: `/live`

**Critical Session ID Pattern**: The WebSocket gateway returns the **internal Gemini session ID**, not a generated ID. This is crucial for `stop_session` to work correctly.

**Client → Server Events**:
- `start_session` - Initialize interview session
- `audio_chunk` - Stream audio data for processing
- `frame_analysis` - Analyze video frames for confidence
- `interrupt` - Interrupt current AI response
- `stop_session` - End interview session

**Server → Client Events**:
- `connection_established` - Connection confirmed
- `session_started` - Session initialized with **internal session ID**
- `ai_response` - Complete AI response
- `confidence_update` - Real-time confidence score (eyeContact, posture, engagement)
- `session_ended` - Session terminated

**Session Manager** (`session-manager.service.ts`):
- Manages WebSocket session lifecycle
- Buffers audio chunks when Gemini is streaming
- Tracks transcript entries
- Implements retry logic (max 3 retries)
- Closes sessions on disconnect or too many errors

### Frontend Structure (apps/web/src)

```
app/                    # Next.js App Router
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── auth/               # Authentication pages
└── dashboard/          # User dashboard
components/
├── audio/              # Waveform visualizer
├── camera/             # Camera preview
├── interview/          # Interview area (main feature)
├── layout/             # Header, navigation
└── ui/                 # UI components (shadcn-based)
types-shared/           # Inlined shared types for Vercel deployment
```

**Key frontend patterns**:
- Server Components by default (no `'use client'` directive)
- Client Components for interactive features (WebSocket, camera, audio)
- Zustand for state management (`store/` directory)
- Socket.IO client for WebSocket connection
- Framer Motion for animations
- Lucide React for icon set

**Design System - Notion-inspired**:
- Background: `oklch(1.00 0 0)` (pure white)
- Buttons: `oklch(0.97 0 0)` (Notion gray)
- Borders: `oklch(0.92 0 0)` (subtle borders)
- Utility classes: `.glass`, `.surface-card`

### Vercel Deployment - Shared Package Workaround

Vercel cannot access workspace dependencies. The frontend inlines shared types:

```typescript
// apps/web/src/types-shared/ contains copies of packages/shared/src/*
// Import using @/types-shared instead of @live-ai-coach/shared
import { WS_EVENTS } from '@/types-shared';
```

**When modifying shared types**:
1. Update `packages/shared/src/*`
2. Copy changes to `apps/web/src/types-shared/*`
3. Update imports in `apps/web/src` to use `@/types-shared`

## Deployment

### Production Architecture

```
Frontend (Next.js)  →  Vercel
     ↓
API (NestJS)       →  Google Cloud Run (WebSocket support)
     ↓
Database           →  MongoDB Atlas
```

**Why Cloud Run for API?** Vercel's serverless functions (max 10-60s) cannot support persistent WebSocket connections required by Socket.IO.

### Frontend - Vercel Deployment

**Current deployment**: https://web-taupe-theta-94.vercel.app

```bash
cd apps/web
vercel --prod
```

**Vercel-specific configuration** (`apps/web/next.config.mjs`):
- `eslint.ignoreDuringBuilds: true` - Required for deployment
- Build uses `npm` (not pnpm) for compatibility
- Types are inlined in `src/types-shared/` (not from workspace package)

**Environment Variables** (set in Vercel dashboard):
```
NEXT_PUBLIC_API_URL=https://your-api-url.run.app
NEXT_PUBLIC_WS_URL=wss://your-api-url.run.app
```

### API - Google Cloud Run Deployment

**Project**: `voice-ai-agent-447515`

**Prerequisites**:
```bash
# Install Google Cloud SDK
winget install Google.CloudSDK

# Authenticate and set project
gcloud init
gcloud auth login
gcloud config set project voice-ai-agent-447515
```

**Automated deployment**:
```bash
cd /d/laic
bash deploy.sh
```

This script:
1. Enables required APIs (Cloud Run, Cloud Build, AI Platform)
2. Builds Docker container with Cloud Build
3. Deploys to Cloud Run (us-central1, 2048Mi, 2 CPU)
4. Configures secrets and environment variables
5. Returns the API URL

**Manual deployment** (if script fails):
```bash
# Create secrets
gcloud secrets create gemini-api-key --data-file=<(echo "YOUR_API_KEY")
gcloud secrets create mongodb-uri --data-file=<(echo "mongodb+srv://...")

# Deploy
cd apps/api
gcloud builds submit --tag gcr.io/voice-ai-agent-447515/live-interview-api
gcloud run deploy live-interview-api \
  --image gcr.io/voice-ai-agent-447515/live-interview-api \
  --region us-central1 \
  --memory 2048Mi --cpu 2 \
  --timeout 3600s \
  --set-secrets GEMINI_API_KEY=gemini-api-key,MONGODB_URI=mongodb-uri \
  --allow-unauthenticated
```

**MongoDB Atlas connection string format**:
```
mongodb+srv://username:password@cluster0.8vksczm.mongodb.net/liveaicoachdb?appName=Cluster0
```

## Important Configuration

### Environment Variables (.env)

**Required for `apps/api/.env`:**
```bash
NODE_ENV=development
API_PORT=3001
API_HOST=0.0.0.0
API_PREFIX=api

# MongoDB - Local or Atlas
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# CORS
CORS_ORIGINS=http://localhost:3000,https://your-vercel-app.vercel.app

# Authentication
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRATION=7d

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TIMEOUT=120000
```

**Security**: Never commit API keys. Use environment variables or secrets managers.

### TypeScript Configuration (apps/api/tsconfig.json)

**Critical settings**:
```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts"],
  "moduleResolution": "node",
  "incremental": true,
  "outDir": "./dist",
  "rootDir": "./src"
}
```

**When build fails with TS5055 errors** (overwrite input files):
```bash
cd apps/api
rm -f tsconfig.tsbuildinfo
npx tsc -p tsconfig.json
```

### NestJS Bootstrap Order (apps/api/src/main.ts)

1. Winston logger
2. Security headers middleware
3. Request size limits middleware
4. Rate limiting middleware
5. Helmet
6. Compression
7. CORS
8. Global ValidationPipe (strict mode)
9. Global ExceptionFilter
10. Global TransformInterceptor
11. Trust proxy
12. API prefix

**Graceful Shutdown**: Handles SIGTERM/SIGINT, closes connections with logging

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| API | 3001 | http://localhost:3001/api |
| WebSocket | 3001 | ws://localhost:3001/live |
| MongoDB | 27017 | mongodb://localhost:27017 |

**Port conflicts**: If Next.js can't use port 3000, it will try 3001, causing conflicts with the API.

```bash
# Find and kill process using port 3001
netstat -ano | findstr :3001
taskkill //PID <pid> //F
```

## Database Collections

- **users** - Authentication and user profiles
- **sessions** - Interview session tracking
- **messages** - Chat history per session
- **feedback** - Generated feedback reports

## Mongoose Schema Best Practices

When defining fields with `unique: true` in `@Prop()`, do NOT also add `index: true`:

```typescript
// ✓ Correct
@Prop({ type: String, required: true, unique: true, lowercase: true })
email: string;

// ✗ Wrong - causes duplicate index warning
@Prop({ type: String, required: true, unique: true, index: true })
email: string;
```

## Error Handling

### WebSocket Error Codes
- `SESSION_NOT_FOUND` - Session does not exist (use internal session ID from `session_started`)
- `SESSION_INACTIVE` - Session is not active
- `QUOTA_EXCEEDED` - Gemini API quota exceeded
- `SAFETY_VIOLATION` - Content safety violation
- `INTERRUPTED` - Session was interrupted
- `MAX_RETRIES_EXCEEDED` - Too many retry attempts

### Common Issues

**Session ID mismatch in `stop_session`**:
- Always use the `sessionId` returned in `session_started` event (internal Gemini ID)
- Do not use generated IDs or room IDs

**TypeScript compilation including dist folder**:
- Delete `*.tsbuildinfo` files
- Verify `tsconfig.json` has proper include/exclude patterns

## Key Files Reference

- `apps/api/src/main.ts` - Application bootstrap, middleware setup
- `apps/api/src/app.module.ts` - Root module
- `apps/api/src/modules/websocket/websocket.gateway.ts` - WebSocket handlers
- `apps/api/src/modules/websocket/services/session-manager.service.ts` - Session lifecycle
- `apps/api/src/modules/confidence/confidence.module.ts` - @Global() module pattern
- `apps/web/src/types-shared/` - Inlined shared types for Vercel
- `apps/web/next.config.mjs` - Vercel build configuration
- `deploy.sh` - Google Cloud Run automated deployment
- `apps/api/Dockerfile` - Production container image
