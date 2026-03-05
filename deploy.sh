#!/bin/bash
# deploy.sh - Automated deployment script for Google Cloud Run
# Created for Gemini Live Agent Challenge

set -e

# Configuration
PROJECT_ID=${PROJECT_ID:-"your-project-id"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="live-interview-api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 Live AI Interview Coach Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Validate environment
if [ -z "$GEMINI_API_KEY" ]; then
  echo -e "${RED}✗ Error: GEMINI_API_KEY environment variable not set${NC}"
  exit 1
fi

if [ -z "$MONGODB_URI" ]; then
  echo -e "${YELLOW}⚠ Warning: MONGODB_URI not set. Using default.${NC}"
  MONGODB_URI="mongodb://localhost:27017/live-interview-coach"
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}✗ Error: gcloud CLI not installed${NC}"
  echo -e "${YELLOW}Install from: https://cloud.google.com/sdk/docs/install${NC}"
  exit 1
fi

# Set project
echo -e "${GREEN}[1/6]${NC} Setting project to: ${PROJECT_ID}"
gcloud config set project "$PROJECT_ID"

# Enable required APIs
echo -e "${GREEN}[2/6]${NC} Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com \
  --quiet

# Build the container image
echo -e "${GREEN}[3/6]${NC} Building container image with Cloud Build..."
gcloud builds submit \
  --tag "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --timeout 1200s \
  --quiet || {
  echo -e "${RED}✗ Build failed${NC}"
  exit 1
}

# Deploy to Cloud Run
echo -e "${GREEN}[4/6]${NC} Deploying to Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --image "gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest" \
  --platform managed \
  --region "${REGION}" \
  --memory 2048Mi \
  --cpu 2 \
  --timeout 3600s \
  --concurrency 80 \
  --max-instances 10 \
  --min-instances 1 \
  --set-env-vars \
    NODE_ENV=production, \
    API_PORT=3001, \
    API_HOST=0.0.0.0, \
    API_PREFIX=api \
  --set-secrets \
    GEMINI_API_KEY=gemini-api-key, \
    MONGODB_URI=mongodb-uri \
  --allow-unauthenticated \
  --quiet || {
  echo -e "${RED}✗ Deployment failed${NC}"
  exit 1
}

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format 'value(status.url)')

echo -e "${GREEN}[5/6]${NC} Service deployed successfully!"
echo -e "${GREEN}   URL: ${SERVICE_URL}${NC}"

# Update frontend environment
echo -e "${GREEN}[6/6]${NC} Deployment complete!"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Update frontend .env.local:"
echo -e "   NEXT_PUBLIC_API_URL=${SERVICE_URL}"
echo -e "   NEXT_PUBLIC_WS_URL=${SERVICE_URL}"
echo ""
echo -e "2. Deploy frontend to Vercel:"
echo -e "   cd apps/web && vercel deploy --prod"
echo ""
echo -e "${GREEN}✨ Happy Hacking! 🚀${NC}"
