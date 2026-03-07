# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS builder

# Set build arguments
ARG NODE_ENV=development
ARG PORT=3001

# Set environment - use development for build to get devDependencies
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT}

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

# Create app directory
WORKDIR /app

# Copy package files and workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

# Install pnpm
RUN npm install -g pnpm@latest

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile=false

# Copy all source code
COPY . .

# Build application - use turbo which handles workspace properly
RUN pnpm exec turbo run build --filter=@live-ai-coach/api

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
