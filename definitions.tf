locals {
  environment   = split(terraform.workspace, "_")[0]
  aws_region    = split(terraform.workspace, "_")[1]
  project_name  = "oidc-provider-${local.environment}-${local.aws_region}"
}
