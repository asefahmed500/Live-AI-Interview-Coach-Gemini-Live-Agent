# ========================================
# Stage 1: Build
# ========================================
FROM node:20-alpine AS builder

# Set build arguments
ARG NODE_ENV=production
ARG PORT=3001

# Set environment
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

# Copy package files
COPY package*.json ./

# Install pnpm
RUN npm install -g pnpm@latest

# Install dependencies (will use root pnpm-lock.yaml if available)
RUN pnpm install --frozen-lockfile=false

# Copy source code
COPY . .

# Build application
RUN pnpm run build

# ========================================
# Stage 2: Production
# ========================================
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache \
    dumb-init \
    openssl

# Set NODE_ENV to production
ENV NODE_ENV=production \
    PORT=3001

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install pnpm
RUN npm install -g pnpm@latest

# Install ONLY production dependencies
RUN pnpm install --prod=false

# Copy built artifacts from builder stage
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port (default for Cloud Run)
EXPOSE ${PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:${PORT}/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
