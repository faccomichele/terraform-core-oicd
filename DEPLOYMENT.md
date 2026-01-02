# Quick Deployment Guide

This guide will help you quickly deploy the serverless OIDC provider to AWS.

## Prerequisites Checklist

- [ ] AWS Account with admin access
- [ ] AWS CLI installed and configured (`aws configure`)
- [ ] Terraform >= 1.0 installed
- [ ] Node.js >= 18.x installed
- [ ] Bash shell (Linux/macOS or WSL on Windows)

## Step-by-Step Deployment

### 1. Verify Prerequisites

```bash
# Check AWS CLI
aws --version
aws sts get-caller-identity

# Check Terraform
terraform version

# Check Node.js
node --version
```

### 2. Clone and Setup

```bash
# Clone the repository
git clone https://github.com/faccomichele/terraform-core-oicd.git
cd terraform-core-oicd

# Install Lambda dependencies
./scripts/setup.sh
```

### 3. Configure Variables (Optional)

```bash
# Copy example configuration
cp terraform.tfvars.example terraform.tfvars

# Edit configuration
nano terraform.tfvars  # or vim, code, etc.
```

Default values work fine for testing:
```hcl
aws_region   = "us-east-1"
environment  = "dev"
project_name = "oidc-provider"
```

### 4. Initialize Terraform

```bash
terraform init
```

Expected output:
```
Initializing the backend...
Initializing provider plugins...
Terraform has been successfully initialized!
```

### 5. Plan Deployment

```bash
terraform plan
```

Review the plan. You should see resources to be created:
- API Gateway REST API
- 5 Lambda functions
- 4 DynamoDB tables
- 1 S3 bucket
- 2 SSM parameters (encrypted)
- IAM roles and policies

### 6. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. Deployment takes 2-5 minutes.

### 7. Save Outputs

```bash
terraform output > outputs.txt
cat outputs.txt
```

You should see:
- `api_gateway_url` - Your API Gateway URL
- `oidc_issuer_url` - Your OIDC issuer URL
- `wellknown_configuration_url` - OIDC discovery endpoint
- Table names, bucket name, etc.

### 8. Seed Demo Data

```bash
# Add demo user and client
./scripts/seed-data.sh us-east-1 dev
```

This creates:
- **User**: username=`demo`, password=`password`
- **Client**: client_id=`test-client`, client_secret=`test-secret`

### 9. Test the Deployment

```bash
# Get the issuer URL
ISSUER_URL=$(terraform output -raw oidc_issuer_url)

# Test OIDC discovery
curl $ISSUER_URL/.well-known/openid-configuration | jq .

# Test JWKS endpoint
curl $ISSUER_URL/jwks | jq .
```

### 10. Test Authorization Flow

Open in browser:
```bash
echo "$ISSUER_URL/auth?client_id=test-client&redirect_uri=https://oauth.pstmn.io/v1/callback&response_type=code&scope=openid+profile+email&state=xyz"
```

Login with:
- Username: `demo`
- Password: `password`

You'll be redirected with an authorization code.

### 11. Try Example Client (Optional)

```bash
# Node.js example
cd examples/node-client
export OIDC_ISSUER=$(cd ../.. && terraform output -raw oidc_issuer_url)
export CLIENT_ID="test-client"
export CLIENT_SECRET="test-secret"
npm install
npm start
# Open http://localhost:3000
```

## Verification Checklist

After deployment, verify:

- [ ] API Gateway created and accessible
- [ ] All Lambda functions deployed
- [ ] DynamoDB tables created with proper TTL
- [ ] SSM parameters created (encrypted)
- [ ] S3 bucket created
- [ ] Can access `/.well-known/openid-configuration`
- [ ] Can access `/jwks` endpoint
- [ ] Can login through `/auth` endpoint
- [ ] Can exchange code for tokens at `/token`
- [ ] Can get user info from `/userinfo`

## Troubleshooting

### Issue: "Error: error configuring Terraform AWS Provider"

**Solution**: Check AWS credentials
```bash
aws sts get-caller-identity
aws configure
```

### Issue: "Error creating S3 bucket"

**Solution**: Bucket names must be globally unique. The template uses a random suffix, but you can try changing the region or project name.

### Issue: Lambda functions fail with "Module not found"

**Solution**: Run the setup script to install dependencies
```bash
./scripts/setup.sh
```

### Issue: Can't access API Gateway endpoints

**Solution**: 
1. Check that deployment completed successfully
2. Verify the URL from terraform output
3. Check Lambda function logs:
```bash
aws logs tail /aws/lambda/oidc-provider-dev-wellknown --follow
```

### Issue: "Invalid client_id or redirect_uri"

**Solution**: Make sure you ran the seed-data script:
```bash
./scripts/seed-data.sh us-east-1 dev
```

Check the client exists:
```bash
aws dynamodb get-item \
  --table-name oidc-provider-dev-clients \
  --key '{"client_id": {"S": "test-client"}}'
```

### Issue: JWT signing fails

**Solution**: The Lambda will generate keys on first run. Try accessing the JWKS endpoint:
```bash
curl $(terraform output -raw oidc_issuer_url)/jwks
```

## Cleanup

When you're done testing:

```bash
terraform destroy
```

Type `yes` when prompted.

## Cost Estimate

For testing/development with low traffic (< 1000 requests/day):

| Service | Estimated Cost |
|---------|---------------|
| API Gateway | $0.05 |
| Lambda | $0.10 |
| DynamoDB | $0.50 |
| SSM Parameter Store | $0.00 (free tier) |
| S3 | $0.01 |
| **Total** | **~$0.66/month** |

For production, costs scale with usage. All services use pay-per-use pricing.

## Next Steps

After successful deployment:

1. **Add more users**: Use AWS CLI or console to add users to DynamoDB
2. **Add OAuth clients**: Register your applications in the clients table
3. **Integrate with your app**: Use the example clients as reference
4. **Set up monitoring**: Configure CloudWatch alarms
5. **Configure custom domain**: Use API Gateway custom domain feature
6. **Review security**: Follow AWS security best practices
7. **Enable logging**: Ensure CloudWatch logs are enabled
8. **Backup strategy**: Configure DynamoDB point-in-time recovery

## Support

- **Documentation**: See README.md, ARCHITECTURE.md, TESTING.md
- **Examples**: Check the examples/ directory
- **Issues**: Open an issue on GitHub
- **Contributing**: See CONTRIBUTING.md

## Production Deployment

For production deployment:

1. Change `environment` variable to "prod"
2. Use a custom domain name
3. Enable WAF for API Gateway
4. Set up CloudWatch alarms
5. Configure backup and disaster recovery
6. Review and harden security settings
7. Implement rate limiting
8. Set up CI/CD pipeline
9. Use separate AWS accounts for dev/staging/prod
10. Review and implement security best practices

See README.md for more production considerations.
