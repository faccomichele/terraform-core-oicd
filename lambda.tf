resource "aws_lambda_function" "wellknown" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-wellknown"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "wellknown.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-wellknown"
  }
}

# Lambda function for JWKS endpoint
resource "aws_lambda_function" "jwks" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-jwks"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "jwks.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-jwks"
  }
}

# Lambda function for auth endpoint
resource "aws_lambda_function" "auth" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-auth"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "auth.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-auth"
  }
}

# Lambda function for token endpoint
resource "aws_lambda_function" "token" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-token"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "token.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-token"
  }
}

# Lambda function for userinfo endpoint
resource "aws_lambda_function" "userinfo" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-userinfo"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "userinfo.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-userinfo"
  }
}

# Lambda permissions for API Gateway
resource "aws_lambda_permission" "wellknown" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.wellknown.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

resource "aws_lambda_permission" "jwks" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.jwks.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

resource "aws_lambda_permission" "auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

resource "aws_lambda_permission" "token" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.token.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

resource "aws_lambda_permission" "userinfo" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.userinfo.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

# Lambda function for user management (console invocation only)
resource "aws_lambda_function" "user_management" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-user-management"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "user-management.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME = local.issuer_url_parameter
      USERS_TABLE           = aws_dynamodb_table.users.name
      CLIENTS_TABLE         = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE      = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE  = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME   = aws_ssm_parameter.jwt_keys.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-user-management"
  }
}

