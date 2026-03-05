# Google Cloud Run Deployment Guide

This guide explains how to deploy the Live Interview Coach API to Google Cloud Run with MongoDB Atlas.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Setup](#project-setup)
3. [MongoDB Atlas Configuration](#mongodb-atlas-configuration)
4. [Secret Management](#secret-management)
5. [IAM Setup](#iam-setup)
6. [Building](#building)
7. [Deploying](#deploying)
8. [Vertex AI Setup](#vertex-ai-setup)
9. [Monitoring](#monitoring)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

```bash
# Install Google Cloud SDK
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Verify installation
gcloud --version
```

### Enable Required APIs

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable APIs
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com
```

---

## Project Setup

### 1. Create or Select Project

```bash
# Create new project
gcloud projects create $PROJECT_ID \
  --name="Live Interview Coach" \
  --organization=YOUR_ORG_ID

# Or select existing project
gcloud config set project $PROJECT_ID
```

### 2. Enable Billing

```bash
# Open billing page
xdg-open "https://console.cloud.google.com/billing/projects?project=$PROJECT_ID"
```

---

## MongoDB Atlas Configuration

### 1. Create MongoDB Atlas Account

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account (M0 cluster is free)

### 2. Create Cluster

```bash
# After creating account, create a cluster:
# - Choose: M0 Free Tier (or higher for production)
# - Region: Choose closest to your Cloud Run region
# - Cluster Name: live-interview-coach
```

### 3. Configure Network Access

1. Navigate to: **Security** → **Network Access**
2. Add IP Access List:
   - **Option A:** Allow all IPs (0.0.0.0/0) for development
   - **Option B:** Use VPC peering for production (recommended)

```bash
# For Cloud Run, you need to:
# 1. Set up Serverless VPC Access
# 2. Configure private IP access for Atlas

# Or allow public access (simpler for starting):
# Add IP: 0.0.0.0/0
```

### 4. Create Database User

1. Navigate to: **Security** → **Database Access**
2. Add new user:
   - **Username:** `live-interview-app`
   - **Password:** Generate a strong password
   - **Privileges:** Read and write to any database

### 5. Get Connection String

1. Navigate to: **Database** → **Connect**
2. Choose "Connect your application"
3. Select Node.js version
4. Copy connection string:

```
mongodb+srv://live-interview-app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
```

### 6. Whitelist Your Database

In MongoDB Atlas, create the database:

```javascript
use live_interview_coach;

// Create collections
db.createCollection("interviewsessions");
db.createCollection("users");
db.createCollection("feedback");

// Create indexes
db.interviewsessions.createIndex({ sessionId: 1 }, { unique: true });
db.interviewsessions.createIndex({ createdAt: -1 });
db.interviewsessions.createIndex({ lastActivityAt: -1 });
```

---

## Secret Management

Store sensitive values in Google Secret Manager:

```bash
# MongoDB URI
echo -n "mongodb+srv://user:pass@cluster.mongodb.net/db" | \
  gcloud secrets create mongodb-uri --data-file=-

# Gemini API Key
echo -n "AIza..." | \
  gcloud secrets create gemini-api-key --data-file=-

# JWT Secret
openssl rand -base64 64 | \
  gcloud secrets create jwt-secret --data-file=-

# Optional: Vertex AI Location
echo -n "projects/$PROJECT_ID/locations/us-central1" | \
  gcloud secrets create vertex-ai-location --data-file=-

# List secrets
gcloud secrets list

# Access secret (for testing)
gcloud secrets versions access latest --secret=jwt-secret
```

---

## IAM Setup

### Grant Required Roles to Compute Service Account

```bash
# Get project number
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
COMPUTE_EMAIL="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Grant roles
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/logging.logWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/monitoring.metricWriter"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/aiplatform.user"
```

### Grant Access to Specific Users

```bash
# Grant Cloud Run Admin
EMAIL="your-email@example.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$EMAIL" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="user:$EMAIL" \
  --role="roles/cloudbuild.builds.builder"
```

---

## Building

### Build with Cloud Build

```bash
# From repository root
cd D:/laic

# Build and push to Artifact Registry
export REGION="us-central1"
export SERVICE_NAME="live-interview-api"
export PROJECT_ID="your-project-id"

# Submit build
gcloud builds submit \
  --tag "us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME" \
  --timeout=20m \
  --project=$PROJECT_ID \
  ./apps/api

# Or use cloudbuild.yaml for more control
gcloud builds submit --config ./apps/api/cloudbuild.yaml ./apps/api
```

### Build Locally (for testing)

```bash
cd apps/api

# Build Docker image locally
docker build -t live-interview-api .

# Test locally
docker run -p 3001:3001 \
  -e MONGODB_URI="mongodb+srv://..." \
  -e GEMINI_API_KEY="AIza..." \
  -e JWT_SECRET="..." \
  live-interview-api
```

---

## Deploying

### Deploy Command

```bash
# Set variables
export PROJECT_ID="your-project-id"
export REGION="us-central1"
export SERVICE_NAME="live-interview-api"

# Deploy
gcloud run deploy $SERVICE_NAME \
  --image="us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$SERVICE_NAME" \
  --platform=managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port=3001 \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=100 \
  --min-instances=0 \
  --timeout=300s \
  --concurrency=80 \
  --ingress=all \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="CORS_ORIGINS=https://your-domain.com" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets="JWT_SECRET=jwt-secret:latest" \
  --execution-environment=gen2 \
  --no-cpu-throttling \
  --project=$PROJECT_ID
```

### Using the Deployment Script

```bash
# Make script executable
chmod +x apps/api/deploy-cloudrun.sh

# Deploy with all options
./apps/api/deploy-cloudrun.sh \
  --project your-project-id \
  --region us-central1 \
  --service live-interview-api \
  --env production \
  --enable-vertex-ai \
  --setup-iam \
  --create-secrets
```

---

## Vertex AI Setup

Vertex AI uses the same Gemini API but through Google's managed service.

### Enable Vertex AI API

```bash
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
```

### Configure Environment

Add to your deployment:

```bash
--set-env-vars="VERTEX_AI_LOCATION=projects/$PROJECT_ID/locations/us-central1" \
--set-env-vars="VERTEX_AI_MODEL=gemini-2.0-flash-exp"
```

### IAM Requirements

The Compute Service Account needs:

```bash
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/aiplatform.user"
```

### Update Code for Vertex AI

The code automatically detects if `VERTEX_AI_LOCATION` is set and uses Vertex AI instead of the public Gemini API:

```typescript
// In gemini.service.ts
const useVertexAI = !!process.env.VERTEX_AI_LOCATION;

if (useVertexAI) {
  // Use Vertex AI endpoint
  const location = process.env.VERTEX_AI_LOCATION;
  const model = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`;
}
```

---

## Monitoring

### View Logs

```bash
# Tail logs
gcloud logs tail /run.googleapis.com/$SERVICE_NAME \
  --project=$PROJECT_ID \
  --region=$REGION \
  --filter="resource.labels.service_name=$SERVICE_NAME"

# View recent logs
gcloud logging read "resource.labels.service_name=$SERVICE_NAME" \
  --project=$PROJECT_ID \
  --limit=50 \
  --format="table(timestamp, severity, textPayload)"
```

### Set Up Error Reporting

```bash
# Errors are automatically logged to Cloud Logging
# View in Console:
xdg-open "https://console.cloud.google.com/errors?project=$PROJECT_ID"
```

### Create Alert Policies

```bash
# Go to Monitoring
xdg-open "https://console.cloud.google.com/monitoring?project=$PROJECT_ID"

# Create alerts for:
# - Error rate > 1%
# - Response time > 1s
# - 5xx errors > 0
# - Instance count (scale monitoring)
```

### Cloud Run Metrics

```bash
# Get service metrics
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="yaml(status)" \
  --project=$PROJECT_ID

# View instance count
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="value(status.latestReadyRevisionCount)" \
  --project=$PROJECT_ID
```

---

## Environment Variables

### Production Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | Yes | MongoDB Atlas connection string | `mongodb+srv://...` |
| `GEMINI_API_KEY` | Yes | Gemini API key | `AIza...` |
| `JWT_SECRET` | Yes | JWT signing secret | Generate with `openssl` |
| `CORS_ORIGINS` | Yes | Allowed frontend origins | `https://example.com` |
| `NODE_ENV` | No | Environment (default: production) | `production` |
| `PORT` | No | Container port (default: 3001) | `3001` |
| `VERTEX_AI_LOCATION` | No | Vertex AI location for enterprise | `projects/...` |

### Optional Variables

```bash
# API Configuration
API_PREFIX=api

# Rate Limiting
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# Logging
LOG_LEVEL=info
GEMINI_ENABLE_LOGGING=true
GEMINI_ENABLE_METRICS=true

# Feature Flags
ENABLE_VERTEX_AI=false
```

---

## Scaling Configuration

### Recommended Settings for Production

```bash
# Memory and CPU
--memory=1Gi              # Increase to 1GB for production
--cpu=2                   # 2 vCPUs
--max-instances=1000      # Max instances
--min-instances=1         # Keep 1 instance warm
--timeout=300s            # 5 minute timeout

# Concurrency
--concurrency=60          # Requests per instance
--cpu-throttling          # Remove for consistent performance

# Networking
--ingress=all             # Allow public and internal traffic
--vpc-egress=private      # Private IP egress only

# Execution
--execution-environment=gen2  # Use 2nd gen for better performance
```

### Scaling Based on CPU

```bash
gcloud run services update $SERVICE_NAME \
  --region=$REGION \
  --cpu-throttling \
  --max-instances=100 \
  --min-instances=0 \
  --project=$PROJECT_ID
```

---

## Troubleshooting

### Health Check Failing

```bash
# Check logs
gcloud logs tail "projects/$PROJECT_ID/logs/run.googleapis.com%2F%2Fvarlog%2Fsystem"

# Common issues:
# 1. MongoDB connection timeout - Check Atlas whitelist
# 2. Port mismatch - Ensure PORT env var is set to 3001
# 3. Missing secrets - Verify secrets are accessible
```

### Database Connection Issues

```bash
# Test MongoDB connection from local
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/db" --eval "db.stats()"

# Check Atlas Network Access
# Go to: MongoDB Atlas → Security → Network Access

# Check for IP restrictions
# Cloud Run IPs are dynamic; use VPC peering for private access
```

### Cold Start Issues

```bash
# Enable min instances
gcloud run services update $SERVICE_NAME \
  --min-instances=1 \
  --region=$REGION \
  --project=$PROJECT_ID

# Use Gen2 for faster cold starts
gcloud run services update $SERVICE_NAME \
  --execution-environment=gen2 \
  --region=$REGION \
  --project=$PROJECT_ID

# Increase memory (faster startup)
gcloud run services update $SERVICE_NAME \
  --memory=1Gi \
  --region=$REGION \
  --project=$PROJECT_ID
```

### 502/503 Errors

```bash
# Check service status
gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format="yaml(status)" \
  --project=$PROJECT_ID

# View recent errors
gcloud logging read "resource.labels.service_name=$SERVICE_NAME severity>=ERROR" \
  --project=$PROJECT_ID \
  --limit=20
```

### Permission Errors

```bash
# Verify Compute SA has correct roles
gcloud projects get-iam-policy $PROJECT_ID \
  --filter="serviceAccount:$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

# Re-apply IAM roles
./deploy-cloudrun.sh --setup-iam
```

---

## Next Steps

1. **Set up Custom Domain**
   ```bash
   gcloud run domain-mappings create \
     --service=$SERVICE_NAME \
     --domain=api.yourdomain.com \
     --region=$REGION
   ```

2. **Set up Cloud CDN** (for caching static assets)

3. **Configure Continuous Deployment**
   ```bash
   # Link to GitHub
   gcloud builds import --source=github.com/your-repo
   ```

4. **Set Up Alerts**
   - Error rate alerts
   - Performance monitoring
   - Budget alerts

---

## Quick Reference

### Common Commands

```bash
# Deploy
gcloud run deploy $SERVICE_NAME --image=$IMAGE --region=$REGION

# Get URL
gcloud run services describe $SERVICE_NAME --region=$REGION --format='value(status.url)'

# View logs
gcloud logs tail /run.googleapis.com/$SERVICE_NAME --region=$REGION

# Update service
gcloud run services update $SERVICE_NAME --region=$REGION ...

# Delete service
gcloud run services delete $SERVICE_NAME --region=$REGION
```

### Links

- Cloud Run Console: https://console.cloud.google.com/run
- Secret Manager: https://console.cloud.google.com/security/secret-manager
- MongoDB Atlas: https://cloud.mongodb.com/
- Vertex AI: https://console.cloud.google.com/ai/platform
