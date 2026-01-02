# Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          OIDC Provider                              │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────────────────────────────────┐
│              │         │                                          │
│   Client     │───────▶│        API Gateway (REST API)             │
│ Application  │         │                                          │
│              │         │  /.well-known/openid-configuration       │
└──────────────┘         │  /auth                                   │
                         │  /token                                  │
                         │  /userinfo                               │
                         │  /jwks                                   │
                         └──────────────┬───────────────────────────┘
                                        │
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    ▼                   ▼                   ▼
         ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
         │  Lambda: Auth    │ │ Lambda: Token    │ │ Lambda: UserInfo │
         │                  │ │                  │ │                  │
         │ - Show login     │ │ - Issue tokens   │ │ - Return user    │
         │ - Authenticate   │ │ - Refresh tokens │ │   profile        │
         │ - Create code    │ │ - Validate code  │ │                  │
         └────────┬─────────┘ └────────┬─────────┘ └────────┬─────────┘
                  │                    │                     │
         ┌────────┴────────────────────┴─────────────────────┴─────────┐
         │                                                             │
         ▼                           ▼                          ▼      │
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   DynamoDB       │      │   DynamoDB       │      │   SSM Parameter  │
│   Users Table    │      │   Clients Table  │      │   Store          │
│                  │      │                  │      │                  │
│ - user_id        │      │ - client_id      │      │ - RSA Keys       │
│ - username       │      │ - client_secret  │      │ - kid            │
│ - password_hash  │      │ - redirect_uris  │      │ - alg (RS256)    │
│ - email          │      │ - grant_types    │      │ - (Encrypted)    │
│ - profile        │      │                  │      │                  │
└──────────────────┘      └──────────────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────┐
│   DynamoDB       │      │   S3 Bucket      │
│ Auth Codes Table │      │   Static Assets  │
│                  │      │                  │
│ - code           │      │ - Configuration  │
│ - user_id        │      │ - Metadata       │
│ - expires_at     │      │                  │
│ - (10 min TTL)   │      │                  │
└──────────────────┘      └──────────────────┘
         │
         ▼
┌──────────────────┐
│   DynamoDB       │
│ Refresh Tokens   │
│                  │
│ - token_id       │
│ - user_id        │
│ - expires_at     │
│ - (30 day TTL)   │
└──────────────────┘
```

## Authorization Code Flow

```
┌──────────┐                                           ┌──────────────┐
│  Client  │                                           │ OIDC Provider│
│   App    │                                           │              │
└────┬─────┘                                           └──────┬───────┘
     │                                                        │
     │ 1. Authorization Request                               │
     │   GET /auth?client_id=...&redirect_uri=...&            │
     │        response_type=code&scope=openid                 │
     │───────────────────────────────────────────────────────▶
     │                                                        │
     │                          2. Show Login Page            │
     │◀───────────────────────────────────────────────────────
     │                                                        │
     │ 3. User submits credentials                            │
     │   POST /auth (username, password)                      │
     │───────────────────────────────────────────────────────▶
     │                                                        │
     │                     4. Verify credentials              │
     │                        (DynamoDB Users)                │
     │                                                        │
     │                     5. Create auth code                │
     │                        (DynamoDB Auth Codes)           │
     │                                                        │
     │ 6. Redirect with code                                  │
     │    Location: redirect_uri?code=ABC&state=xyz           │
     │◀───────────────────────────────────────────────────────
     │                                                        │
     │ 7. Token Request                                       │
     │   POST /token                                          │
     │   grant_type=authorization_code&code=ABC&              │
     │   client_id=...&client_secret=...                      │
     │───────────────────────────────────────────────────────▶
     │                                                        │
     │                     8. Validate code                   │
     │                        (DynamoDB Auth Codes)           │
     │                                                        │
     │                     9. Validate client                 │
     │                        (DynamoDB Clients)              │
     │                                                        │
     │                    10. Get user data                   │
     │                        (DynamoDB Users)                │
     │                                                        │
     │                    11. Sign tokens                     │
     │                        (SSM Parameter Store - RSA Keys)│
     │                                                        │
     │                    12. Create refresh token            │
     │                        (DynamoDB Refresh Tokens)       │
     │                                                        │
     │ 13. Token Response                                     │
     │    {                                                   │
     │      "access_token": "...",                            │
     │      "id_token": "...",                                │
     │      "refresh_token": "...",                           │
     │      "token_type": "Bearer",                           │
     │      "expires_in": 3600                                │
     │    }                                                   │
     │◀───────────────────────────────────────────────────────
     │                                                        │
     │ 14. Get User Info                                      │
     │    GET /userinfo                                       │
     │    Authorization: Bearer <access_token>                │
     │───────────────────────────────────────────────────────▶
     │                                                        │
     │                    15. Verify token                    │
     │                        (JWT verification)              │
     │                                                        │
     │                    16. Get user data                   │
     │                        (DynamoDB Users)                │
     │                                                        │
     │ 17. User Info Response                                 │
     │    {                                                   │
     │      "sub": "user-123",                                │
     │      "name": "Demo User",                              │
     │      "email": "demo@example.com"                       │
     │    }                                                   │
     │◀───────────────────────────────────────────────────────
     │                                                        │
