# Terraform Serverless OIDC Provider

A fully serverless OpenID Connect (OIDC) Provider built using AWS services and Terraform.

## Architecture

This project implements a complete OIDC provider using:

- **API Gateway**: REST API endpoints for OIDC protocol
- **Lambda**: Serverless compute for authentication and token logic
- **DynamoDB**: Storage for users, OAuth clients, authorization codes, and refresh tokens
- **SSM Parameter Store**: Secure encrypted storage for JWT signing keys (RSA)
- **S3**: Storage for static assets

### OIDC Endpoints

- `/.well-known/openid-configuration` - OIDC discovery endpoint
- `/auth` - Authorization endpoint (GET/POST)
- `/token` - Token endpoint (POST)
- `/userinfo` - UserInfo endpoint (GET/POST)
- `/jwks` - JSON Web Key Set endpoint

## Features

- ✅ Authorization Code Flow with PKCE support
- ✅ RS256 JWT signing (RSA 2048-bit keys)
- ✅ Access tokens, ID tokens, and refresh tokens
- ✅ User authentication and profile management
- ✅ OAuth 2.0 client management
- ✅ Standard OIDC claims (openid, profile, email)
- ✅ Fully serverless and scalable
- ✅ Pay-per-use pricing model

## Prerequisites

- AWS Account with appropriate permissions
- Terraform >= 1.0
- AWS CLI configured with credentials
- Node.js >= 18.x (for Lambda functions)
- Bash (for setup scripts)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd terraform-core-oicd
```

### 2. Install Dependencies

```bash
./scripts/setup.sh
```

This will install Node.js dependencies for Lambda functions.

### 3. Initialize Terraform

```bash
terraform init
```

### 4. Configure Variables (Optional)

Create a `terraform.tfvars` file to customize deployment:

```hcl
aws_region   = "us-east-1"
environment  = "dev"
project_name = "oidc-provider"
```

### 5. Deploy Infrastructure

```bash
terraform plan
terraform apply
```

### 6. Seed Sample Data

After deployment, add sample users and OAuth clients:

```bash
./scripts/seed-data.sh us-east-1 dev
```

This creates:
- **Demo User**: username=`demo`, password=`password`
- **Test Client**: client_id=`test-client`, client_secret=`test-secret`

### 7. Get Endpoints

```bash
terraform output
```

## Usage

### Testing with Postman or OAuth Playground

1. **Get OIDC Configuration**
   ```bash
   curl https://<api-gateway-url>/dev/.well-known/openid-configuration
   ```

2. **Authorization Request**
   ```
   GET https://<api-gateway-url>/dev/auth?
     client_id=test-client&
     redirect_uri=https://oauth.pstmn.io/v1/callback&
     response_type=code&
     scope=openid+profile+email&
     state=random-state
   ```

3. **Exchange Code for Tokens**
   ```bash
   curl -X POST https://<api-gateway-url>/dev/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code" \
     -d "code=<authorization-code>" \
     -d "redirect_uri=https://oauth.pstmn.io/v1/callback" \
     -d "client_id=test-client" \
     -d "client_secret=test-secret"
   ```

4. **Get User Info**
   ```bash
   curl https://<api-gateway-url>/dev/userinfo \
     -H "Authorization: Bearer <access-token>"
   ```

### Managing Users

Users are stored in DynamoDB. Passwords are securely hashed using bcrypt with salt rounds of 10.

**Add a new user using the User Management Lambda:**

The easiest way to create users or reset passwords is to use the dedicated `user-management` Lambda function from the AWS Console:

1. Navigate to AWS Lambda Console
2. Find the function named `oidc-provider-<environment>-user-management`
3. Use the "Test" tab with one of the following payloads:

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Create a new user:**
```json
{
  "operation": "createUser",
  "username": "john",
  "password": "SecurePassword123!",
  "email": "john@example.com"
}
```

**Reset a user's password:**
```json
{
  "operation": "resetPassword",
  "username": "john",
  "newPassword": "NewSecurePassword123!"
}
```

**Alternatively, add a user directly via AWS CLI:**

Note: You'll need to generate a bcrypt hash for the password first.

```bash
# Generate bcrypt hash using Node.js (requires bcrypt package)
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('your-password', 10).then(hash => console.log(hash));"

# Then add the user
aws dynamodb put-item \
  --table-name oidc-provider-dev-users \
  --item '{
    "user_id": {"S": "user-456"},
    "username": {"S": "john"},
    "password_hash": {"S": "<bcrypt-hash>"},
    "email": {"S": "john@example.com"},
    "email_verified": {"BOOL": false},
    "created_at": {"S": "2024-01-01T00:00:00Z"},
    "updated_at": {"S": "2024-01-01T00:00:00Z"}
  }'
