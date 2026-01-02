# SSM Parameter to store the OIDC issuer URL
# This breaks the circular dependency between Lambda and API Gateway
# The parameter is initially set with the user-provided issuer_url or a placeholder
# After deployment, it will be updated with the actual API Gateway URL if needed
resource "aws_ssm_parameter" "issuer_url" {
  name        = "/${local.project_name}/${local.environment}/issuer-url"
  description = "OIDC Issuer URL for the provider"
  type        = "String"
  value       = var.issuer_url != "" ? var.issuer_url : local.placeholder_issuer_url

  tags = {
    Name = "${local.project_name}-${local.environment}-issuer-url"
  }

  lifecycle {
    ignore_changes = [value]
  }
}

# Null resource to update the SSM parameter with the actual API Gateway URL
# This runs after the deployment is created
resource "null_resource" "update_issuer_url" {
  count = var.issuer_url == "" ? 1 : 0

  triggers = {
    deployment_id = aws_api_gateway_deployment.oidc.id
    stage_name    = aws_api_gateway_stage.oidc.stage_name
  }

  provisioner "local-exec" {
    command = <<-EOT
      set -e
      aws ssm put-parameter \
        --name "${aws_ssm_parameter.issuer_url.name}" \
        --value "${aws_api_gateway_deployment.oidc.invoke_url}/${local.environment}" \
        --type String \
        --overwrite \
        --region ${local.aws_region} || exit 1
      echo "Successfully updated SSM parameter with issuer URL"
    EOT
  }

  depends_on = [
    aws_api_gateway_deployment.oidc,
    aws_api_gateway_stage.oidc,
    aws_ssm_parameter.issuer_url
  ]
}
