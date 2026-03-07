# ========================================
# Stage 1: Build
# ========================================
FROM node:20-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy root manifest and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all package manifests to maintain workspace structure for install
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile=false

# Copy all source code
COPY . .

# Build application using local turbo binary to avoid path issues
RUN ./node_modules/.bin/turbo run build --filter=@live-ai-coach/api --verbose

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-slim AS production

# Install production dependencies
RUN apt-get update && apt-get install -y \
    dumb-init \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Set NODE_ENV to production
ENV NODE_ENV=production

WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate

# Copy manifests needed for production install
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/

# Install ONLY production dependencies
RUN pnpm install --prod --frozen-lockfile=false

# Copy built artifacts from builder stage (API is in apps/api/dist)
# We copy them to the current WORKDIR (/app)
COPY --from=builder /app/apps/api/dist ./dist

# Create a simple main entry point if needed, or just run node dist/main
# Ensure logs directory exists
RUN mkdir -p /app/logs

# Cloud Run sets the PORT environment variable
EXPOSE 8080

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
