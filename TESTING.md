# Testing Guide

## Local Testing

Since this is a serverless application designed for AWS, full local testing requires AWS credentials and deployed infrastructure. However, you can validate the code syntax and logic.

### Validate JavaScript Syntax

```bash
cd lambda/src
node -c utils.js
node -c wellknown.js
node -c jwks.js
node -c auth.js
node -c token.js
node -c userinfo.js
```

### Install Dependencies Locally

```bash
cd lambda/src
npm install
```

## Integration Testing

After deploying with Terraform, you can test the endpoints:

### 1. Test OIDC Discovery Endpoint

```bash
ISSUER_URL=$(terraform output -raw oidc_issuer_url)
curl $ISSUER_URL/.well-known/openid-configuration | jq .
```

Expected response:
```json
{
  "issuer": "https://...",
  "authorization_endpoint": "https://.../auth",
  "token_endpoint": "https://.../token",
  "userinfo_endpoint": "https://.../userinfo",
  "jwks_uri": "https://.../jwks",
  ...
}
```

### 2. Test JWKS Endpoint

```bash
curl $ISSUER_URL/jwks | jq .
```

Expected response:
```json
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "...",
      "alg": "RS256",
      "n": "...",
      "e": "AQAB"
    }
  ]
}
```

### 3. Test Authorization Flow

#### Step 1: Start Authorization

Open in browser or use curl:
```bash
$ISSUER_URL/auth?client_id=test-client&redirect_uri=https://oauth.pstmn.io/v1/callback&response_type=code&scope=openid+profile+email&state=xyz123
```

This will show a login page. Login with:
- Username: `demo`
- Password: `password`

#### Step 2: Exchange Code for Tokens

After successful login, you'll be redirected with an authorization code. Use it to get tokens:

```bash
curl -X POST $ISSUER_URL/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=YOUR_CODE_HERE" \
  -d "redirect_uri=https://oauth.pstmn.io/v1/callback" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret"
```

Expected response:
```json
{
  "access_token": "eyJhbGc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "id_token": "eyJhbGc...",
  "scope": "openid profile email"
}
```

#### Step 3: Get User Info

```bash
ACCESS_TOKEN="your_access_token_here"
curl $ISSUER_URL/userinfo \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

Expected response:
```json
{
  "sub": "user-123",
  "name": "Demo User",
  "email": "demo@example.com",
  "email_verified": true
}
```

### 4. Test Refresh Token

```bash
curl -X POST $ISSUER_URL/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "client_id=test-client" \
  -d "client_secret=test-secret"
```

## Testing with Postman

1. Import the OIDC configuration URL into Postman's OAuth 2.0 settings
2. Configure:
   - Grant Type: Authorization Code
   - Authorization URL: `$ISSUER_URL/auth`
   - Access Token URL: `$ISSUER_URL/token`
   - Client ID: `test-client`
   - Client Secret: `test-secret`
   - Scope: `openid profile email`
3. Click "Get New Access Token"
4. Login with demo credentials
5. Use the token to call `/userinfo`

## Testing with OAuth 2.0 Playground

1. Go to https://oauth.pstmn.io/v1/browser-callback
2. Or https://www.oauth.com/playground/
3. Use your OIDC provider endpoints
4. Follow the authorization flow

## Automated Testing

You can create automated tests using tools like:

- **Jest** for unit testing Lambda functions
- **Postman/Newman** for API testing
- **Artillery** for load testing

Example Jest test:

```javascript
// tests/utils.test.js
const { createResponse } = require('../lambda/src/utils');

test('createResponse creates proper response', () => {
  const response = createResponse(200, { message: 'success' });
  expect(response.statusCode).toBe(200);
  expect(response.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(response.body)).toEqual({ message: 'success' });
});
```

## Debugging

### View Lambda Logs

```bash
aws logs tail /aws/lambda/oidc-provider-dev-auth --follow
aws logs tail /aws/lambda/oidc-provider-dev-token --follow
```

### View API Gateway Logs

```bash
# Get the log group name
aws logs describe-log-groups --log-group-name-prefix API-Gateway-Execution-Logs

# Tail the logs
aws logs tail API-Gateway-Execution-Logs_<api-id>/<stage> --follow
```

### Check DynamoDB Tables

```bash
# List users
aws dynamodb scan --table-name oidc-provider-dev-users

# List clients
aws dynamodb scan --table-name oidc-provider-dev-clients

# List active auth codes
aws dynamodb scan --table-name oidc-provider-dev-auth-codes
```

## Common Issues

### Issue: "Invalid client_id or redirect_uri"

**Solution**: Ensure the client exists in DynamoDB and the redirect_uri matches exactly.

```bash
aws dynamodb get-item \
  --table-name oidc-provider-dev-clients \
  --key '{"client_id": {"S": "test-client"}}'
```

### Issue: "Invalid username or password"

**Solution**: Check the password hash. Passwords are now hashed using bcrypt. The demo user has password "password".

To verify or create a new hash:
```javascript
// Using bcrypt (Node.js)
const bcrypt = require('bcrypt');
bcrypt.hash('password', 10).then(hash => console.log(hash));
```

Or use the user-management Lambda function to create/reset user passwords (see section below).

### Testing User Management Lambda

The `user-management` Lambda function can be tested from the AWS Console or AWS CLI.

**Test from AWS Console:**
1. Go to AWS Lambda Console
2. Find function: `oidc-provider-<environment>-user-management`
3. Go to "Test" tab
4. Create a test event with one of the payloads below

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
  "username": "testuser",
  "password": "SecurePassword123!",
  "email": "testuser@example.com"
}
```

**Reset a user's password:**
```json
{
  "operation": "resetPassword",
  "username": "testuser",
  "newPassword": "NewSecurePassword123!"
}
```

**Test from AWS CLI:**
```bash
# Create a new user
aws lambda invoke \
  --function-name oidc-provider-dev-user-management \
  --payload '{"operation":"createUser","username":"testuser","password":"SecurePassword123!","email":"testuser@example.com"}' \
  response.json

# Reset password
aws lambda invoke \
  --function-name oidc-provider-dev-user-management \
  --payload '{"operation":"resetPassword","username":"testuser","newPassword":"NewSecurePassword123!"}' \
  response.json

# View the response
cat response.json
```

### Issue: "Token verification failed"

**Solution**: Ensure the JWT keys are properly generated in SSM Parameter Store. The Lambda function will generate them on first run.

### Issue: CORS errors

**Solution**: The API Gateway is configured with CORS support. Ensure your client includes proper headers.

## Performance Testing

Use Artillery to test the OIDC provider:

```yaml
# load-test.yml
config:
  target: "https://your-api-gateway-url.amazonaws.com/dev"
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Get OIDC Configuration"
    flow:
      - get:
          url: "/.well-known/openid-configuration"
```

Run:
```bash
artillery run load-test.yml
```