```

## Data Flow

### User Authentication
1. Client redirects user to `/auth` endpoint
2. Lambda displays login form (HTML)
3. User submits credentials
4. Lambda queries DynamoDB Users table
5. Password verified using bcrypt hash comparison
6. Authorization code created in DynamoDB Auth Codes table
7. User redirected back to client with code

### Token Issuance
1. Client posts authorization code to `/token` endpoint
2. Lambda validates code from DynamoDB Auth Codes table
3. Lambda validates client from DynamoDB Clients table
4. Lambda retrieves user from DynamoDB Users table
5. Lambda gets RSA keys from SSM Parameter Store (encrypted)
6. Lambda signs JWT tokens (access token + ID token)
7. Lambda creates refresh token in DynamoDB Refresh Tokens table
8. Lambda returns tokens to client

### User Info Retrieval
1. Client sends access token to `/userinfo` endpoint
2. Lambda verifies JWT signature using public key
3. Lambda retrieves user from DynamoDB Users table
4. Lambda returns user claims based on scope

## Security Considerations

### JWT Signing
- **Algorithm**: RS256 (RSA Signature with SHA-256)
- **Key Size**: 2048 bits
- **Storage**: AWS Systems Manager Parameter Store (SecureString) with encryption
- **Rotation**: Keys stored but not automatically rotated (enhancement needed)

### Password Storage
- **Hashing**: bcrypt with salt rounds of 10
- **Security**: bcrypt is designed to be slow to prevent brute-force attacks
- **Salt**: Automatically generated per password by bcrypt

### Data Encryption
- **DynamoDB**: Encryption at rest enabled
- **S3**: Server-side encryption (AES-256)
- **SSM Parameter Store**: Encrypted with AWS KMS (SecureString type)

### Token Expiration
- **Access Token**: 1 hour
- **ID Token**: 1 hour
- **Refresh Token**: 30 days (with TTL)
- **Authorization Code**: 10 minutes (with TTL)

### PKCE Support
- Supported for public clients
- Methods: plain, S256 (SHA-256)

## Infrastructure as Code

All resources are defined in Terraform:

- **main.tf**: Provider configuration
- **api_gateway.tf**: API Gateway REST API, resources, methods, integrations
- **lambda.tf**: Lambda functions, permissions
- **dynamodb.tf**: DynamoDB tables with TTL
- **s3.tf**: S3 bucket with encryption
- **secrets.tf**: SSM Parameter Store (SecureString) for JWT keys
- **ssm.tf**: SSM Parameter Store for issuer URL
- **iam.tf**: IAM roles and policies
- **variables.tf**: Input variables
- **outputs.tf**: Output values

## Scalability

- **API Gateway**: Scales automatically, 10,000 requests/second default
- **Lambda**: Scales automatically, 1,000 concurrent executions default
- **DynamoDB**: On-demand billing, auto-scaling
- **SSM Parameter Store**: No scaling concerns
- **S3**: Unlimited scalability

## Cost Optimization

- **Lambda**: Pay per invocation and execution time
- **DynamoDB**: On-demand billing (pay for what you use)
- **API Gateway**: Pay per request
- **S3**: Pay for storage and requests (minimal)
- **SSM Parameter Store**: Free for standard parameters (up to 10,000), encrypted with KMS

Estimated cost for low traffic (1,000 requests/day): **$1-2/month**
