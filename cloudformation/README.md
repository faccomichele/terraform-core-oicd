# CloudFormation GitHub IAM Role - Quick Reference

## Overview
The `github-iam-role.yaml` template creates an IAM role for GitHub Actions to deploy Terraform infrastructure for this OIDC provider project.

## What's Included
✅ **Inline Policy**: `TerraformDeploymentPolicy` with comprehensive permissions for all AWS services used by Terraform
✅ **Least Privilege**: All permissions scoped to environment-specific resource patterns
✅ **Full Coverage**: Supports all 55 Terraform resources in this repository

## Deployment

### Prerequisites
1. GitHub OIDC provider must be deployed first (using `github-identity-provider.yaml`)
2. AWS CLI configured with appropriate credentials

### Deploy the Stack
```bash
aws cloudformation create-stack \
  --stack-name terraform-core-oidc-github-role \
  --template-body file://cloudformation/github-iam-role.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=Organization,ParameterValue=faccomichele \
    ParameterKey=RepositoryName,ParameterValue=terraform-core-oidc \
    ParameterKey=Environment,ParameterValue=dev
```

### Update the Stack
```bash
aws cloudformation update-stack \
  --stack-name terraform-core-oidc-github-role \
  --template-body file://cloudformation/github-iam-role.yaml \
  --capabilities CAPABILITY_NAMED_IAM
```

### Delete the Stack
```bash
aws cloudformation delete-stack \
  --stack-name terraform-core-oidc-github-role
```

## Using in GitHub Actions

After deploying the CloudFormation stack, use the role in your GitHub Actions workflow:

```yaml
name: Deploy with Terraform

on:
  push:
    branches: [main]

permissions:
  id-token: write
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          role-to-assume: arn:aws:iam::YOUR_ACCOUNT_ID:role/ROLE_NAME
          aws-region: us-east-1
      
      - name: Setup Terraform
        uses: hashicorp/setup-terraform@v2
        with:
          terraform_version: 1.5.0
      
      - name: Terraform Init
        run: terraform init
      
      - name: Terraform Plan
        run: terraform plan
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
```

## Permissions Breakdown

The inline policy includes permissions for:

| Service | Actions | Resource Scope |
|---------|---------|----------------|
| **Lambda** | Create, update, delete functions and permissions | `oidc-provider-${Environment}-*` |
| **API Gateway** | Full REST API management | All REST APIs |
| **DynamoDB** | Create, update, delete tables | `oidc-provider-${Environment}-*` |
| **S3** | Create, configure buckets | `oidc-provider-${Environment}-assets-*` |
| **Secrets Manager** | Create, manage secrets | `oidc-provider-${Environment}-jwt-keys-*` |
| **IAM** | Create Lambda execution role | `oidc-provider-${Environment}-lambda-exec` |
| **CloudWatch Logs** | Create, manage log groups | Lambda and API Gateway logs |

## Security Features

- ✅ **Environment Isolation**: Resources scoped to specific environment (dev/stg/prod)
- ✅ **No Data Access**: No permissions for runtime data operations
- ✅ **Scoped IAM**: Can only create/modify the specific Lambda execution role
- ✅ **Read-Only Discovery**: List operations for Terraform state management

## Parameters

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| Organization | GitHub organization name | `faccomichele` | Yes |
| RepositoryName | GitHub repository name | `terraform-core-oidc` | Yes |
| Environment | Deployment environment | `dev` | Yes |
| OIDCProviderStackName | OIDC provider stack name | `github-identity-provider` | No |
| SSMParameterReadPolicyName | SSM read policy name | `terraform-core-aws-ssm-read-dev` | No |

## Outputs

The stack outputs the IAM role ARN that can be used in GitHub Actions workflows.

## Troubleshooting

### Issue: "User is not authorized to perform: iam:CreateRole"
**Solution**: Ensure you have `CAPABILITY_NAMED_IAM` in your CloudFormation deployment command.

### Issue: "Role creation failed"
**Solution**: Verify the GitHub OIDC provider exists and the stack name matches the `OIDCProviderStackName` parameter.

### Issue: Terraform apply fails with permission errors
**Solution**: Check the CloudWatch Logs for the specific permission denied error, and verify the resource names match the expected patterns (e.g., `oidc-provider-dev-*`).

## Documentation

For detailed permission documentation, see:
- [`TERRAFORM_PERMISSIONS.md`](./TERRAFORM_PERMISSIONS.md) - Comprehensive permission breakdown
- Main repository [`README.md`](../README.md) - Project overview and deployment guide

## Support

For issues or questions:
1. Check the [TERRAFORM_PERMISSIONS.md](./TERRAFORM_PERMISSIONS.md) documentation
2. Review CloudWatch Logs for error details
3. Open an issue on GitHub
