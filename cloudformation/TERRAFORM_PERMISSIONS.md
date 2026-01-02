# Terraform IAM Permissions Documentation

This document describes the IAM permissions added to the CloudFormation `github-iam-role.yaml` template to enable GitHub Actions to run Terraform successfully for this repository.

## Overview

The inline policy `TerraformDeploymentPolicy` has been added to the GitHub Actions IAM role with the minimum required permissions to deploy and manage the OIDC provider infrastructure using Terraform, following the principle of least privilege.

## Permissions Breakdown

### 1. Lambda Management (`LambdaManagement`)

**Purpose**: Create, update, and delete Lambda functions for the OIDC endpoints.

**Actions**:
- `lambda:CreateFunction` - Create new Lambda functions
- `lambda:DeleteFunction` - Delete Lambda functions during cleanup
- `lambda:GetFunction` - Read function configuration (for Terraform state)
- `lambda:GetFunctionConfiguration` - Read function settings
- `lambda:UpdateFunctionCode` - Update Lambda function code
- `lambda:UpdateFunctionConfiguration` - Update Lambda settings
- `lambda:ListVersionsByFunction` - List function versions
- `lambda:PublishVersion` - Publish new function versions
- `lambda:TagResource` - Add tags to Lambda functions
- `lambda:UntagResource` - Remove tags from Lambda functions
- `lambda:ListTags` - List function tags
- `lambda:AddPermission` - Add resource-based permissions (for API Gateway)
- `lambda:RemovePermission` - Remove resource-based permissions
- `lambda:GetPolicy` - Read resource-based policy

**Resources**: 
- `arn:aws:lambda:${AWS::Region}:${AWS::AccountId}:function:oidc-provider-${Environment}-*`

**Terraform Resources**:
- `aws_lambda_function.wellknown`
- `aws_lambda_function.jwks`
- `aws_lambda_function.auth`
- `aws_lambda_function.token`
- `aws_lambda_function.userinfo`
- `aws_lambda_permission.*` (5 resources)

---

### 2. API Gateway Management (`APIGatewayManagement`)

**Purpose**: Create and manage REST API, resources, methods, integrations, deployments, and stages.

**Actions**:
- `apigateway:GET` - Read API Gateway resources
- `apigateway:POST` - Create new API Gateway resources
- `apigateway:PUT` - Update API Gateway resources
- `apigateway:PATCH` - Update API Gateway resources
- `apigateway:DELETE` - Delete API Gateway resources

**Resources**:
- `arn:aws:apigateway:${AWS::Region}::/restapis`
- `arn:aws:apigateway:${AWS::Region}::/restapis/*`
- `arn:aws:apigateway:${AWS::Region}::/tags/*`

**Terraform Resources** (27 resources):
- `aws_api_gateway_rest_api.oidc`
- `aws_api_gateway_resource.*` (6 resources)
- `aws_api_gateway_method.*` (8 resources)
- `aws_api_gateway_integration.*` (9 resources)
- `aws_api_gateway_method_response.wellknown_options`
- `aws_api_gateway_integration_response.wellknown_options`
- `aws_api_gateway_deployment.oidc`
- `aws_api_gateway_stage.oidc`
- `aws_api_gateway_method_settings.oidc`

---

### 3. DynamoDB Management (`DynamoDBManagement`)

**Purpose**: Create and manage DynamoDB tables for users, clients, auth codes, and refresh tokens.

**Actions**:
- `dynamodb:CreateTable` - Create new tables
- `dynamodb:DeleteTable` - Delete tables during cleanup
- `dynamodb:DescribeTable` - Read table configuration
- `dynamodb:DescribeContinuousBackups` - Check backup settings
- `dynamodb:DescribeTimeToLive` - Check TTL settings
- `dynamodb:ListTagsOfResource` - List table tags
- `dynamodb:TagResource` - Add tags to tables
- `dynamodb:UntagResource` - Remove tags from tables
- `dynamodb:UpdateTable` - Update table configuration (e.g., add GSI)
- `dynamodb:UpdateContinuousBackups` - Update backup settings
- `dynamodb:UpdateTimeToLive` - Enable/disable TTL

**Resources**:
- `arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/oidc-provider-${Environment}-*`

**Terraform Resources**:
- `aws_dynamodb_table.users` (with username-index GSI)
- `aws_dynamodb_table.clients`
- `aws_dynamodb_table.auth_codes` (with TTL)
- `aws_dynamodb_table.refresh_tokens` (with user-index GSI and TTL)

---

### 4. S3 Bucket Management (`S3BucketManagement`)

**Purpose**: Create and manage S3 bucket for static assets.

