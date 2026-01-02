output "api_gateway_url" {
  description = "Base URL of the API Gateway"
  value       = aws_api_gateway_deployment.oidc.invoke_url
}

output "oidc_issuer_url" {
  description = "OIDC Issuer URL (computed from var.issuer_url or API Gateway URL). Note: Lambda functions retrieve this from SSM Parameter Store at runtime."
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


output "jwt_signing_key_parameter_name" {
  description = "SSM Parameter name containing JWT signing keys (encrypted)"
  value       = aws_ssm_parameter.jwt_keys.name
}

output "issuer_url_ssm_parameter" {
  description = "SSM Parameter name storing the OIDC Issuer URL"
  value       = aws_ssm_parameter.issuer_url.name
}

output "user_management_lambda_arn" {
  description = "ARN of the user management Lambda function"
  value       = aws_lambda_function.user_management.arn
}

output "user_management_lambda_name" {
  description = "Name of the user management Lambda function"
  value       = aws_lambda_function.user_management.function_name
}
