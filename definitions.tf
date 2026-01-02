locals {
  environment       = split("_", terraform.workspace)[0]
  aws_region        = split("_", terraform.workspace)[1]
  project_name      = "oidc-provider"
  lambda_source_dir = "${path.module}/lambda/src"
  placeholder_issuer_url = "https://placeholder.example.com"
}

locals {
  issuer_url = var.issuer_url != "" ? var.issuer_url : "${aws_api_gateway_deployment.oidc.invoke_url}/${local.environment}"
}
