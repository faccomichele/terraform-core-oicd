#!/bin/bash
set -e

# This script seeds sample data into DynamoDB tables
# Usage: ./seed-data.sh [aws-region] [environment]

AWS_REGION=${1:-us-east-1}
ENVIRONMENT=${2:-dev}
PROJECT_NAME="oidc-provider"

echo "Seeding data for OIDC Provider..."
echo "Region: $AWS_REGION"
echo "Environment: $ENVIRONMENT"
echo ""

# Get table names from Terraform outputs
USERS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-users"
CLIENTS_TABLE="${PROJECT_NAME}-${ENVIRONMENT}-clients"

# Create a sample user
echo "Creating sample user..."
aws dynamodb put-item \
  --region $AWS_REGION \
  --table-name $USERS_TABLE \
  --item '{
    "user_id": {"S": "user-123"},
    "username": {"S": "demo"},
    "password_hash": {"S": "$2b$10$GiFmZumcIdWb6YTzDrR4XOpNJAkC9HWeMA0wTF4fie.44RIT5M3B2"},
    "email": {"S": "demo@example.com"},
    "email_verified": {"BOOL": true},
    "created_at": {"S": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"},
    "updated_at": {"S": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"} 
  }'

echo "Sample user created: username=demo, password=password"
echo ""

# Create a sample OAuth client
echo "Creating sample OAuth client..."
aws dynamodb put-item \
  --region $AWS_REGION \
  --table-name $CLIENTS_TABLE \
  --item '{
    "client_id": {"S": "test-client"},
    "client_secret": {"S": "test-secret"},
    "redirect_uris": {
      "L": [
        {"S": "http://localhost:3000/callback"},
        {"S": "https://oauth.pstmn.io/v1/callback"}
      ]
    },
    "grant_types": {
      "L": [
        {"S": "authorization_code"},
        {"S": "refresh_token"}
      ]
    },
    "response_types": {
      "L": [
        {"S": "code"}
      ]
    },
    "scope": {"S": "openid profile email"},
    "created_at": {"S": "'"$(date -u +"%Y-%m-%dT%H:%M:%SZ")"'"} 
  }'

echo "Sample OAuth client created:"
echo "  client_id: test-client"
echo "  client_secret: test-secret"
echo "  redirect_uris: http://localhost:3000/callback, https://oauth.pstmn.io/v1/callback"
echo ""
echo "Sample data seeded successfully!"
