# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Live AI Interview Coach** monorepo built with:
- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS (port 3000)
- **Backend**: NestJS + TypeScript + Mongoose (port 3001)
- **Database**: MongoDB (port 27017)
- **Real-time**: WebSocket (Socket.IO) on namespace `/live`
- **Build System**: Turborepo with pnpm workspaces
- **AI Integration**: Google Gemini Live API for interview feedback

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

# Format code
pnpm format             # Format all files
pnpm format:check       # Check formatting without writing
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
jest --coverage        # With coverage (test:cov)
jest --testNamePattern="test name"  # Run specific test
jest --config ./test/jest-e2e.json  # Run e2e tests (test:e2e)

# Alternative: Run directly with ts-node (useful for debugging)
npx ts-node src/main.ts
```

### Docker Commands
```bash
# Production containers
pnpm docker:up         # Start all services
pnpm docker:down       # Stop all services

# Development containers (with hot reload)
pnpm docker:dev

# Build images
pnpm docker:build
```

## Critical Build Configuration

### TypeScript Configuration Issues & Solutions

**Problem**: `Error: Cannot find module 'dist/main'` or TypeScript including dist folder in compilation

**Solution**: The `apps/api/tsconfig.json` must have explicit include/exclude patterns:
```json
{
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.spec.ts", "**/*.test.ts"]
}
```

**Critical**: When build fails with TS5055 errors (overwrite input files), delete `*.tsbuildinfo` files:
```bash
cd apps/api
rm -f tsconfig.tsbuildinfo apps/api/tsconfig.tsbuildinfo
npx tsc -p tsconfig.json
```

**Key settings in `apps/api/tsconfig.json`**:
- `"moduleResolution": "node"` - Required for commonjs modules
- `"incremental": true` - Faster builds, but can cause stale .tsbuildinfo issues
- `"noEmitOnError": false` - Allows seeing all compilation errors
- `"outDir": "./dist"` - Explicit output directory
- `"rootDir": "./src"` - Explicit source directory

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
│   ├── api/              # NestJS backend
│   └── web/              # Next.js frontend
├── packages/
│   └── shared/           # Shared types, DTOs, constants
├── docker/               # Docker configuration
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
└── confidence/         # Confidence scoring engine

**Common utilities** (`common/` directory):
- `decorators/` - Custom decorators (e.g., @CurrentUser)
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
    // NO forwardRef(() => WebSocketModule) needed
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

// Always null-check before using optional dependencies
if (!this.sessionManager) {
  throw new Error('SessionManagerService is not available');
}
```

**Pattern for SessionManagerService with optional GeminiService**:
```typescript
constructor(@Optional() private readonly geminiService?: GeminiService) {}

async createSession(...) {
  if (!this.geminiService) {
    throw new Error('GeminiService is not available');
  }
  return await this.geminiService.createSession(...);
}
```

### WebSocket Architecture

**Namespace**: `/live`

**Client → Server Events**:
- `start_session` - Initialize interview session
- `audio_chunk` - Stream audio data for processing
- `frame_analysis` - Analyze video frames for confidence
- `interrupt` - Interrupt current AI response
- `stop_session` - End interview session

**Server → Client Events**:
- `connection_established` - Connection confirmed
- `server_ready` - Server is ready to accept connections
- `session_started` - Session initialized
- `audio_received` - Audio chunk acknowledged
- `transcript_partial` - Streaming AI response text
- `ai_response` - Complete AI response
- `confidence_update` - Real-time confidence score (eyeContact, posture, engagement)
- `frame_processed` - Frame analysis complete
- `interrupt_ack` - Interrupt acknowledged
- `feedback_generated` - Final feedback report generated
- `session_ended` - Session terminated
- `error` - Error with code (SESSION_NOT_FOUND, QUOTA_EXCEEDED, etc.)

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
├── chat/               # Streaming message components
├── interview/          # Interview area (main feature)
└── layout/             # Header, sidebars
```

**Key frontend patterns**:
- Server Components by default (no `'use client'` directive)
- Client Components for interactive features (WebSocket, camera, audio)
- Zustand for state management (`store/` directory)
- Socket.IO client for WebSocket connection
- Framer Motion for animations
- Lucide React for icon set

**Design System**:
- Light theme with OKLCH colors
- Background: `oklch(1.00 0 0)` (white), Dashboard: `oklch(0.985 0 0)`
- Primary buttons: `oklch(0.205 0 0)` with white text
- Utility classes in `globals.css`: `.glass`, `.glass-strong`, `.text-gradient-brand`, `.surface-card`
- Tailwind config extended with custom colors

### Shared Package (packages/shared)

Contains TypeScript types and DTOs shared between frontend and backend:
- `types/auth.types.ts` - User, token types
- `types/session.types.ts` - Session, message types
- `types/websocket.types.ts` - WebSocket event types
- `dtos/*.dto.ts` - Validation DTOs with class-validator
- `constants/index.ts` - API routes, WebSocket events, session status
- `utils/` - Shared utility functions

**Note**: When adding types to shared package, run `pnpm run build` in the shared package directory to compile TypeScript.

## Important Configuration

### Environment Variables (.env)

Required variables (see `.env.example`):
```bash
# Application
NODE_ENV=development

# API
API_PORT=3001
API_HOST=0.0.0.0
API_PREFIX=api
MONGODB_URI=mongodb://localhost:27017/live-interview-coach

# CORS (comma-separated)
CORS_ORIGINS=http://localhost:3000,http://localhost:3001

# Authentication
JWT_SECRET=your-secret-key-change-this-in-production
JWT_EXPIRATION=7d

# Rate Limiting
THROTTLE_TTL=60000      # 60 seconds
THROTTLE_LIMIT=100      # 100 requests per TTL

# Gemini API
GEMINI_API_KEY=your-gemini-api-key
GEMINI_TIMEOUT=120000
```

### NestJS-Specific Configuration

**main.ts bootstrap order**:
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

**Graceful Shutdown** (main.ts):
- Handles SIGTERM and SIGINT signals
- Closes connections gracefully with logging
- Handles uncaught exceptions and unhandled promise rejections

**Database Connection** (app.module.ts):
- Mongoose with auto-timestamp plugin
- Connection event logging
- ConnectionFactory plugin registration

**nest-cli.json**:
- `"webpack": false` - Disables Webpack, uses TypeScript compiler directly
- `"deleteOutDir": true` - Cleans dist folder before build

## Port Configuration

| Service | Port | URL |
|---------|------|-----|
| Web App | 3000 | http://localhost:3000 |
| API | 3001 | http://localhost:3001/api |
| WebSocket | 3001 | ws://localhost:3001/live |
| MongoDB | 27017 | mongodb://localhost:27017 |

**Important**: If Next.js can't use port 3000, it will try 3001, causing conflicts. Kill conflicting processes:
```bash
netstat -ano | findstr :3001
taskkill //PID <pid> //F
```

## Database Collections

- **users** - Authentication and user profiles
- **sessions** - Interview session tracking
- **messages** - Chat history per session
- **feedback** - Generated feedback reports

## Mongoose Schema Best Practices

When defining fields with `unique: true` in the `@Prop()` decorator, do NOT also add `index: true`. The `unique` property automatically creates an index.

```typescript
// ✓ Correct
@Prop({ type: String, required: true, unique: true, lowercase: true })
email: string;

// ✗ Wrong - causes duplicate index warning
@Prop({ type: String, required: true, unique: true, index: true })
email: string;
```

## Common Development Tasks

### Adding a New Backend Module

```bash
# Generate module with NestJS CLI
cd apps/api
nest g module modules/feature-name
nest g service modules/feature-name
nest g controller modules/feature-name

# Create DTOs
mkdir -p src/modules/feature-name/dto
# Create *.dto.ts files with class-validator decorators
```

### Adding a New Frontend Component

```bash
# Create component in appropriate directory
# apps/web/src/components/{category}/{component-name}.tsx

# Use client directive for interactive components
'use client';

# Import from shared package
import { SomeType } from '@live-ai-coach/shared';

# Use design system classes
className="card surface-card"
style={{ background: 'oklch(1.00 0 0)' }}
```

### Running Specific Tests

```bash
# API tests
cd apps/api
jest -- src/modules/auth/auth.service.spec.ts
jest --testPathPattern=websocket

# Watch mode for rapid development
jest --watch --testNamePattern="should create session"
```

## WebSocket Event Flow

### Starting a Session
1. Client emits `start_session` with job description, mode, difficulty
2. Server creates Gemini session via SessionManager
3. Client joins `session:{sessionId}` room
4. Server emits `session_started` with initial AI greeting

### Audio Streaming
1. Client emits `audio_chunk` with base64-encoded audio data
2. Server buffers if already streaming, otherwise processes immediately
3. Server streams to Gemini API
4. Server emits `transcript_partial` for each response chunk
5. Server emits `ai_response` when complete
6. Server emits `audio_received` acknowledgment

### Frame Analysis
1. Client emits `frame_analysis` with base64-encoded frame data
2. Server analyzes with Gemini Vision API
3. Server calculates weighted confidence score
4. Server emits `confidence_update` with breakdown (eyeContact, posture, engagement)
5. Server emits `frame_processed` acknowledgment

### Stopping a Session
1. Client emits `stop_session` with generateReport flag
2. Server leaves room, generates final feedback if requested
3. Server closes session via SessionManager
4. Server unregisters from confidence engine
5. Server emits `session_ended`

## Error Handling

### WebSocket Error Codes
- `SESSION_NOT_FOUND` - Session does not exist
- `SESSION_INACTIVE` - Session is not active
- `SESSION_MISMATCH` - Session belongs to different client
- `QUOTA_EXCEEDED` - Gemini API quota exceeded
- `SAFETY_VIOLATION` - Content safety violation
- `INTERRUPTED` - Session was interrupted
- `MAX_RETRIES_EXCEEDED` - Too many retry attempts

### Exception Types
- `GeminiException` - Base Gemini error
- `GeminiQuotaException` - API quota exceeded (429)
- `GeminiSafetyException` - Content safety violation (400)
- `GeminiInterruptedException` - User interrupted
- `GeminiApiKeyException` - Invalid API key

## Key Files to Reference

- `apps/api/src/main.ts` - Application bootstrap, middleware setup
- `apps/api/src/app.module.ts` - Root module, imports all feature modules
- `apps/api/tsconfig.json` - TypeScript configuration with include/exclude patterns
- `apps/api/nest-cli.json` - Nest CLI config (webpack: false)
- `apps/api/src/modules/websocket/websocket.gateway.ts` - WebSocket event handlers
- `apps/api/src/modules/websocket/services/session-manager.service.ts` - Session lifecycle management
- `apps/api/src/modules/confidence/confidence.module.ts` - @Global() module pattern
- `packages/shared/src/constants/index.ts` - Shared constants
- `turbo.json` - Build pipeline configuration
- `docker-compose.yml` - Container orchestration
