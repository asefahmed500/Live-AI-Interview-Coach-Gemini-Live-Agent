# Google Cloud Run Deployment Configuration

## Prerequisites

1. Google Cloud Project with billing enabled
2. Google Cloud SDK installed
3. MongoDB Atlas account (or Cloud Firestore)

## Deployment Steps

### 1. Enable Required APIs

```bash
# Set your project
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com
```

### 2. Create Application Default Credentials

```bash
gcloud auth application-default login
```

### 3. Build and Deploy API

```bash
cd apps/api

# Build the container image
gcloud builds submit \
  --tag gcr.io/YOUR_PROJECT_ID/live-interview-api \
  --project YOUR_PROJECT_ID \
  --region us-central1

# Deploy to Cloud Run
gcloud run deploy live-interview-api \
  --image gcr.io/YOUR_PROJECT_ID/live-interview-api \
  --platform managed \
  --region us-central1 \
  --memory 2048Mi \
  --cpu 2 \
  --max-instances 10 \
  --min-instances 1 \
  --timeout 3600s \
  --concurrency 10 \
  --set-env-vars \
    GEMINI_API_KEY=$GEMINI_API_KEY,\
    MONGODB_URI=$MONGODB_URI,\
    NODE_ENV=production,\
    API_PORT=3001,\
    API_HOST=0.0.0.0
```

### 4. Get the Service URL

```bash
gcloud run services describe live-interview-api \
  --region us-central1 \
  --format 'value(status.url)'
```

### 5. Update Frontend Environment Variables

Update `apps/web/.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://YOUR_SERVICE_URL
NEXT_PUBLIC_WS_URL=wss://YOUR_SERVICE_URL
```

### 6. Deploy Frontend (Vercel recommended)

```bash
cd apps/web
vercel deploy --prod
```

---

## Dockerfile (Production)

```dockerfile
# Multi-stage build for optimization
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=builder /app/dist ./dist

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start application
CMD ["node", "dist/main.js"]
```

---

## Cloud Build Configuration

```yaml
# cloudbuild.yaml
steps:
  # Build the container image
  - name: 'Build Container Image'
    args: ['build']
    id: 'build-image'
  # Push the container image
  - name: 'Push Container Image'
    id: 'push-image'
    args: ['push-image']

images:
  - 'gcr.io/$PROJECT_ID/live-interview-api'

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8GB'

timeout: 1200s
```

---

## Environment Variables Setup

```bash
# Set secrets in Google Secret Manager
gcloud secrets create gemini-api-key "YOUR_API_KEY"
gcloud secrets create mongodb-uri "mongodb+srv://..."

# Grant access to Cloud Run
gcloud secrets add-iam-policy-binding gemini-api-key \
  --member="serviceAccount:PROJECT_ID-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding mongodb-uri \
  --member="serviceAccount:PROJECT_ID-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## Production Deployment Script

```bash
#!/bin/bash
# deploy.sh - Automated deployment script

set -e

PROJECT_ID="YOUR_PROJECT_ID"
REGION="us-central1"
SERVICE_NAME="live-interview-api"

echo "🚀 Deploying Live AI Interview Coach to Google Cloud Run..."

# Build and deploy
gcloud builds submit \
  --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
  --project "${PROJECT_ID}"

gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
  --platform managed \
  --region "${REGION}" \
  --memory 2048Mi \
  --cpu 2 \
  --timeout 3600s \
  --concurrency 80 \
  --set-secrets GEMINI_API_KEY=gemini-api-key,MONGODB_URI=mongodb-uri \
  --set-env-vars NODE_ENV=production,API_PORT=3001,API_HOST=0.0.0.0 \
  --allow-unauthenticated

echo "✅ Deployment complete!"
gcloud run services describe "${SERVICE_NAME}" --region "${REGION}" --format 'value(status.url)'
```

---

## Monitoring & Logging

```bash
# View logs
gcloud run logs tail live-interview-api --region us-central1

# Enable Cloud Monitoring
gcloud beta run services update live-interview-api \
  --region us-central1 \
  --update-labels=deployment_date=$(date +%Y%m%d)

# Set up alerting
gcloud alpha monitoring policies create \
  --policy-file monitoring-policy.yaml
```

---

## Infrastructure as Code (Terraform)

```hcl
# main.tf
terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_cloud_run_service" "live_interview_api" {
  name     = "live-interview-api"
  location = var.region

  template {
    spec {
      containers {
        image = "gcr.io/${var.project_id}/live-interview-api"

        env {
          name  = "NODE_ENV"
          value = "production"
        }

        env {
          name  = "API_PORT"
          value = "3001"
        }

        resources {
          limits = {
            cpu    = "2"
            memory = "2048Mi"
          }
        }
      }

      scaling {
        min_instances = 1
        max_instances = 10
      }
    }
  }

  traffic {
    percent = 100
  }
}
```

---

## Service Account Setup

```bash
# Create service account
gcloud iam service-accounts create live-interview-coach \
  --display-name "Live Interview Coach Service Account"

# Grant roles
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:live-interview-coach@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/run.invoker"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:live-interview-coach@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:live-interview-coach@PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

---

## Cost Optimization

```bash
# Set minimum instances to 0 for cost savings
gcloud run services update live-interview-api \
  --region us-central1 \
  --min-instances 0

# Set maximum instances for cost control
gcloud run services update live-interview-api \
  --region us-central1 \
  --max-instances 5
```

---

## Troubleshooting

### Service not starting
```bash
gcloud run logs tail live-interview-api --region us-central1
```

### Environment variables not loading
```bash
gcloud run services describe live-interview-api \
  --region us-central1 --format_yaml
```

### Memory issues
```bash
# Increase memory
gcloud run services update live-interview-api \
  --region us-central1 --memory 4096Mi
```

---

**🎯 Quick Deploy Command:**

```bash
bash deploy/deploy.sh
```
