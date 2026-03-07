# ========================================
# Stage: Production
# ========================================
FROM node:20-slim

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

# Copy root manifest and lockfile
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy only API manifest
COPY apps/api/package.json ./apps/api/

# Install ONLY production dependencies in the container (Linux)
RUN pnpm install --prod --frozen-lockfile=false

# Copy PRE-BUILT artifacts from local context
# Ensure you ran 'pnpm --filter=@live-ai-coach/api build' before building this image
COPY apps/api/dist ./dist

# Create logs directory
RUN mkdir -p /app/logs

# Cloud Run sets the PORT environment variable
EXPOSE 8080

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
