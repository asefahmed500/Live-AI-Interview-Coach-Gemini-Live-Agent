# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Reference

**Production URLs:**
- Frontend: https://web-taupe-theta-94.vercel.app
- Backend API: https://live-interview-api-ywh3e45esq-uc.a.run.app
- WebSocket: wss://live-interview-api-ywh3e45esq-uc.a.run.app/live

**Key Commands:**
```bash
pnpm install          # Install dependencies
pnpm dev              # Start all apps (web:3000, api:3001)
pnpm build            # Build all packages
pnpm lint             # Lint all packages
```

**Engine Requirements:**
- Node.js: >=18.0.0
- pnpm: >=8.0.0 (exact: 8.15.0)

---

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
- Text gradient: `from-blue-600 via-purple-600 to-pink-600` (visible on white)
- Utility classes: `.glass`, `.surface-card`

**Important**: Text gradients must use visible colors (blue-purple-pink), NOT dark zinc colors that are invisible on white backgrounds.

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
Frontend (Next.js)  →  Vercel OR Google Cloud Run
     ↓
API (NestJS)       →  Google Cloud Run (WebSocket support)
     ↓
Database           →  MongoDB Atlas
```

**Why Cloud Run for API?** Vercel's serverless functions (max 10-60s) cannot support persistent WebSocket connections required by Socket.IO.

### Frontend - Deployment Options

The frontend can be deployed to either **Vercel** (recommended) or **Google Cloud Run**.

#### Option 1: Vercel (Recommended)

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

#### Option 2: Google Cloud Run

The web app can also be deployed to Cloud Run using the Cloud Build configuration:

```bash
gcloud builds submit --config apps/web/cloudbuild.yaml .
```

This requires a Dockerfile at `docker/web/Dockerfile` (currently not present - needs to be created).

### API - Google Cloud Run Deployment

**Project**: `voice-ai-agent-447515`

**⚠️ SECURITY WARNING**: Never hardcode credentials in deployment scripts. Always use environment variables or Google Secret Manager. The PowerShell scripts (`deploy-gcp.ps1`, `deploy-windows.ps1`) should have their credentials replaced with environment variable references before use.

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
# Set secrets as environment variables (NOT hardcoded)
export GEMINI_API_KEY="your-gemini-api-key"
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/dbname"

cd /d/laic
bash deploy.sh
```

The script:
1. Validates that GEMINI_API_KEY and MONGODB_URI environment variables are set
2. Enables required APIs (Cloud Run, Cloud Build, AI Platform)
3. Creates/updates secrets in Google Secret Manager
4. Builds Docker container with Cloud Build
5. Deploys to Cloud Run (us-central1, 2048Mi, 2 CPU)
6. Returns the API URL

#### Windows PowerShell Alternative

On Windows, you can use the PowerShell deployment script:

```powershell
# Set credentials as environment variables first!
$env:GEMINI_API_KEY="your-gemini-api-key"
$env:MONGODB_URI="mongodb+srv://..."

./deploy-windows.ps1
```

**Important**: Always use environment variables with PowerShell scripts. Never hardcode credentials.

**Manual deployment** (if script fails):
```bash
# Create/update secrets
echo -n "YOUR_API_KEY" | gcloud secrets versions add gemini-api-key --data-file=-
echo -n "mongodb+srv://..." | gcloud secrets versions add mongodb-uri --data-file=-

# Build and deploy (using gcr.io, not artifact registry)
cd apps/api
gcloud builds submit . --tag gcr.io/voice-ai-agent-447515/live-interview-api:latest
gcloud run deploy live-interview-api \
  --image gcr.io/voice-ai-agent-447515/live-interview-api:latest \
  --region us-central1 \
  --memory 2048Mi --cpu 2 \
  --timeout 3600s \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest,MONGODB_URI=mongodb-uri:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars NODE_ENV=production,API_PORT=3001,API_HOST=0.0.0.0,CORS_ORIGINS=https://web-taupe-theta-94.vercel.app,http://localhost:3000 \
  --allow-unauthenticated
```

