# API Gateway REST API
resource "aws_api_gateway_rest_api" "oidc" {
  name        = "${local.project_name}-${local.environment}-api"
  description = "OIDC Provider API"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

  tags = {
    Name = "${local.project_name}-${local.environment}-api"
  }
}

# API Gateway Resources
# /.well-known resource
resource "aws_api_gateway_resource" "wellknown_parent" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_rest_api.oidc.root_resource_id
  path_part   = ".well-known"
}

resource "aws_api_gateway_resource" "wellknown" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_resource.wellknown_parent.id
  path_part   = "openid-configuration"
}

# /jwks resource
resource "aws_api_gateway_resource" "jwks" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_rest_api.oidc.root_resource_id
  path_part   = "jwks"
}

# /auth resource
resource "aws_api_gateway_resource" "auth" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_rest_api.oidc.root_resource_id
  path_part   = "auth"
}

# /token resource
resource "aws_api_gateway_resource" "token" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_rest_api.oidc.root_resource_id
  path_part   = "token"
}

# /userinfo resource
resource "aws_api_gateway_resource" "userinfo" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  parent_id   = aws_api_gateway_rest_api.oidc.root_resource_id
  path_part   = "userinfo"
}

# Methods and Integrations
# Wellknown endpoint
resource "aws_api_gateway_method" "wellknown_get" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.wellknown.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "wellknown" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.wellknown.id
  http_method             = aws_api_gateway_method.wellknown_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.wellknown.invoke_arn
}

# JWKS endpoint
resource "aws_api_gateway_method" "jwks_get" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.jwks.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "jwks" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.jwks.id
  http_method             = aws_api_gateway_method.jwks_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.jwks.invoke_arn
}

# Auth endpoint (GET and POST)
resource "aws_api_gateway_method" "auth_get" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.auth.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_get" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.auth.id
  http_method             = aws_api_gateway_method.auth_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

resource "aws_api_gateway_method" "auth_post" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.auth.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "auth_post" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.auth.id
  http_method             = aws_api_gateway_method.auth_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.auth.invoke_arn
}

# Token endpoint
resource "aws_api_gateway_method" "token_post" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.token.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "token" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.token.id
  http_method             = aws_api_gateway_method.token_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.token.invoke_arn
}

# Userinfo endpoint
resource "aws_api_gateway_method" "userinfo_get" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.userinfo.id
  http_method   = "GET"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "userinfo_get" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.userinfo.id
  http_method             = aws_api_gateway_method.userinfo_get.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.userinfo.invoke_arn
}

resource "aws_api_gateway_method" "userinfo_post" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.userinfo.id
  http_method   = "POST"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "userinfo_post" {
  rest_api_id             = aws_api_gateway_rest_api.oidc.id
  resource_id             = aws_api_gateway_resource.userinfo.id
  http_method             = aws_api_gateway_method.userinfo_post.http_method
  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.userinfo.invoke_arn
}

# CORS support for all endpoints
resource "aws_api_gateway_method" "wellknown_options" {
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  resource_id   = aws_api_gateway_resource.wellknown.id
  http_method   = "OPTIONS"
  authorization = "NONE"
}

resource "aws_api_gateway_integration" "wellknown_options" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  resource_id = aws_api_gateway_resource.wellknown.id
  http_method = aws_api_gateway_method.wellknown_options.http_method
  type        = "MOCK"

  request_templates = {
    "application/json" = "{\"statusCode\": 200}"
  }
}

resource "aws_api_gateway_method_response" "wellknown_options" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  resource_id = aws_api_gateway_resource.wellknown.id
  http_method = aws_api_gateway_method.wellknown_options.http_method
  status_code = "200"

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = true
    "method.response.header.Access-Control-Allow-Methods" = true
    "method.response.header.Access-Control-Allow-Origin"  = true
  }
}

resource "aws_api_gateway_integration_response" "wellknown_options" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  resource_id = aws_api_gateway_resource.wellknown.id
  http_method = aws_api_gateway_method.wellknown_options.http_method
  status_code = aws_api_gateway_method_response.wellknown_options.status_code

  response_parameters = {
    "method.response.header.Access-Control-Allow-Headers" = "'Content-Type,Authorization'"
    "method.response.header.Access-Control-Allow-Methods" = "'GET,OPTIONS'"
    "method.response.header.Access-Control-Allow-Origin"  = "'*'"
  }
}

# API Gateway Deployment
resource "aws_api_gateway_deployment" "oidc" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id

  triggers = {
    redeployment = sha1(jsonencode([
      aws_api_gateway_resource.wellknown.id,
      aws_api_gateway_method.wellknown_get.id,
      aws_api_gateway_integration.wellknown.id,
      aws_api_gateway_resource.jwks.id,
      aws_api_gateway_method.jwks_get.id,
      aws_api_gateway_integration.jwks.id,
      aws_api_gateway_resource.auth.id,
      aws_api_gateway_method.auth_get.id,
      aws_api_gateway_method.auth_post.id,
      aws_api_gateway_integration.auth_get.id,
      aws_api_gateway_integration.auth_post.id,
      aws_api_gateway_resource.token.id,
      aws_api_gateway_method.token_post.id,
      aws_api_gateway_integration.token.id,
      aws_api_gateway_resource.userinfo.id,
      aws_api_gateway_method.userinfo_get.id,
      aws_api_gateway_method.userinfo_post.id,
      aws_api_gateway_integration.userinfo_get.id,
      aws_api_gateway_integration.userinfo_post.id,
    ]))
  }

  lifecycle {
    create_before_destroy = true
  }
}

# API Gateway Stage
resource "aws_api_gateway_stage" "oidc" {
  deployment_id = aws_api_gateway_deployment.oidc.id
  rest_api_id   = aws_api_gateway_rest_api.oidc.id
  stage_name    = local.environment

  tags = {
    Name = "${local.project_name}-${local.environment}"
  }
}

# Enable CloudWatch logging for API Gateway
resource "aws_api_gateway_method_settings" "oidc" {
  rest_api_id = aws_api_gateway_rest_api.oidc.id
  stage_name  = aws_api_gateway_stage.oidc.stage_name
  method_path = "*/*"

  settings {
    logging_level      = "INFO"
    data_trace_enabled = true
    metrics_enabled    = true
  }
}
