# Cloud Run Deployment Quick Reference

## Prerequisites

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
gcloud init

# Configure project
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
```

---

## Quick Deploy

### 1. Enable APIs (One-time)

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  secretmanager.googleapis.com \
  artifactregistry.googleapis.com \
  aiplatform.googleapis.com \
  --project=$PROJECT_ID
```

### 2. Create Secrets (One-time)

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
```

### 3. Setup IAM (One-time)

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
COMPUTE_EMAIL="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$COMPUTE_EMAIL" \
  --role="roles/secretmanager.secretAccessor"

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

### 4. Build & Deploy

```bash
cd apps/api

# Method 1: Direct deploy
gcloud run deploy live-interview-api \
  --source . \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="CORS_ORIGINS=https://yourdomain.com" \
  --set-secrets="MONGODB_URI=mongodb-uri:latest" \
  --set-secrets="GEMINI_API_KEY=gemini-api-key:latest" \
  --set-secrets="JWT_SECRET=jwt-secret:latest"

# Method 2: Using deployment script
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh \
  --project $PROJECT_ID \
  --region us-central1 \
  --create-secrets \
  --setup-iam
```

---

## gcloud Commands Reference

### Build Commands

```bash
# Build with Cloud Build
gcloud builds submit \
  --tag us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/live-interview-api \
  --timeout=20m \
  .

# Build with cloudbuild.yaml
gcloud builds submit --config cloudbuild.yaml .
```

### Deploy Commands

```bash
# Initial deployment
gcloud run deploy live-interview-api \
  --image us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/live-interview-api \
  --region us-central1

# Update deployment
gcloud run services update live-interview-api \
  --region us-central1 \
  --memory 1Gi

# Rollback deployment
gcloud run services update live-interview-api \
  --region us-central1 \
  --revision=live-interview-api-00001-abc
```

### Service Management

```bash
# Get service URL
gcloud run services describe live-interview-api \
  --region us-central1 \
  --format='value(status.url)'

# View service details
gcloud run services describe live-interview-api \
  --region us-central1

# List revisions
gcloud run revisions list \
  --service live-interview-api \
  --region us-central1

# Delete service
gcloud run services delete live-interview-api \
  --region us-central1
```

### Log Commands

```bash
# Tail logs
gcloud logs tail /run.googleapis.com/live-interview-api \
  --region us-central1

# View recent logs
gcloud logging read "resource.labels.service_name=live-interview-api" \
  --limit 50 \
  --format="table(timestamp, severity, textPayload)"

# Filter by severity
gcloud logging read "resource.labels.service_name=live-interview-api severity>=ERROR" \
  --limit 20
```

### Monitoring Commands

```bash
# Get service metrics
gcloud run services describe live-interview-api \
  --region us-central1 \
  --format="yaml(status)"

# Set up alerts
gcloud alpha monitoring policies create \
  --policy-from-file=alerts.yaml
```

---

## Enable Vertex AI

### 1. Enable API

```bash
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
```

### 2. Update Service with Vertex AI

```bash
gcloud run services update live-interview-api \
  --region us-central1 \
  --set-env-vars="VERTEX_AI_LOCATION=projects/$PROJECT_ID/locations/us-central1"
```

### 3. IAM Role (Already configured)

The Compute SA already has `roles/aiplatform.user` from the IAM setup.

---

## Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `GEMINI_API_KEY` | Gemini API key | `AIza...` |
| `JWT_SECRET` | JWT signing secret (min 64 chars) | `openssl rand -base64 64` |
| `CORS_ORIGINS` | Allowed frontend origins | `https://example.com` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `PORT` | Container port | `3001` |
| `LOG_LEVEL` | Logging level | `info` |
| `VERTEX_AI_LOCATION` | Vertex AI location | `projects/...` |

---

## Quick Troubleshooting

### Check Health

```bash
# Get service URL
URL=$(gcloud run services describe live-interview-api \
  --region us-central1 \
  --format='value(status.url)')

# Check health endpoint
curl $URL/health
curl $URL/health/ready
curl $URL/health/live
```

### View Recent Errors

```bash
gcloud logging read \
  "resource.labels.service_name=live-interview-api severity>=ERROR" \
  --limit 20 \
  --format="table(timestamp, textPayload)"
```

### Check Instance Status

```bash
gcloud run services describe live-interview-api \
  --region us-central1 \
  --format="value(status.latestReadyRevisionCount)"
```

### Set Min Instances

```bash
gcloud run services update live-interview-api \
  --region us-central1 \
  --min-instances 1
```

---

## IAM Role Summary

Compute Service Account needs these roles:

```
roles/secretmanager.secretAccessor    # Access secrets
roles/logging.logWriter                 # Write logs
roles/monitoring.metricWriter           # Write metrics
roles/trace.agent                       # Write traces
roles/aiplatform.user                   # Vertex AI access
roles/cloudsql.client                   # Cloud SQL (if using)
roles/run.invoker                       # Invoke services (if needed)
```

Apply all at once:

```bash
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

for role in \
  "roles/secretmanager.secretAccessor" \
  "roles/logging.logWriter" \
  "roles/monitoring.metricWriter" \
  "roles/trace.agent" \
  "roles/aiplatform.user"; do
  gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
    --role="$role"
done
```

---

## Deployment Checklist

- [ ] Project created
- [ ] Billing enabled
- [ ] APIs enabled (cloudbuild, run, secretmanager, artifactregistry)
- [ ] Secrets created (mongodb-uri, gemini-api-key, jwt-secret)
- [ ] IAM roles configured
- [ ] MongoDB Atlas cluster created
- [ ] MongoDB IP whitelist configured
- [ ] MongoDB database user created
- [ ] MongoDB indexes created
- [ ] Dockerfile exists
- [ ] cloudbuild.yaml exists
- [ ] Health check passing
- [ ] CORS configured for frontend domain
- [ ] Monitoring/alerts configured

---

## Useful Links

- Cloud Run Console: https://console.cloud.google.com/run
- Cloud Build Console: https://console.cloud.google.com/cloud-build
- Secret Manager: https://console.cloud.google.com/security/secret-manager
- Cloud Logging: https://console.cloud.google.com/logs
- MongoDB Atlas: https://cloud.mongodb.com/
- Vertex AI: https://console.cloud.google.com/ai/platform