**Important**: Use `gcr.io` (Google Container Registry) instead of Artifact Registry - the `cloud-run-source-deploy` repository may not exist in your project.

**MongoDB Atlas connection string format**:
```
mongodb+srv://username:password@cluster0.8vksczm.mongodb.net/liveaicoachdb?appName=Cluster0
```

### Production Deployment Status

**Current Deployments (as of March 2026):**

| Service | URL | Platform | Status |
|---------|-----|----------|--------|
| Frontend | https://web-taupe-theta-94.vercel.app | Vercel | ✅ Live |
| Backend API | https://live-interview-api-ywh3e45esq-uc.a.run.app | Google Cloud Run | ✅ Live |
| Database | MongoDB Atlas | Cluster connected | ✅ Live |

**E2E Test Results:**
- All 10 core tests passed (health, auth, sessions, profile, etc.)
- Full report: `FINAL-E2E-TEST-REPORT.md`

**Google Cloud Project:** `voice-ai-agent-447515`

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

# ⚠️ IMPORTANT: JWT_SECRET must be exactly 64 characters for production
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TIMEOUT=120000
```

**Security**: Never commit API keys. Use environment variables or secrets managers.

### Required Dependencies (apps/api/package.json)

**Critical for DTOs** - `@nestjs/mapped-types` is required for `PartialType` and `OmitType`:
```json
{
  "dependencies": {
    "@nestjs/mapped-types": "^2.0.0"
  }
}
```

If you see `Cannot find module '@nestjs/mapped-types'`, add it to dependencies.

### Health Module (Simplified)

The health check module at `apps/api/src/health/` has been simplified:
- **No @nestjs/swagger** decorators (removed to reduce dependencies)
- **No @nestjs/terminus** dependency (uses plain NestJS controller)
- Provides three endpoints: `/health`, `/health/live`, `/health/ready`

This is intentional for Cloud Run deployment - the health check must work without additional dependencies.

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

**Cloud Build - Missing @nestjs/mapped-types**:
- Add `"@nestjs/mapped-types": "^2.0.0"` to `apps/api/package.json` dependencies
- This is required for DTOs that use `PartialType` and `OmitType`

**Cloud Build - @nestjs/swagger errors**:
- The health module does not use @nestjs/swagger decorators
- Remove any `@ApiTags`, `@ApiOperation`, etc. decorators from health controllers

**Artifact Registry "Repository not found" error**:
- Use `gcr.io` (Google Container Registry) instead of Artifact Registry
- Example: `gcr.io/voice-ai-agent-447515/live-interview-api:latest`
- The `cloud-run-source-deploy` repository in Artifact Registry may not exist

**Frontend hero section "pop up then vanish"** (FIXED):
- Issue was caused by CSS animation classes setting `opacity: 0` as base state
- Fixed in `apps/web/src/app/globals.css`:
  - Removed `opacity: 0` from `.animate-fade-in-up`, `.animate-fade-in`, `.animate-slide-in-right`
  - Added missing `.animate-pulse-slow` keyframes for hero background gradient
- Animation keyframes already handle opacity transitions, no need for base `opacity: 0`
- For future animations: define initial state in `@keyframes`, not in the class selector

## Key Files Reference

- `apps/api/src/main.ts` - Application bootstrap, middleware setup
- `apps/api/src/app.module.ts` - Root module
- `apps/api/src/modules/websocket/websocket.gateway.ts` - WebSocket handlers
- `apps/api/src/modules/websocket/services/session-manager.service.ts` - Session lifecycle
- `apps/api/src/modules/confidence/confidence.module.ts` - @Global() module pattern
- `apps/web/src/types-shared/` - Inlined shared types for Vercel
- `apps/web/next.config.mjs` - Vercel build configuration
- `deploy.sh` - Google Cloud Run automated deployment
- `deploy-windows.ps1` - Windows PowerShell deployment script
- `apps/api/Dockerfile` - Production container image
- `apps/api/Dockerfile.cloudrun` - Cloud Run optimized Dockerfile
- `FINAL-E2E-TEST-REPORT.md` - Complete E2E test results
