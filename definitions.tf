locals {
  environment   = split("_", terraform.workspace)[0]
  aws_region    = split("_", terraform.workspace)[1]
  project_name  = "oidc-provider-${local.environment}-${local.aws_region}"
}
