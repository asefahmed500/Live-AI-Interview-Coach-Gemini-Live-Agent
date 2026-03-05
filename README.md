# Live AI Interview Coach

A production-ready monorepo for a live AI interview coaching application with real-time feedback capabilities.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + TailwindCSS
- **Backend**: NestJS + TypeScript
- **Database**: MongoDB
- **Real-time**: WebSocket (Socket.IO)
- **Future**: Gemini Live API integration
- **Build System**: Turborepo
- **Package Manager**: pnpm
- **Containerization**: Docker

## Project Structure

```
live-ai-interview-coach/
├── apps/
│   ├── web/          # Next.js 14 Frontend
│   └── api/          # NestJS Backend
├── packages/
│   └── shared/       # Shared types, DTOs, and utilities
├── docker/           # Docker configuration
├── docs/             # Documentation
└── docker-compose.yml
```

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- MongoDB (local or via Docker)

## Getting Started

### Installation

```bash
# Install dependencies
pnpm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

### Local Development

```bash
# Start both apps (default ports: web=3000, api=3001)
pnpm dev

# Start only web app
pnpm dev:web

# Start only API
pnpm dev:api
```

### With Docker

```bash
# Start all services in production mode
pnpm docker:up

# Start in development mode (with hot reload)
pnpm docker:dev

# Stop all services
pnpm docker:down
```

## Development Scripts

```bash
# Development
pnpm dev              # Start all apps
pnpm dev:web          # Start web app only
pnpm dev:api          # Start API only

# Building
pnpm build            # Build all packages
pnpm lint             # Lint all packages
pnpm format           # Format code with Prettier

# Docker
pnpm docker:up        # Start production containers
pnpm docker:down      # Stop and remove containers
pnpm docker:dev       # Start development containers
pnpm docker:build     # Build Docker images

# Cleanup
pnpm clean            # Clean build artifacts and node_modules
```

## Application URLs

| Service | URL |
|---------|-----|
| Web App | http://localhost:3000 |
| API     | http://localhost:3001 |
| WebSocket | ws://localhost:3001 |
| MongoDB | mongodb://localhost:27017 |

## API Documentation

See [docs/api.md](docs/api.md) for API endpoints and documentation.

## Architecture

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## Deployment

See [docs/deployment.md](docs/deployment.md) for deployment instructions.

## Features (To Be Implemented)

- [ ] User Authentication (JWT)
- [ ] Session Management
- [ ] Real-time WebSocket Communication
- [ ] AI-powered Interview Feedback
- [ ] Gemini Live API Integration
- [ ] Speech Recognition
- [ ] Session Recording & Playback
- [ ] Analytics Dashboard

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

MIT
