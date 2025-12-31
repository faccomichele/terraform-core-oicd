output "api_gateway_url" {
  description = "Base URL of the API Gateway"
  value       = aws_api_gateway_deployment.oidc.invoke_url
}

output "oidc_issuer_url" {
  description = "OIDC Issuer URL"
  value       = local.issuer_url
}

output "wellknown_configuration_url" {
  description = "OpenID Connect configuration endpoint"
  value       = "${local.issuer_url}/.well-known/openid-configuration"
}

output "dynamodb_users_table" {
  description = "DynamoDB table name for users"
  value       = aws_dynamodb_table.users.name
}

output "dynamodb_clients_table" {
  description = "DynamoDB table name for OAuth clients"
  value       = aws_dynamodb_table.clients.name
}

output "dynamodb_auth_codes_table" {
  description = "DynamoDB table name for authorization codes"
  value       = aws_dynamodb_table.auth_codes.name
}

output "s3_bucket_name" {
  description = "S3 bucket name for static assets"
  value       = aws_s3_bucket.oidc_assets.id
}

output "jwt_signing_key_secret_arn" {
  description = "ARN of the Secrets Manager secret containing JWT signing keys"
  value       = aws_secretsmanager_secret.jwt_keys.arn
}
