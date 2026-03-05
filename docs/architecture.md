# Architecture Documentation

## System Overview

The Live AI Interview Coach is a monorepo application following a modular architecture pattern.

```
┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │
│   Next.js Web   │◄────────┤   NestJS API    │
│   (Port 3000)   │  HTTP   │   (Port 3001)   │
│                 │         │                 │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │ WebSocket                 │
         │                           │
         └───────────────────────────┘
                           │
                           ▼
                  ┌─────────────────┐
                  │                 │
                  │    MongoDB      │
                  │   (Port 27017)  │
                  │                 │
                  └─────────────────┘
```

## Frontend Architecture (Next.js 14)

### Directory Structure

```
apps/web/src/
├── app/                    # App Router pages
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── features/         # Feature-specific components
│   └── layouts/          # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities & clients
│   ├── api.ts            # API client
│   └── websocket.ts      # WebSocket client
├── services/             # Frontend services
└── styles/               # Global styles
```

### Key Patterns

- **App Router**: Using Next.js 14 App Router for file-based routing
- **Server Components**: Leveraging React Server Components by default
- **Client Components**: Marked with `'use client'` directive where needed
- **API Client**: Centralized API communication via `lib/api.ts`
- **WebSocket Client**: Real-time communication via `lib/websocket.ts`

## Backend Architecture (NestJS)

### Directory Structure

```
apps/api/src/
├── modules/              # Feature modules
│   ├── auth/            # Authentication module
│   ├── sessions/        # Session management module
│   ├── feedback/        # Feedback module
│   └── websocket/       # WebSocket gateway
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── filters/         # Exception filters
│   ├── guards/          # Auth guards
│   ├── interceptors/    # Response interceptors
│   └── pipes/           # Validation pipes
├── config/              # Configuration
├── database/            # MongoDB connection
├── main.ts              # Application entry point
└── app.module.ts        # Root module
```

### Module Pattern

Each feature follows NestJS's module pattern:

```typescript
// Feature module structure
feature/
├── feature.module.ts    # Module definition
├── feature.controller.ts # HTTP endpoints
├── feature.service.ts    # Business logic
├── dto/                  # Data Transfer Objects
└── schemas/              # Mongoose schemas
```

### Key Patterns

- **Modular Architecture**: Each feature is a self-contained module
- **Dependency Injection**: NestJS DI for loose coupling
- **Guards**: Route-level authentication/authorization
- **Interceptors**: Response transformation
- **Filters**: Global exception handling
- **Pipes**: Request validation

## Shared Package

The `@live-ai-coach/shared` package contains:

```
packages/shared/src/
├── types/              # TypeScript types
│   ├── auth.types.ts   # Auth-related types
│   ├── session.types.ts # Session types
│   └── websocket.types.ts # WebSocket types
├── dtos/               # Data Transfer Objects
│   ├── auth.dto.ts
│   ├── session.dto.ts
│   └── feedback.dto.ts
├── constants/          # Shared constants
└── utils/              # Utility functions
```

## WebSocket Communication

### Events Flow

```
Client                    Server
  │                         │
  ├────── join_session ────→│
  │←────── connected ───────┤
  │                         │
  ├────── start_session ───→│
  │←──── session_started ───┤
  │                         │
  ├───── send_message ─────→│
  │←── message_received ────┤
  │                         │
  ├────── end_session ─────→│
  │←──── session_ended ─────┤
```

### Events

See `packages/shared/src/constants/index.ts` for all WebSocket events.

## Database Schema

### Collections

#### Users
```typescript
{
  _id: ObjectId,
  email: string,
  passwordHash: string,
  name: string,
  createdAt: Date,
  updatedAt: Date
}
```

#### Sessions
```typescript
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,
  status: 'idle' | 'active' | 'paused' | 'completed',
  startedAt?: Date,
  completedAt?: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Messages
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,
  role: 'user' | 'assistant' | 'system',
  content: string,
  timestamp: Date
}
```

#### Feedback
```typescript
{
  _id: ObjectId,
  sessionId: ObjectId,
  type: 'speech' | 'content' | 'confidence' | 'clarity',
  score: number,
  message: string,
  suggestions: string[],
  createdAt: Date
}
```

## Data Flow

### Authentication Flow

```
┌──────┐      ┌──────┐      ┌──────┐
│ Web  │─────►│ API  │─────►│ DB   │
└──────┘      └──────┘      └──────┘
  │            │
  │            ├─ JWT Token
  │            │
  └────────────┘
   Session Store
```

### Session Flow

```
┌──────┐      ┌──────┐      ┌──────┐
│ Web  │◄────►│ API  │◄────►│ DB   │
└──────┘      └──────┘      └──────┘
               │
               ├─► WebSocket
               │   Gateway
               │
               └─► Gemini (future)
```

## Security Considerations

- JWT-based authentication
- CORS configuration
- Input validation with class-validator
- Password hashing (bcrypt)
- Environment variable management
- Docker container isolation

## Scalability Considerations

- Stateless API design
- MongoDB indexing
- WebSocket connection pooling
- Docker orchestration ready
- CDN-ready static assets
- API versioning capability
