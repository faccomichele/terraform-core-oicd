locals {
  environment       = split("_", terraform.workspace)[0]
  aws_region        = split("_", terraform.workspace)[1]
  project_name      = "oidc-provider"
  lambda_source_dir = "${path.module}/lambda/src"
}

locals {
  issuer_url = var.issuer_url != "" ? var.issuer_url : "${aws_api_gateway_deployment.oidc.invoke_url}${aws_api_gateway_stage.oidc.stage_name}"
}
