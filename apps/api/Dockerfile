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

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy all package.json files to maintain workspace structure
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile=false

# Copy all source code
COPY . .

# Build application
RUN pnpm install turbo --global && \
    ls -la node_modules/.bin && \
    pnpm turbo run build --filter=@live-ai-coach/api --verbose

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache \
    dumb-init \
    openssl

# Set NODE_ENV to production (PORT is set by Cloud Run)
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm and turbo
RUN npm install -g pnpm@latest turbo@latest

# Install ONLY production dependencies
RUN pnpm install --prod=false

# Copy built artifacts from builder stage (API is in apps/api/dist)
COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port (Cloud Run sets PORT env var)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 3001) + '/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
