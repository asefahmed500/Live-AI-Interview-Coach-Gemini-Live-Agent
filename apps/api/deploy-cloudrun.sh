#!/bin/bash

# ==========================================
# Google Cloud Run Deployment Script
# ==========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID=""
REGION="us-central1"
SERVICE_NAME="live-interview-api"
IMAGE_NAME="live-interview-api"
DOCKER_FILE="./apps/api/Dockerfile"

# Flags
ENVIRONMENT="production"
ENABLE_VERTEX_AI=false
SETUP_IAM=false
CREATE_SECRETS=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --project)
      PROJECT_ID="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --service)
      SERVICE_NAME="$2"
      shift 2
      ;;
    --env)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --enable-vertex-ai)
      ENABLE_VERTEX_AI=true
      shift
      ;;
    --setup-iam)
      SETUP_IAM=true
      shift
      ;;
    --create-secrets)
      CREATE_SECRETS=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --project PROJECT_ID        GCP Project ID"
      echo "  --region REGION             Deployment region (default: us-central1)"
      echo "  --service SERVICE_NAME      Service name (default: live-interview-api)"
      echo "  --env ENVIRONMENT          Environment (default: production)"
      echo "  --enable-vertex-ai         Enable Vertex AI setup"
      echo "  --setup-iam                Setup IAM roles"
      echo "  --create-secrets           Create secret manager secrets"
      echo "  -h, --help                 Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Validation
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}Error: PROJECT_ID is required. Use --project flag.${NC}"
  exit 1
fi

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
  log_info "Checking prerequisites..."

  # Check gcloud CLI
  if ! command -v gcloud &> /dev/null; then
    log_error "gcloud CLI is not installed. Please install it first:"
    echo "  https://cloud.google.com/sdk/docs/install"
    exit 1
  fi

  # Check Docker
  if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed. Please install it first."
    exit 1
  fi

  # Check if user is authenticated
  if ! gcloud auth list --filter="status:ACTIVE" &> /dev/null; then
    log_error "Not authenticated with gcloud. Please run: gcloud auth login"
    exit 1
  fi

  log_success "Prerequisites check passed"
}

# Set default project
set_project() {
  log_info "Setting default project to $PROJECT_ID..."
  gcloud config set project "$PROJECT_ID"
  log_success "Project set to $PROJECT_ID"
}

# Enable required APIs
enable_apis() {
  log_info "Enabling required Google Cloud APIs..."

  local apis=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "secretmanager.googleapis.com"
    "artifactregistry.googleapis.com"
  )

  if [ "$ENABLE_VERTEX_AI" = true ]; then
    apis+=("aiplatform.googleapis.com")
  fi

  for api in "${apis[@]}"; do
    log_info "  Enabling $api..."
    gcloud services enable "$api" --project="$PROJECT_ID"
  done

  log_success "APIs enabled"
}

# Create secret manager secrets
create_secrets() {
  log_info "Creating Secret Manager secrets..."

  # MongoDB URI
  if ! gcloud secrets describe mongodb-uri --project="$PROJECT_ID" &> /dev/null; then
    log_info "Creating mongodb-uri secret..."
    echo -n "Enter MongoDB Atlas connection string (mongodb+srv://...): "
    read -rs MONGODB_URI
    echo
    echo -n "$MONGODB_URI" | gcloud secrets create mongodb-uri --data-file=- --project="$PROJECT_ID"
  else
    log_warning "Secret mongodb-uri already exists"
  fi

  # Gemini API Key
  if ! gcloud secrets describe gemini-api-key --project="$PROJECT_ID" &> /dev/null; then
    log_info "Creating gemini-api-key secret..."
    echo -n "Enter Gemini API Key: "
    read -rs GEMINI_API_KEY
    echo
    echo -n "$GEMINI_API_KEY" | gcloud secrets create gemini-api-key --data-file=- --project="$PROJECT_ID"
  else
    log_warning "Secret gemini-api-key already exists"
  fi

  # JWT Secret
  if ! gcloud secrets describe jwt-secret --project="$PROJECT_ID" &> /dev/null; then
    log_info "Creating jwt-secret secret..."
    JWT_SECRET=$(openssl rand -base64 64)
    echo -n "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=- --project="$PROJECT_ID"
    log_success "Generated and stored JWT secret"
  else
    log_warning "Secret jwt-secret already exists"
  fi

  log_success "Secrets created"
}

# Setup IAM roles
setup_iam() {
  log_info "Setting up IAM roles..."

  local PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
  local COMPUTE_EMAIL="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

  log_info "Granting roles to Compute Service Account ($COMPUTE_EMAIL)..."

  # Required roles for Cloud Run
  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$COMPUTE_EMAIL" \
    --role="roles/cloudsql.client" \
    --condition=None &> /dev/null || true

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$COMPUTE_EMAIL" \
    --role="roles/secretmanager.secretAccessor" \
    --condition=None

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$COMPUTE_EMAIL" \
    --role="roles/logging.logWriter" \
    --condition=None

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$COMPUTE_EMAIL" \
    --role="roles/monitoring.metricWriter" \
    --condition=None

  gcloud projects add-iam-policy-binding "$PROJECT_ID" \
    --member="serviceAccount:$COMPUTE_EMAIL" \
    --role="roles/trace.agent" \
    --condition=None

  if [ "$ENABLE_VERTEX_AI" = true ]; then
    gcloud projects add-iam-policy-binding "$PROJECT_ID" \
      --member="serviceAccount:$COMPUTE_EMAIL" \
      --role="roles/aiplatform.user" \
      --condition=None
  fi

  log_success "IAM roles configured"
}