**Actions**:
- `s3:CreateBucket` - Create bucket
- `s3:DeleteBucket` - Delete bucket during cleanup
- `s3:GetBucketLocation` - Read bucket region
- `s3:GetBucketPolicy` - Read bucket policy
- `s3:GetBucketVersioning` - Check versioning status
- `s3:GetBucketPublicAccessBlock` - Check public access settings
- `s3:GetEncryptionConfiguration` - Check encryption settings
- `s3:GetBucketAcl` - Read bucket ACL
- `s3:GetBucketCORS` - Check CORS configuration
- `s3:GetBucketLogging` - Check logging settings
- `s3:GetBucketRequestPayment` - Check request payment settings
- `s3:GetBucketTagging` - Read bucket tags
- `s3:GetBucketWebsite` - Check website configuration
- `s3:GetLifecycleConfiguration` - Check lifecycle rules
- `s3:GetReplicationConfiguration` - Check replication settings
- `s3:GetAccelerateConfiguration` - Check transfer acceleration
- `s3:GetBucketObjectLockConfiguration` - Check object lock settings
- `s3:PutBucketPolicy` - Create/update bucket policy
- `s3:PutBucketVersioning` - Enable versioning
- `s3:PutBucketPublicAccessBlock` - Configure public access block
- `s3:PutEncryptionConfiguration` - Enable encryption
- `s3:PutBucketAcl` - Update bucket ACL
- `s3:PutBucketTagging` - Add bucket tags
- `s3:DeleteBucketPolicy` - Remove bucket policy
- `s3:ListBucket` - List bucket contents

**Resources**:
- `arn:aws:s3:::oidc-provider-${Environment}-assets-*`

**Terraform Resources**:
- `aws_s3_bucket.oidc_assets`
- `aws_s3_bucket_public_access_block.oidc_assets`
- `aws_s3_bucket_versioning.oidc_assets`
- `aws_s3_bucket_server_side_encryption_configuration.oidc_assets`
- `aws_s3_bucket_policy.oidc_assets`

---

### 5. SSM Parameter Store Management (`SSMParameterManagement`)

**Purpose**: Create and manage SSM Parameter Store parameters for JWT signing keys and issuer URL.

**Actions**:
- `ssm:PutParameter` - Create or update parameter
- `ssm:GetParameter` - Read parameter value
- `ssm:GetParameters` - Read multiple parameters
- `ssm:DeleteParameter` - Delete parameter during cleanup
- `ssm:DescribeParameters` - Read parameter metadata
- `ssm:AddTagsToResource` - Add tags to parameter
- `ssm:RemoveTagsFromResource` - Remove tags from parameter
- `ssm:ListTagsForResource` - List parameter tags

**Resources**:
- `arn:aws:ssm:${AWS::Region}:${AWS::AccountId}:parameter/oidc-provider-${Environment}-*`

**Terraform Resources**:
- `aws_ssm_parameter.jwt_keys` (SecureString for encrypted JWT keys)
- `aws_ssm_parameter.issuer_url` (String for OIDC issuer URL)

---

### 6. IAM Role Management (`IAMRoleManagement`)

**Purpose**: Create and manage IAM role for Lambda execution.

**Actions**:
- `iam:CreateRole` - Create Lambda execution role
- `iam:DeleteRole` - Delete role during cleanup
- `iam:GetRole` - Read role configuration
- `iam:GetRolePolicy` - Read inline policies
- `iam:PutRolePolicy` - Create/update inline policies
- `iam:DeleteRolePolicy` - Remove inline policies
- `iam:ListRolePolicies` - List inline policies
- `iam:ListAttachedRolePolicies` - List attached managed policies
- `iam:AttachRolePolicy` - Attach managed policies
- `iam:DetachRolePolicy` - Detach managed policies
- `iam:TagRole` - Add tags to role
- `iam:UntagRole` - Remove tags from role
- `iam:ListRoleTags` - List role tags
- `iam:ListInstanceProfilesForRole` - List instance profiles
- `iam:PassRole` - Allow Lambda service to assume the role

**Resources**:
- `arn:aws:iam::${AWS::AccountId}:role/oidc-provider-${Environment}-lambda-exec`

**Terraform Resources**:
- `aws_iam_role.lambda_exec`
- `aws_iam_role_policy.lambda_oidc`
- `aws_iam_role_policy_attachment.lambda_basic`

---

### 7. IAM Policy Read Access (`IAMPolicyReadAccess`)

**Purpose**: Read AWS managed policy details for attaching to Lambda role.

**Actions**:
- `iam:GetPolicy` - Read policy metadata
- `iam:GetPolicyVersion` - Read policy document
- `iam:ListPolicyVersions` - List policy versions

**Resources**:
- `arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole`

**Terraform Resources**:
- Used by `aws_iam_role_policy_attachment.lambda_basic`

---

### 8. CloudWatch Logs Management (`CloudWatchLogsManagement`)

**Purpose**: Create and manage log groups for Lambda functions.

