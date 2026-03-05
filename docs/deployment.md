# Deployment Guide

## Prerequisites

- Docker and Docker Compose installed
- A server with at least 2GB RAM
- Domain name (optional)
- SSL certificate (recommended for production)

## Environment Variables

Create a `.env` file with the following variables:

```env
# MongoDB
MONGODB_URI=mongodb://mongo:27017/live-interview-coach

# API
API_PORT=3001
API_URL=https://api.yourdomain.com

# Web
WEB_PORT=3000
WEB_URL=https://yourdomain.com

# WebSocket
WS_PORT=3001
WS_URL=wss://api.yourdomain.com

# Auth
JWT_SECRET=your-secure-random-secret-key-here
JWT_EXPIRATION=7d

# Gemini API (for future integration)
GEMINI_API_KEY=your-gemini-api-key

# Node
NODE_ENV=production
```

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### Build and Start

```bash
# Build images
pnpm docker:build

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

#### Docker Compose Profiles

```bash
# Production (default)
docker-compose --profile prod up -d

# Development (with hot reload)
docker-compose --profile dev up -d
```

### Option 2: Manual Deployment

#### 1. Database (MongoDB)

```bash
docker run -d \
  --name mongodb \
  -p 27017:27017 \
  -v mongo-data:/data/db \
  -e MONGO_INITDB_DATABASE=live-interview-coach \
  mongo:7.0
```

#### 2. API (NestJS)

```bash
cd apps/api
pnpm install
pnpm build
NODE_ENV=production pnpm start:prod
```

#### 3. Web (Next.js)

```bash
cd apps/web
pnpm install
pnpm build
pnpm start
```

### Option 3: Cloud Deployment

#### Vercel (Frontend Only)

1. Connect your repository to Vercel
2. Set root directory to `apps/web`
3. Configure environment variables
4. Deploy

```bash
# Local build test
cd apps/web
pnpm build
```

#### AWS EC2

1. Launch EC2 instance (Ubuntu 22.04 recommended)
2. Install Docker and Docker Compose
3. Clone repository
4. Configure environment variables
5. Run `docker-compose up -d`

#### DigitalOcean App Platform

1. Create new app
2. Connect repository
3. Configure build settings
4. Add environment variables
5. Deploy

#### Railway

1. Create new project
2. Deploy MongoDB from marketplace
3. Deploy API (NestJS)
4. Deploy Web (Next.js)
5. Configure environment variables

## Nginx Reverse Proxy

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/live-interview-coach

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API (NestJS)
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Enable Configuration

```bash
sudo ln -s /etc/nginx/sites-available/live-interview-coach /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt update
sudo apt install certbot python3-certbot-nginx

# Generate certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (configured automatically)
sudo certbot renew --dry-run
```

## Monitoring

### Health Checks

```bash
# API Health
curl https://api.yourdomain.com/health

# Web Health
curl https://yourdomain.com/
```

### Logs

```bash
# Docker logs
docker-compose logs -f

# Specific service
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f mongo
```

### PM2 (Alternative Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start API
cd apps/api
pm2 start dist/main.js --name live-interview-coach-api

# Start Web
cd apps/web
pm2 start npm --name live-interview-coach-web -- start

# Save PM2 config
pm2 save
pm2 startup
```

## Backup Strategy

### MongoDB Backup

```bash
# Manual backup
docker exec mongodb mongodump --out /data/backup

# Automated backup cron job
0 2 * * * docker exec mongodb mongodump --out /data/backup/$(date +\%Y\%m\%d)
```

### Environment Variables Backup

```bash
# Backup .env file
cp .env .env.backup
```

## Scaling Considerations

### Horizontal Scaling

1. **Load Balancer**: Use Nginx or cloud load balancer
2. **Multiple API instances**: Deploy multiple API containers
3. **Session storage**: Use Redis for session management
4. **MongoDB Replica Set**: For high availability

### Vertical Scaling

1. Increase server resources (CPU, RAM)
2. Optimize database queries
3. Enable caching

## Security Checklist

- [ ] Change default JWT_SECRET
- [ ] Enable HTTPS/SSL
- [ ] Configure CORS properly
- [ ] Set up firewall rules
- [ ] Enable rate limiting
- [ ] Implement request logging
- [ ] Regular security updates
- [ ] Use environment-specific API keys
- [ ] Disable debug mode in production

## Troubleshooting

### Common Issues

**Port already in use:**
```bash
# Find process using port
lsof -i :3000
kill -9 <PID>
```

**MongoDB connection failed:**
```bash
# Check MongoDB status
docker-compose ps mongo
docker-compose logs mongo
```

**Build failures:**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

### Debug Mode

```bash
# Run in debug mode
NODE_ENV=development docker-compose up
```

## Rollback

```bash
# Stop services
docker-compose down

# Restore previous version
git checkout <previous-commit-tag>
docker-compose up -d --build
```

## Maintenance

### Updates

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose build
docker-compose up -d
```

### Database Migrations

```bash
# Run migrations (to be implemented)
pnpm run migrate
```
