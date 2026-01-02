# Archive Lambda source code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = local.lambda_source_dir
  output_path = "${path.module}/lambda/function.zip"
  excludes    = ["node_modules", "package-lock.json"]
}