**Actions**:
- `logs:CreateLogGroup` - Create log groups
- `logs:DeleteLogGroup` - Delete log groups during cleanup
- `logs:DescribeLogGroups` - Read log group configuration
- `logs:ListTagsLogGroup` - List log group tags
- `logs:TagLogGroup` - Add tags to log groups
- `logs:UntagLogGroup` - Remove tags from log groups
- `logs:PutRetentionPolicy` - Set log retention period
- `logs:DeleteRetentionPolicy` - Remove retention policy

**Resources**:
- `arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/oidc-provider-${Environment}-*`
- `arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:/aws/lambda/oidc-provider-${Environment}-*:*`

**Note**: Lambda automatically creates log groups, but Terraform needs permissions to manage them. The second ARN with `:*` suffix covers log streams within the log groups.

---

### 9. CloudWatch Logs for API Gateway (`CloudWatchLogsAPIGateway`)

**Purpose**: Enable CloudWatch logging for API Gateway.

**Actions**:
- `logs:CreateLogGroup` - Create log groups
- `logs:DescribeLogGroups` - Read log group configuration

**Resources**:
- `arn:aws:logs:${AWS::Region}:${AWS::AccountId}:log-group:*`

**Terraform Resources**:
- Used by `aws_api_gateway_method_settings.oidc` for logging configuration

---

### 10. Resource Discovery (`ResourceDiscovery`)

**Purpose**: Allow Terraform to list and discover existing resources (read-only).

**Actions**:
- `apigateway:GET` - List API Gateway resources
- `lambda:ListFunctions` - List Lambda functions
- `dynamodb:ListTables` - List DynamoDB tables
- `s3:ListAllMyBuckets` - List S3 buckets
- `ssm:DescribeParameters` - List SSM parameters
- `iam:ListRoles` - List IAM roles

**Resources**: `*` (required for list operations)

**Note**: These permissions are necessary for Terraform to:
1. Refresh state by querying existing resources
2. Detect resource drift
3. Plan changes accurately

---

## Security Considerations

### Least Privilege Approach

1. **Resource Scoping**: All permissions (except list operations) are scoped to specific resource patterns using the `${Environment}` parameter (e.g., `oidc-provider-dev-*`).

2. **Action Specificity**: Only the minimum required actions for Terraform operations (create, read, update, delete) are granted.

3. **No Wildcard Resources**: Except for list/describe operations that require it, all permissions use specific ARN patterns.

4. **Environment Isolation**: Resources are scoped by environment (dev/stg/prod), preventing cross-environment modifications.

### Notable Exclusions

The following permissions are **NOT** included as they are not required for this deployment:

- **Lambda**: No permissions for layers, aliases, or provisioned concurrency
- **DynamoDB**: No data plane permissions (GetItem, PutItem, etc.) - these are for Lambda runtime only
- **S3**: No object-level permissions (GetObject, PutObject) - these are for Lambda runtime only
- **IAM**: No permissions to create/modify policies or other roles
- **VPC**: No VPC-related permissions (Lambda functions are not VPC-attached)
- **CloudFront**: No CDN permissions (not used in this deployment)
- **Route53**: No DNS permissions (custom domains not configured)
- **KMS**: No KMS permissions (using AWS managed keys)

## Testing the Permissions

To verify the permissions work correctly:

```bash
# 1. Deploy the CloudFormation stack with the updated template
aws cloudformation create-stack \
  --stack-name terraform-core-oidc-github-role \
  --template-body file://cloudformation/github-iam-role.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameters \
    ParameterKey=Organization,ParameterValue=faccomichele \
    ParameterKey=RepositoryName,ParameterValue=terraform-core-oidc \
    ParameterKey=Environment,ParameterValue=dev

# 2. Configure GitHub Actions to use the role (via OIDC)

# 3. Run Terraform in GitHub Actions:
# - terraform init
# - terraform plan
# - terraform apply

# 4. Verify all resources are created successfully
```

## Maintenance

When adding new Terraform resources to this repository, review and update the inline policy to include necessary permissions for those resources.

### Common Additions

If you add:
- **Custom domain**: Add `acm:*`, `route53:*` permissions
- **VPC resources**: Add `ec2:*VPC*`, `ec2:*Subnet*`, `ec2:*SecurityGroup*` permissions
- **CloudFront**: Add `cloudfront:*` permissions
- **KMS keys**: Add `kms:*` permissions
- **Additional Lambda functions**: Already covered by existing wildcard pattern

## References

- [AWS IAM Actions for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/lambda-api-permissions-ref.html)
- [AWS IAM Actions for API Gateway](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html)
- [AWS IAM Actions for DynamoDB](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/api-permissions-reference.html)
- [AWS IAM Actions for S3](https://docs.aws.amazon.com/AmazonS3/latest/userguide/list_amazons3.html)
- [AWS IAM Actions for SSM Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/auth-and-access-control-iam-identity-based-access-control.html)
- [Terraform AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