```

### Managing OAuth Clients

OAuth clients are stored in DynamoDB.

**Add a new client:**

```bash
aws dynamodb put-item \
  --table-name oidc-provider-dev-clients \
  --item '{
    "client_id": {"S": "my-app"},
    "client_secret": {"S": "my-secret"},
    "redirect_uris": {"L": [{"S": "https://myapp.com/callback"}]},
    "grant_types": {"L": [{"S": "authorization_code"}, {"S": "refresh_token"}]},
    "response_types": {"L": [{"S": "code"}]},
    "scope": {"S": "openid profile email"}
  }'
```

## Infrastructure Components

### DynamoDB Tables

- **users**: User accounts and profiles
- **clients**: OAuth 2.0 client registrations
- **auth-codes**: Authorization codes (10-minute TTL)
- **refresh-tokens**: Refresh tokens (30-day TTL)

### Lambda Functions

All Lambda functions are Node.js 18.x with shared utilities:

- **wellknown**: Returns OIDC discovery document
- **jwks**: Returns public keys for JWT verification
- **auth**: Handles authorization requests and user login
- **token**: Issues access tokens, ID tokens, and refresh tokens
- **userinfo**: Returns user profile information
- **user-management**: Administrative function for creating users and resetting passwords (console invocation only)

### Security

- RSA 2048-bit keys for JWT signing (stored in SSM Parameter Store with encryption)
- PKCE support for public clients
- Secure password hashing using bcrypt with salt rounds of 10
- DynamoDB encryption at rest
- S3 bucket encryption
- API Gateway with CloudWatch logging

## Terraform Outputs

| Output | Description |
|--------|-------------|
| `api_gateway_url` | Base URL of API Gateway |
| `oidc_issuer_url` | OIDC Issuer URL |
| `wellknown_configuration_url` | Full URL to OIDC configuration |
| `dynamodb_users_table` | Users table name |
| `dynamodb_clients_table` | Clients table name |
| `dynamodb_auth_codes_table` | Auth codes table name |
| `s3_bucket_name` | Assets bucket name |
| `jwt_signing_key_parameter_name` | SSM Parameter name for JWT keys (encrypted) |

## Development

### Project Structure

```
.
├── main.tf                 # Main Terraform configuration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── api_gateway.tf          # API Gateway resources
├── lambda.tf               # Lambda functions
├── dynamodb.tf             # DynamoDB tables
├── s3.tf                   # S3 bucket
├── secrets.tf              # SSM Parameter Store (encrypted)
├── iam.tf                  # IAM roles and policies
├── lambda/
│   └── src/
│       ├── package.json    # Node.js dependencies
│       ├── utils.js        # Shared utilities
│       ├── wellknown.js    # Discovery endpoint
│       ├── jwks.js         # JWKS endpoint
│       ├── auth.js         # Authorization endpoint
│       ├── token.js        # Token endpoint
│       └── userinfo.js     # UserInfo endpoint
└── scripts/
    ├── setup.sh            # Setup script
    └── seed-data.sh        # Data seeding script
```

### Customization

You can customize the deployment by modifying variables:

- `aws_region`: AWS region for deployment
- `environment`: Environment name (dev, staging, prod)
- `project_name`: Prefix for resource names
- `issuer_url`: Custom issuer URL (optional)

### Issuer URL Configuration

The OIDC issuer URL is stored in AWS Systems Manager Parameter Store to avoid circular dependencies between Lambda functions and API Gateway. 

- If you provide a custom `issuer_url` variable, it will be used directly
- If no `issuer_url` is provided, the system will:
  1. Initialize with a placeholder value during initial deployment
  2. Automatically update to the API Gateway URL after deployment completes

Lambda functions retrieve the issuer URL dynamically from SSM Parameter Store at runtime, which allows for flexible URL configuration without redeploying Lambda functions.

## Cleanup

To destroy all resources:

```bash
terraform destroy
```

## Limitations & Security Considerations

- **Demo Implementation**: This is for demonstration and testing purposes
- **No Rate Limiting**: Implement rate limiting for production use
- **User Registration**: Use the user-management Lambda function from AWS Console to create users and reset passwords
- **No Consent Screen**: Authorization is immediate after login
- **Limited Scopes**: Only basic OpenID Connect scopes supported
- **API Gateway Logs**: Data trace enabled - may log sensitive information
- **No Token Rotation**: JWT signing keys are not automatically rotated

**Password Security**: Now uses bcrypt with salt rounds of 10 for secure password hashing.

**IMPORTANT**: Do not use this implementation as-is in production without implementing proper security measures!

## Future Enhancements

- [x] Password reset functionality (added in user-management Lambda)
- [x] Better password hashing with bcrypt (completed)
- [ ] User registration endpoint (exposed via API)
- [ ] Implement consent screen
- [ ] Add support for more grant types (client credentials, implicit)
- [ ] Enhanced security (rate limiting, brute force protection)
- [ ] User management API (exposed via API Gateway)
- [ ] Admin dashboard
- [ ] Support for custom claims
- [ ] Multi-factor authentication
- [ ] Session management

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.