# Build Docker image
build_image() {
  log_info "Building Docker image..."

  local IMAGE_URI="us-docker.pkg.dev/$PROJECT_ID/cloud-run-source-deploy/$IMAGE_NAME"

  # Build with Cloud Build
  gcloud builds submit \
    "$DOCKER_FILE" \
    --tag "$IMAGE_URI" \
    --project="$PROJECT_ID" \
    --timeout=20m

  IMAGE_NAME="$IMAGE_URI"
  log_success "Image built: $IMAGE_URI"
}

# Deploy to Cloud Run
deploy_service() {
  log_info "Deploying to Cloud Run..."

  # Get secrets
  local SECRETS_FLAGS=(
    "--set-secrets=MONGODB_URI=mongodb-uri:latest"
    "--set-secrets=GEMINI_API_KEY=gemini-api-key:latest"
    "--set-secrets=JWT_SECRET=jwt-secret:latest"
  )

  # Deploy command
  gcloud run deploy "$SERVICE_NAME" \
    --image="$IMAGE_NAME" \
    --platform=managed \
    --region="$REGION" \
    --allow-unauthenticated \
    --port=3001 \
    --memory=512Mi \
    --cpu=1 \
    --max-instances=100 \
    --min-instances=0 \
    --timeout=300s \
    --concurrency=80 \
    --ingress=all \
    --set-env-vars="NODE_ENV=$ENVIRONMENT" \
    --set-env-vars="CORS_ORIGINS=https://your-frontend-domain.com" \
    "${SECRETS_FLAGS[@]}" \
    --set-cloudsql-instances="" \
    --set-vpc-egress=private-ranges-only \
    --no-cpu-throttling \
    --execution-environment=gen2 \
    --project="$PROJECT_ID"

  log_success "Deployment completed"
}

# Get service URL
get_service_url() {
  local SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.url)' \
    --project="$PROJECT_ID")

  log_success "Service URL: $SERVICE_URL"

  # Get health check
  log_info "Checking health endpoint..."
  sleep 5
  curl -f "$SERVICE_URL/health" || log_warning "Health check failed (this is normal during cold start)"
}

# Enable Vertex AI (optional)
enable_vertex_ai() {
  if [ "$ENABLE_VERTEX_AI" = true ]; then
    log_info "Enabling Vertex AI..."

    # Get current project number
    local PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')

    # Note: Vertex AI uses the same Gemini API key
    log_info "Vertex AI is enabled. Set VERTEX_AI_LOCATION environment variable."
    log_info "Example: projects/$PROJECT_ID/locations/us-central1"

    log_success "Vertex AI setup complete"
  fi
}

# Print deployment summary
print_summary() {
  local SERVICE_URL=$(gcloud run services describe "$SERVICE_NAME" \
    --region="$REGION" \
    --format='value(status.url)' \
    --project="$PROJECT_ID")

  echo ""
  echo "=================================="
  echo "Deployment Summary"
  echo "=================================="
  echo "Project:       $PROJECT_ID"
  echo "Service:       $SERVICE_NAME"
  echo "Region:        $REGION"
  echo "Environment:   $ENVIRONMENT"
  echo "Service URL:   $SERVICE_URL"
  echo ""
  echo "Health Check:  $SERVICE_URL/health"
  echo "Readiness:     $SERVICE_URL/health/ready"
  echo "Liveness:      $SERVICE_URL/health/live"
  echo ""
  echo "Commands:"
  echo "  View logs:      gcloud logs tail /run.googleapis.com/$SERVICE_NAME --project=$PROJECT_ID"
  echo "  Get service:   gcloud run services describe $SERVICE_NAME --region=$REGION --project=$PROJECT_ID"
  echo "  Update service: gcloud run services update $SERVICE_NAME --region=$REGION --project=$PROJECT_ID ..."
  echo ""
}

# Main execution
main() {
  echo -e "${BLUE}==================================${NC}"
  echo -e "${BLUE}Google Cloud Run Deployment${NC}"
  echo -e "${BLUE}==================================${NC}"
  echo ""

  check_prerequisites
  set_project
  enable_apis

  if [ "$CREATE_SECRETS" = true ]; then
    create_secrets
  fi

  if [ "$SETUP_IAM" = true ]; then
    setup_iam
  fi

  build_image
  deploy_service
  enable_vertex_ai
  get_service_url
  print_summary

  log_success "Deployment completed successfully!"
}

# Run main function
main "$@"
