#!/bin/bash
# deploy.sh - Automated deployment script for Google Cloud Run
# Created for Gemini Live Agent Challenge

set -e

# Configuration
PROJECT_ID="voice-ai-agent-447515"
REGION=${REGION:-"us-central1"}
SERVICE_NAME="live-interview-api"

# API Keys and Secrets - DO NOT HARDCODE
# Use Google Secret Manager instead
GEMINI_API_KEY=${GEMINI_API_KEY:-""}
MONGODB_URI=${MONGODB_URI:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🚀 Live AI Interview Coach Deployment${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
  echo -e "${RED}✗ Error: gcloud CLI not installed${NC}"
  echo -e "${YELLOW}Install from: https://cloud.google.com/sdk/docs/install${NC}"
  exit 1
fi

# Validate environment
if [ -z "$GEMINI_API_KEY" ]; then
  echo -e "${RED}✗ Error: GEMINI_API_KEY environment variable not set${NC}"
  echo -e "${YELLOW}Usage: GEMINI_API_KEY=your_key bash deploy.sh${NC}"
  exit 1
fi

if [ -z "$MONGODB_URI" ]; then
  echo -e "${RED}✗ Error: MONGODB_URI environment variable not set${NC}"
  echo -e "${YELLOW}Usage: MONGODB_URI=mongodb+srv://... bash deploy.sh${NC}"
  exit 1
fi

# Set project
echo -e "${GREEN}[1/7]${NC} Setting project to: ${PROJECT_ID}"
gcloud config set project "$PROJECT_ID"

# Check if authenticated
echo -e "${GREEN}[2/7]${NC} Checking authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | grep -q .; then
  echo -e "${YELLOW}⚠ Not authenticated. Running login...${NC}"
  gcloud auth login
fi

# Enable required APIs
echo -e "${GREEN}[3/7]${NC} Enabling required Google Cloud APIs..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  aiplatform.googleapis.com \
  secretmanager.googleapis.com \
  --quiet || {
  echo -e "${YELLOW}⚠ Some APIs may already be enabled${NC}"
}

# Create secrets
echo -e "${GREEN}[4/7]${NC} Setting up secrets..."
echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- 2>/dev/null || \
  echo -n "$GEMINI_API_KEY" | gcloud secrets update gemini-api-key --data-file=-

echo -n "$MONGODB_URI" | gcloud secrets create mongodb-uri --data-file=- 2>/dev/null || \
  echo -n "$MONGODB_URI" | gcloud secrets update mongodb-uri --data-file=-

# Build the container image
echo -e "${GREEN}[5/7]${NC} Building container image with Cloud Build..."
cd apps/api
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
echo -e "${GREEN}[6/7]${NC} Deploying to Cloud Run..."
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
    API_PREFIX=api, \
    CORS_ORIGINS=https://web-taupe-theta-94.vercel.app,http://localhost:3000 \
  --set-secrets \
    GEMINI_API_KEY=gemini-api-key:latest, \
    MONGODB_URI=mongodb-uri:latest \
  --allow-unauthenticated || {
  echo -e "${RED}✗ Deployment failed${NC}"
  exit 1
}

cd ../..

# Get service URL
SERVICE_URL=$(gcloud run services describe "${SERVICE_NAME}" \
  --region "${REGION}" \
  --format 'value(status.url)')

echo -e "${GREEN}[7/7]${NC} Service deployed successfully!"
echo -e "${GREEN}   URL: ${SERVICE_URL}${NC}"

# Update frontend environment
echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}📝 API URL: ${SERVICE_URL}${NC}"
echo -e "${YELLOW}📝 WebSocket URL: wss://$(echo $SERVICE_URL | sed 's/https:\/\///')${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "1. Update Vercel environment variables:"
echo -e "   NEXT_PUBLIC_API_URL=${SERVICE_URL}"
echo -e "   NEXT_PUBLIC_WS_URL=wss://$(echo $SERVICE_URL | sed 's/https:\/\///')"
echo ""
echo -e "2. Or redeploy frontend with:"
echo -e "   cd apps/web && vercel --prod"
echo ""
echo -e "${GREEN}✨ Done! 🚀${NC}"
