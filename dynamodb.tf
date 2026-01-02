# DynamoDB table for users
resource "aws_dynamodb_table" "users" {
  name         = "${local.project_name}-${local.environment}-users"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "username"
    type = "S"
  }

  global_secondary_index {
    name            = "username-index"
    hash_key        = "username"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-users"
  }
}

# DynamoDB table for OAuth clients
resource "aws_dynamodb_table" "clients" {
  name         = "${local.project_name}-${local.environment}-clients"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "client_id"

  attribute {
    name = "client_id"
    type = "S"
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-clients"
  }
}

# DynamoDB table for authorization codes
resource "aws_dynamodb_table" "auth_codes" {
  name         = "${local.project_name}-${local.environment}-auth-codes"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "code"

  attribute {
    name = "code"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-auth-codes"
  }
}

# DynamoDB table for refresh tokens
resource "aws_dynamodb_table" "refresh_tokens" {
  name         = "${local.project_name}-${local.environment}-refresh-tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "token_id"

  attribute {
    name = "token_id"
    type = "S"
  }

  attribute {
    name = "user_id"
    type = "S"
  }

  global_secondary_index {
    name            = "user-index"
    hash_key        = "user_id"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-refresh-tokens"
  }
}
