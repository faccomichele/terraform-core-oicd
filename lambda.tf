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
      SESSIONS_TABLE        = aws_dynamodb_table.sessions.name
      LOGIN_PAGE_URL        = "https://${aws_s3_bucket.assets.bucket_regional_domain_name}/login.html"
      LANDING_PAGE_URL      = "https://${aws_s3_bucket.assets.bucket_regional_domain_name}/landing.html"
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
resource "aws_lambda_function" "management_user" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-management-user"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "management-user.handler"
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
      APPLICATIONS_TABLE    = aws_dynamodb_table.applications.name
      USER_APPLICATIONS_TABLE = aws_dynamodb_table.user_applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-management-user"
  }
}

# Lambda function for landing page (application selection)
resource "aws_lambda_function" "landing" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-landing"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "landing.handler"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
  runtime          = "nodejs18.x"
  timeout          = 30
  memory_size      = 256

  environment {
    variables = {
      ISSUER_URL_PARAM_NAME    = local.issuer_url_parameter
      USERS_TABLE              = aws_dynamodb_table.users.name
      CLIENTS_TABLE            = aws_dynamodb_table.clients.name
      AUTH_CODES_TABLE         = aws_dynamodb_table.auth_codes.name
      REFRESH_TOKENS_TABLE     = aws_dynamodb_table.refresh_tokens.name
      JWT_KEYS_PARAM_NAME      = aws_ssm_parameter.jwt_keys.name
      SESSIONS_TABLE           = aws_dynamodb_table.sessions.name
      APPLICATIONS_TABLE       = aws_dynamodb_table.applications.name
      USER_APPLICATIONS_TABLE  = aws_dynamodb_table.user_applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-landing"
  }
}

resource "aws_lambda_permission" "landing" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.landing.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

# Lambda function for completing authentication after application selection
resource "aws_lambda_function" "complete_auth" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-complete-auth"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "complete-auth.handler"
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
      SESSIONS_TABLE        = aws_dynamodb_table.sessions.name
      APPLICATIONS_TABLE    = aws_dynamodb_table.applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-complete-auth"
  }
}

resource "aws_lambda_permission" "complete_auth" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.complete_auth.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_api_gateway_rest_api.oidc.execution_arn}/*/*"
}

# Lambda function for client management (console invocation only)
resource "aws_lambda_function" "management_client" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-management-client"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "management-client.handler"
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
      APPLICATIONS_TABLE    = aws_dynamodb_table.applications.name
      USER_APPLICATIONS_TABLE = aws_dynamodb_table.user_applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-management-client"
  }
}

# Lambda function for application management (console invocation only)
resource "aws_lambda_function" "management_application" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-management-application"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "management-application.handler"
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
      APPLICATIONS_TABLE    = aws_dynamodb_table.applications.name
      USER_APPLICATIONS_TABLE = aws_dynamodb_table.user_applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-management-application"
  }
}

# Lambda function for user-application configuration management (console invocation only)
resource "aws_lambda_function" "management_user_application" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "${local.project_name}-${local.environment}-management-user-application"
  role             = aws_iam_role.lambda_exec.arn
  handler          = "management-user-application.handler"
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
      APPLICATIONS_TABLE    = aws_dynamodb_table.applications.name
      USER_APPLICATIONS_TABLE = aws_dynamodb_table.user_applications.name
    }
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-management-user-application"
  }
}


